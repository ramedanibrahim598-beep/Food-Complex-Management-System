<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class OrderController extends Controller
{
    /**
     * Get all orders with filters
     */
    public function index(Request $request)
    {
        try {
            $query = Order::with(['cashier', 'orderItems', 'payments']);

            // Apply filters
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('order_type')) {
                $query->where('order_type', $request->order_type);
            }

            if ($request->has('date_from')) {
                $query->whereDate('order_date', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->whereDate('order_date', '<=', $request->date_to);
            }

            if ($request->has('cashier_id')) {
                $query->where('cashier_id', $request->cashier_id);
            }

            if ($request->has('search')) {
                $query->where(function($q) use ($request) {
                    $q->where('order_number', 'like', '%' . $request->search . '%')
                      ->orWhere('customer_name', 'like', '%' . $request->search . '%')
                      ->orWhere('customer_phone', 'like', '%' . $request->search . '%');
                });
            }

            // Pagination
            $perPage = $request->get('per_page', 15);
            $orders = $query->orderBy('order_date', 'desc')
                ->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $orders,
                'message' => 'Orders retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new order
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'customer_name' => 'nullable|string|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'order_type' => 'required|in:dine_in,takeout,delivery',
                'items' => 'required|array|min:1',
                'items.*.product_name' => 'required|string|max:255',
                'items.*.product_code' => 'nullable|string|max:50',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.unit_price' => 'required|numeric|min:0',
                'tax_rate' => 'nullable|numeric|min:0|max:100',
                'discount_amount' => 'nullable|numeric|min:0',
                'notes' => 'nullable|string',
            ]);

            DB::beginTransaction();

            // Calculate totals
            $subtotal = 0;
            foreach ($request->items as $item) {
                $subtotal += $item['quantity'] * $item['unit_price'];
            }

            $taxRate = $request->get('tax_rate', 10); // Default 10% tax
            $taxAmount = ($subtotal * $taxRate) / 100;
            $discountAmount = $request->get('discount_amount', 0);
            $totalAmount = $subtotal + $taxAmount - $discountAmount;

            // Create order
            $order = Order::create([
                'order_number' => Order::generateOrderNumber(),
                'cashier_id' => Auth::id(),
                'customer_name' => $request->customer_name,
                'customer_phone' => $request->customer_phone,
                'order_type' => $request->order_type,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'notes' => $request->notes,
                'order_date' => now(),
            ]);

            // Create order items
            foreach ($request->items as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_name' => $item['product_name'],
                    'product_code' => $item['product_code'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['quantity'] * $item['unit_price'],
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            DB::commit();

            $order->load(['cashier', 'orderItems', 'payments']);

            return response()->json([
                'success' => true,
                'data' => $order,
                'message' => 'Order created successfully'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific order
     */
    public function show($id)
    {
        try {
            $order = Order::with(['cashier', 'orderItems', 'payments'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $order,
                'message' => 'Order retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update order status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $request->validate([
                'status' => 'required|in:pending,preparing,ready,completed,cancelled'
            ]);

            $order = Order::findOrFail($id);
            $order->update(['status' => $request->status]);

            // If order is completed, create a sale record
            if ($request->status === 'completed' && $order->isFullyPaid()) {
                $this->createSaleRecord($order);
            }

            $order->load(['cashier', 'orderItems', 'payments']);

            return response()->json([
                'success' => true,
                'data' => $order,
                'message' => 'Order status updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update order status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get cashier dashboard data
     */
    public function getDashboard()
    {
        try {
            $today = Carbon::today();
            $cashierId = Auth::id();

            // Today's metrics for current cashier
            $todayMetrics = [
                'total_orders' => Order::where('cashier_id', $cashierId)
                    ->whereDate('order_date', $today)->count(),
                'completed_orders' => Order::where('cashier_id', $cashierId)
                    ->whereDate('order_date', $today)
                    ->where('status', 'completed')->count(),
                'pending_orders' => Order::where('cashier_id', $cashierId)
                    ->whereDate('order_date', $today)
                    ->where('status', 'pending')->count(),
                'total_sales' => Order::where('cashier_id', $cashierId)
                    ->whereDate('order_date', $today)
                    ->where('status', 'completed')
                    ->sum('total_amount'),
                'average_order_value' => 0,
            ];

            if ($todayMetrics['completed_orders'] > 0) {
                $todayMetrics['average_order_value'] = $todayMetrics['total_sales'] / $todayMetrics['completed_orders'];
            }

            // Recent orders
            $recentOrders = Order::where('cashier_id', $cashierId)
                ->with(['orderItems', 'payments'])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            // Pending orders
            $pendingOrders = Order::where('cashier_id', $cashierId)
                ->whereIn('status', ['pending', 'preparing'])
                ->with(['orderItems'])
                ->orderBy('order_date', 'asc')
                ->get();

            // Payment method breakdown for today
            $paymentMethods = DB::table('payments')
                ->join('orders', 'payments.order_id', '=', 'orders.id')
                ->where('orders.cashier_id', $cashierId)
                ->whereDate('orders.order_date', $today)
                ->where('payments.status', 'completed')
                ->selectRaw('payment_method, COUNT(*) as count, SUM(amount_paid) as total')
                ->groupBy('payment_method')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'today_metrics' => $todayMetrics,
                    'recent_orders' => $recentOrders,
                    'pending_orders' => $pendingOrders,
                    'payment_methods' => $paymentMethods,
                    'last_updated' => Carbon::now()->toISOString(),
                ],
                'message' => 'Cashier dashboard data retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load cashier dashboard',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available products for POS
     */
    public function getProducts()
    {
        try {
            // Sample products - in a real app, this would come from a products table
            $products = [
                ['id' => 1, 'name' => 'Burger Deluxe', 'code' => 'BUR001', 'price' => 12.99, 'category' => 'Main Course'],
                ['id' => 2, 'name' => 'Chicken Wings', 'code' => 'CHK001', 'price' => 8.99, 'category' => 'Appetizer'],
                ['id' => 3, 'name' => 'Caesar Salad', 'code' => 'SAL001', 'price' => 7.99, 'category' => 'Salad'],
                ['id' => 4, 'name' => 'French Fries', 'code' => 'FRI001', 'price' => 4.99, 'category' => 'Side'],
                ['id' => 5, 'name' => 'Coca Cola', 'code' => 'COK001', 'price' => 2.99, 'category' => 'Beverage'],
                ['id' => 6, 'name' => 'Pizza Margherita', 'code' => 'PIZ001', 'price' => 14.99, 'category' => 'Main Course'],
                ['id' => 7, 'name' => 'Chocolate Cake', 'code' => 'CAK001', 'price' => 6.99, 'category' => 'Dessert'],
                ['id' => 8, 'name' => 'Coffee', 'code' => 'COF001', 'price' => 3.99, 'category' => 'Beverage'],
                ['id' => 9, 'name' => 'Fish & Chips', 'code' => 'FIS001', 'price' => 13.99, 'category' => 'Main Course'],
                ['id' => 10, 'name' => 'Ice Cream', 'code' => 'ICE001', 'price' => 4.99, 'category' => 'Dessert'],
            ];

            return response()->json([
                'success' => true,
                'data' => $products,
                'message' => 'Products retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve products',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create sale record from completed order
     */
    private function createSaleRecord($order)
    {
        try {
            Sale::syncFromOrder($order);
        } catch (\Exception $e) {
            // Log error but don't fail the order completion
            \Log::error('Failed to create sale record: ' . $e->getMessage());
        }
    }
}
