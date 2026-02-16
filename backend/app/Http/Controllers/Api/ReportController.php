<?php

namespace App\Http\Controllers\Api;

use App\Models\Production;
use App\Models\Sale;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\QualityCheck;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends BaseController
{
    /**
     * Get production reports
     */
    public function getProductionReport(Request $request)
    {
        try {
            $startDate = $request->get('start_date', Carbon::now()->subDays(30)->toDateString());
            $endDate = $request->get('end_date', Carbon::now()->toDateString());

            // Production summary
            $productionSummary = Production::whereBetween('production_date', [$startDate, $endDate])
                ->selectRaw('
                    COUNT(*) as total_batches,
                    SUM(quantity_produced) as total_produced,
                    SUM(quantity_target) as total_target,
                    AVG(CASE WHEN quantity_target > 0 THEN (quantity_produced / quantity_target) * 100 ELSE 0 END) as avg_efficiency,
                    SUM(production_cost) as total_cost
                ')
                ->first();

            // Production by status
            $productionByStatus = Production::whereBetween('production_date', [$startDate, $endDate])
                ->groupBy('status')
                ->selectRaw('status, COUNT(*) as count')
                ->get();

            // Production by product
            $productionByProduct = Production::whereBetween('production_date', [$startDate, $endDate])
                ->groupBy('product_name')
                ->selectRaw('product_name, COUNT(*) as batches, SUM(quantity_produced) as total_quantity')
                ->orderBy('total_quantity', 'desc')
                ->get();

            // Daily production trend
            $dailyProduction = Production::whereBetween('production_date', [$startDate, $endDate])
                ->groupBy('production_date')
                ->selectRaw('production_date, COUNT(*) as batches, SUM(quantity_produced) as quantity')
                ->orderBy('production_date')
                ->get();

            // Production by shift
            $productionByShift = Production::whereBetween('production_date', [$startDate, $endDate])
                ->groupBy('shift')
                ->selectRaw('shift, COUNT(*) as batches, SUM(quantity_produced) as quantity')
                ->get();

            // Production daily reports
            $dailyReports = \App\Models\ProductionDailyReport::with('submittedBy:id,name')
                ->whereBetween('report_date', [$startDate, $endDate])
                ->orderBy('report_date', 'desc')
                ->get();

            return $this->sendResponse([
                'summary' => $productionSummary,
                'by_status' => $productionByStatus,
                'by_product' => $productionByProduct,
                'daily_trend' => $dailyProduction,
                'by_shift' => $productionByShift,
                'daily_reports' => $dailyReports,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ], 'Production report retrieved successfully');

        } catch (\Exception $e) {
            return $this->sendError('Failed to generate production report', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get sales reports
     */
    public function getSalesReport(Request $request)
    {
        try {
            $startDate = $request->get('start_date', Carbon::now()->subDays(30)->toDateString());
            $endDate = $request->get('end_date', Carbon::now()->toDateString());
            $startDateTime = Carbon::parse($startDate)->startOfDay();
            $endDateTime = Carbon::parse($endDate)->endOfDay();

            // Sales summary from Orders
            $salesSummary = Order::whereBetween('order_date', [$startDateTime, $endDateTime])
                ->selectRaw('
                    COUNT(*) as total_orders,
                    SUM(total_amount) as total_revenue,
                    AVG(total_amount) as avg_order_value,
                    SUM(discount_amount) as total_discounts
                ')
                ->first();

            // Get total quantity from order items
            $totalQuantity = OrderItem::whereHas('order', function($query) use ($startDateTime, $endDateTime) {
                $query->whereBetween('order_date', [$startDateTime, $endDateTime]);
            })->sum('quantity');

            $salesSummary->total_quantity = $totalQuantity;

            // Sales by status
            $salesByStatus = Order::whereBetween('order_date', [$startDateTime, $endDateTime])
                ->groupBy('status')
                ->selectRaw('status as order_status, COUNT(*) as count, SUM(total_amount) as revenue')
                ->get();

            // Sales by product (from order items)
            $salesByProduct = DB::table('order_items')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->whereBetween('orders.order_date', [$startDateTime, $endDateTime])
                ->groupBy('order_items.product_name')
                ->selectRaw('
                    order_items.product_name,
                    COUNT(DISTINCT orders.id) as orders,
                    SUM(order_items.quantity) as quantity,
                    SUM(order_items.total_price) as revenue
                ')
                ->orderBy('revenue', 'desc')
                ->get();

            // Daily sales trend
            $dailySales = Order::whereBetween('order_date', [$startDateTime, $endDateTime])
                ->groupBy(DB::raw('DATE(order_date)'))
                ->selectRaw('DATE(order_date) as sale_date, COUNT(*) as orders, SUM(total_amount) as revenue')
                ->orderBy('sale_date')
                ->get();

            // Sales by channel (order type)
            $salesByChannel = Order::whereBetween('order_date', [$startDateTime, $endDateTime])
                ->groupBy('order_type')
                ->selectRaw('order_type as sales_channel, COUNT(*) as orders, SUM(total_amount) as revenue')
                ->get();

            // Payment status from payments table
            $paymentStatus = DB::table('payments')
                ->join('orders', 'payments.order_id', '=', 'orders.id')
                ->whereBetween('orders.order_date', [$startDateTime, $endDateTime])
                ->groupBy('payments.status')
                ->selectRaw('payments.status as payment_status, COUNT(DISTINCT orders.id) as count, SUM(payments.amount_paid) as amount')
                ->get();

            // Detailed customer order list (for daily operational visibility)
            $customerOrders = Order::with(['cashier:id,name', 'payments:id,order_id,payment_method,status,amount_paid,payment_date'])
                ->whereBetween('order_date', [$startDateTime, $endDateTime])
                ->orderBy('order_date', 'desc')
                ->get([
                    'id',
                    'order_number',
                    'customer_name',
                    'customer_phone',
                    'order_type',
                    'status',
                    'total_amount',
                    'discount_amount',
                    'order_date',
                    'cashier_id',
                ]);

            return $this->sendResponse([
                'summary' => $salesSummary,
                'by_status' => $salesByStatus,
                'by_product' => $salesByProduct,
                'daily_trend' => $dailySales,
                'by_channel' => $salesByChannel,
                'payment_status' => $paymentStatus,
                'customer_orders' => $customerOrders,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ], 'Sales report retrieved successfully');

        } catch (\Exception $e) {
            return $this->sendError('Failed to generate sales report', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get quality reports
     */
    public function getQualityReport(Request $request)
    {
        try {
            $startDate = $request->get('start_date', Carbon::now()->subDays(30)->toDateString());
            $endDate = $request->get('end_date', Carbon::now()->toDateString());

            // Quality summary
            $qualitySummary = QualityCheck::whereBetween('check_date', [$startDate, $endDate])
                ->selectRaw('
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) as passed_checks,
                    SUM(CASE WHEN result = "fail" THEN 1 ELSE 0 END) as failed_checks,
                    SUM(CASE WHEN result = "warning" THEN 1 ELSE 0 END) as warning_checks,
                    ROUND((SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as pass_rate
                ')
                ->first();

            // Quality by result
            $qualityByResult = QualityCheck::whereBetween('check_date', [$startDate, $endDate])
                ->groupBy('result')
                ->selectRaw('result, COUNT(*) as count')
                ->get();

            // Quality by product
            $qualityByProduct = QualityCheck::whereBetween('check_date', [$startDate, $endDate])
                ->groupBy('product_name')
                ->selectRaw('
                    product_name, 
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) as passed,
                    ROUND((SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as pass_rate
                ')
                ->orderBy('pass_rate', 'desc')
                ->get();

            // Quality by check type
            $qualityByType = QualityCheck::whereBetween('check_date', [$startDate, $endDate])
                ->groupBy('check_type')
                ->selectRaw('
                    check_type, 
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) as passed,
                    ROUND((SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as pass_rate
                ')
                ->get();

            // Daily quality trend
            $dailyQuality = QualityCheck::whereBetween('check_date', [$startDate, $endDate])
                ->groupBy('check_date')
                ->selectRaw('
                    check_date, 
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) as passed,
                    ROUND((SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as pass_rate
                ')
                ->orderBy('check_date')
                ->get();

            // Detailed daily quality checks (for manager daily visibility)
            $dailyQualityChecks = QualityCheck::with(['inspector:id,name', 'production:id,batch_number,product_name,production_date'])
                ->whereBetween('check_date', [$startDate, $endDate])
                ->orderBy('check_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->get([
                    'id',
                    'check_number',
                    'product_name',
                    'batch_number',
                    'check_type',
                    'result',
                    'status',
                    'check_date',
                    'check_time',
                    'observations',
                    'inspector_id',
                    'production_id',
                ]);

            return $this->sendResponse([
                'summary' => $qualitySummary,
                'by_result' => $qualityByResult,
                'by_product' => $qualityByProduct,
                'by_type' => $qualityByType,
                'daily_trend' => $dailyQuality,
                'daily_checks' => $dailyQualityChecks,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ], 'Quality report retrieved successfully');

        } catch (\Exception $e) {
            return $this->sendError('Failed to generate quality report', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get comprehensive operational report
     */
    public function getOperationalReport(Request $request)
    {
        try {
            $startDate = $request->get('start_date', Carbon::now()->subDays(30)->toDateString());
            $endDate = $request->get('end_date', Carbon::now()->toDateString());

            // Get all individual reports
            $productionData = $this->getProductionReportData($startDate, $endDate);
            $salesData = $this->getSalesReportData($startDate, $endDate);
            $qualityData = $this->getQualityReportData($startDate, $endDate);

            // Calculate KPIs
            $kpis = [
                'production_efficiency' => $productionData['summary']->avg_efficiency ?? 0,
                'quality_pass_rate' => $qualityData['summary']->pass_rate ?? 0,
                'sales_growth' => $this->calculateSalesGrowth($startDate, $endDate),
                'revenue_per_unit' => $salesData['summary']->total_quantity > 0 
                    ? round($salesData['summary']->total_revenue / $salesData['summary']->total_quantity, 2) 
                    : 0,
            ];

            return $this->sendResponse([
                'kpis' => $kpis,
                'production' => $productionData,
                'sales' => $salesData,
                'quality' => $qualityData,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ], 'Operational report retrieved successfully');

        } catch (\Exception $e) {
            return $this->sendError('Failed to generate operational report', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Helper method to get production data
     */
    private function getProductionReportData($startDate, $endDate)
    {
        $summary = Production::whereBetween('production_date', [$startDate, $endDate])
            ->selectRaw('
                COUNT(*) as total_batches,
                SUM(quantity_produced) as total_produced,
                SUM(quantity_target) as total_target,
                AVG(CASE WHEN quantity_target > 0 THEN (quantity_produced / quantity_target) * 100 ELSE 0 END) as avg_efficiency,
                SUM(production_cost) as total_cost
            ')
            ->first();

        return ['summary' => $summary];
    }

    /**
     * Helper method to get sales data
     */
    private function getSalesReportData($startDate, $endDate)
    {
        $startDateTime = Carbon::parse($startDate)->startOfDay();
        $endDateTime = Carbon::parse($endDate)->endOfDay();

        $summary = Order::whereBetween('order_date', [$startDateTime, $endDateTime])
            ->selectRaw('
                COUNT(*) as total_orders,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as avg_order_value
            ')
            ->first();

        // Get total quantity from order items
        $totalQuantity = OrderItem::whereHas('order', function($query) use ($startDateTime, $endDateTime) {
            $query->whereBetween('order_date', [$startDateTime, $endDateTime]);
        })->sum('quantity');

        $summary->total_quantity = $totalQuantity;

        return ['summary' => $summary];
    }

    /**
     * Helper method to get quality data
     */
    private function getQualityReportData($startDate, $endDate)
    {
        $summary = QualityCheck::whereBetween('check_date', [$startDate, $endDate])
            ->selectRaw('
                COUNT(*) as total_checks,
                SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) as passed_checks,
                ROUND((SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as pass_rate
            ')
            ->first();

        return ['summary' => $summary];
    }

    /**
     * Calculate sales growth compared to previous period
     */
    private function calculateSalesGrowth($startDate, $endDate)
    {
        $currentPeriod = Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate));
        $previousStart = Carbon::parse($startDate)->subDays($currentPeriod)->toDateString();
        $previousEnd = Carbon::parse($startDate)->subDay()->toDateString();
        $startDateTime = Carbon::parse($startDate)->startOfDay();
        $endDateTime = Carbon::parse($endDate)->endOfDay();
        $previousStartDateTime = Carbon::parse($previousStart)->startOfDay();
        $previousEndDateTime = Carbon::parse($previousEnd)->endOfDay();

        $currentRevenue = Order::whereBetween('order_date', [$startDateTime, $endDateTime])
            ->sum('total_amount');

        $previousRevenue = Order::whereBetween('order_date', [$previousStartDateTime, $previousEndDateTime])
            ->sum('total_amount');

        if ($previousRevenue == 0) return 0;

        return round((($currentRevenue - $previousRevenue) / $previousRevenue) * 100, 2);
    }
}
