<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Order;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PaymentController extends Controller
{
    /**
     * Process a payment for an order
     */
    public function processPayment(Request $request)
    {
        try {
            $request->validate([
                'order_id' => 'required|exists:orders,id',
                'payment_method' => 'required|in:cash,transfer',
                'amount_paid' => 'required|numeric|min:0',
                'card_last_four' => 'nullable|string|size:4',
                'notes' => 'nullable|string',
            ]);

            DB::beginTransaction();

            $order = Order::findOrFail($request->order_id);
            
            // Calculate change for cash payments
            $changeAmount = 0;
            if ($request->payment_method === 'cash' && $request->amount_paid > $order->remaining_balance) {
                $changeAmount = $request->amount_paid - $order->remaining_balance;
            }

            // Create payment record
            $payment = Payment::create([
                'order_id' => $request->order_id,
                'payment_method' => $request->payment_method === 'transfer' ? 'bank_transfer' : 'cash',
                'amount_paid' => min($request->amount_paid, $order->remaining_balance + $changeAmount),
                'change_amount' => $changeAmount,
                'transaction_id' => Payment::generateTransactionId(),
                'card_last_four' => $request->card_last_four,
                'status' => 'completed',
                'notes' => $request->notes,
                'payment_date' => now(),
            ]);

            // Update order status if fully paid
            if ($order->fresh()->isFullyPaid()) {
                $order->update(['status' => 'completed']);
                Sale::syncFromOrder($order->fresh(['orderItems', 'cashier', 'payments']));
            }

            DB::commit();

            $payment->load('order');

            return response()->json([
                'success' => true,
                'data' => $payment,
                'message' => 'Payment processed successfully'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to process payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment history
     */
    public function index(Request $request)
    {
        try {
            $query = Payment::with(['order.cashier']);

            // Apply filters
            if ($request->has('payment_method')) {
                $query->where('payment_method', $request->payment_method);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('date_from')) {
                $query->whereDate('payment_date', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->whereDate('payment_date', '<=', $request->date_to);
            }

            if ($request->has('order_id')) {
                $query->where('order_id', $request->order_id);
            }

            // Pagination
            $perPage = $request->get('per_page', 15);
            $payments = $query->orderBy('payment_date', 'desc')
                ->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $payments,
                'message' => 'Payments retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve payments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment reports
     */
    public function getReports(Request $request)
    {
        try {
            $dateFrom = $request->get('date_from', Carbon::now()->subDays(30)->toDateString());
            $dateTo = $request->get('date_to', Carbon::now()->toDateString());

            // Payment method breakdown
            $paymentMethods = Payment::whereBetween('payment_date', [$dateFrom, $dateTo])
                ->where('status', 'completed')
                ->selectRaw('
                    payment_method,
                    COUNT(*) as transaction_count,
                    SUM(amount_paid) as total_amount,
                    AVG(amount_paid) as average_amount
                ')
                ->groupBy('payment_method')
                ->get();

            // Daily payment trends
            $dailyTrends = Payment::whereBetween('payment_date', [$dateFrom, $dateTo])
                ->where('status', 'completed')
                ->selectRaw('
                    DATE(payment_date) as date,
                    COUNT(*) as transaction_count,
                    SUM(amount_paid) as total_amount,
                    payment_method
                ')
                ->groupBy('date', 'payment_method')
                ->orderBy('date')
                ->get();

            // Overall metrics
            $overallMetrics = Payment::whereBetween('payment_date', [$dateFrom, $dateTo])
                ->where('status', 'completed')
                ->selectRaw('
                    COUNT(*) as total_transactions,
                    SUM(amount_paid) as total_revenue,
                    AVG(amount_paid) as average_transaction,
                    SUM(change_amount) as total_change_given
                ')
                ->first();

            // Top payment hours
            $hourlyDistribution = Payment::whereBetween('payment_date', [$dateFrom, $dateTo])
                ->where('status', 'completed')
                ->selectRaw('
                    HOUR(payment_date) as hour,
                    COUNT(*) as transaction_count,
                    SUM(amount_paid) as total_amount
                ')
                ->groupBy('hour')
                ->orderBy('hour')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'payment_methods' => $paymentMethods,
                    'daily_trends' => $dailyTrends,
                    'overall_metrics' => $overallMetrics,
                    'hourly_distribution' => $hourlyDistribution,
                    'date_range' => [
                        'from' => $dateFrom,
                        'to' => $dateTo
                    ]
                ],
                'message' => 'Payment reports generated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate payment reports',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Refund a payment
     */
    public function refund(Request $request, $id)
    {
        try {
            $request->validate([
                'reason' => 'nullable|string|max:255',
            ]);

            DB::beginTransaction();

            $payment = Payment::findOrFail($id);
            
            if ($payment->status !== 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only completed payments can be refunded'
                ], 400);
            }

            // Update payment status
            $payment->update([
                'status' => 'refunded',
                'notes' => ($payment->notes ? $payment->notes . ' | ' : '') . 'Refunded: ' . ($request->reason ?? 'No reason provided')
            ]);

            // Update order status if needed
            $order = $payment->order;
            if (!$order->isFullyPaid()) {
                $order->update(['status' => 'pending']);
            }

            DB::commit();

            $payment->load('order');

            return response()->json([
                'success' => true,
                'data' => $payment,
                'message' => 'Payment refunded successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to refund payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

