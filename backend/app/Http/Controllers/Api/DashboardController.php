<?php

namespace App\Http\Controllers\Api;

use App\Models\Production;
use App\Models\Sale;
use App\Models\QualityCheck;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends BaseController
{
    /**
     * Get manager dashboard overview
     */
    public function getManagerOverview(Request $request)
    {
        try {
            $today = Carbon::today();
            $thisWeek = Carbon::now()->startOfWeek();
            $thisMonth = Carbon::now()->startOfMonth();

            // Key metrics for today
            $todayMetrics = [
                'production' => [
                    'batches_completed' => Production::whereDate('production_date', $today)
                        ->where('status', 'completed')->count(),
                    'total_produced' => Production::whereDate('production_date', $today)
                        ->sum('quantity_produced'),
                    'efficiency' => $this->calculateTodayEfficiency(),
                ],
                'sales' => [
                    'orders_count' => Sale::whereDate('sale_date', $today)->count(),
                    'revenue' => Sale::whereDate('sale_date', $today)->sum('final_amount'),
                    'avg_order_value' => Sale::whereDate('sale_date', $today)->avg('final_amount') ?? 0,
                ],
                'quality' => [
                    'checks_performed' => QualityCheck::whereDate('check_date', $today)->count(),
                    'pass_rate' => $this->calculateTodayQualityRate(),
                    'failed_checks' => QualityCheck::whereDate('check_date', $today)
                        ->where('result', 'fail')->count(),
                ]
            ];

            // Weekly trends
            $weeklyTrends = [
                'production' => Production::where('production_date', '>=', $thisWeek)
                    ->groupBy(DB::raw('DATE(production_date)'))
                    ->selectRaw('DATE(production_date) as date, SUM(quantity_produced) as quantity')
                    ->orderBy('date')
                    ->get(),
                'sales' => Sale::where('sale_date', '>=', $thisWeek)
                    ->groupBy(DB::raw('DATE(sale_date)'))
                    ->selectRaw('DATE(sale_date) as date, SUM(final_amount) as revenue')
                    ->orderBy('date')
                    ->get(),
                'quality' => QualityCheck::where('check_date', '>=', $thisWeek)
                    ->groupBy(DB::raw('DATE(check_date)'))
                    ->selectRaw('
                        DATE(check_date) as date, 
                        COUNT(*) as total_checks,
                        SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) as passed,
                        ROUND((SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as pass_rate
                    ')
                    ->orderBy('date')
                    ->get(),
            ];

            // Monthly comparison
            $monthlyComparison = [
                'current_month' => [
                    'production' => Production::where('production_date', '>=', $thisMonth)
                        ->sum('quantity_produced'),
                    'sales' => Sale::where('sale_date', '>=', $thisMonth)
                        ->sum('final_amount'),
                    'quality_rate' => $this->calculateMonthlyQualityRate(),
                ],
                'previous_month' => [
                    'production' => Production::whereBetween('production_date', [
                        Carbon::now()->subMonth()->startOfMonth(),
                        Carbon::now()->subMonth()->endOfMonth()
                    ])->sum('quantity_produced'),
                    'sales' => Sale::whereBetween('sale_date', [
                        Carbon::now()->subMonth()->startOfMonth(),
                        Carbon::now()->subMonth()->endOfMonth()
                    ])->sum('final_amount'),
                    'quality_rate' => $this->calculatePreviousMonthQualityRate(),
                ]
            ];

            // Recent alerts and notifications
            $alerts = $this->getRecentAlerts();

            // Top performing products
            $topProducts = $this->getTopPerformingProducts();

            return $this->sendResponse([
                'today_metrics' => $todayMetrics,
                'weekly_trends' => $weeklyTrends,
                'monthly_comparison' => $monthlyComparison,
                'alerts' => $alerts,
                'top_products' => $topProducts,
                'last_updated' => Carbon::now()->toISOString(),
            ], 'Manager dashboard data retrieved successfully');

        } catch (\Exception $e) {
            return $this->sendError('Failed to load dashboard data', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get system-wide overview for strategic decisions
     */
    public function getSystemOverview(Request $request)
    {
        try {
            $period = $request->get('period', '30'); // days
            $startDate = Carbon::now()->subDays($period);

            // Overall system health
            $systemHealth = [
                'production_status' => $this->getProductionStatus(),
                'sales_performance' => $this->getSalesPerformance($startDate),
                'quality_metrics' => $this->getQualityMetrics($startDate),
                'operational_efficiency' => $this->getOperationalEfficiency($startDate),
            ];

            // Strategic KPIs
            $strategicKPIs = [
                'revenue_growth' => $this->calculateRevenueGrowth($period),
                'production_capacity_utilization' => $this->calculateCapacityUtilization($startDate),
                'customer_satisfaction' => $this->calculateCustomerSatisfaction($startDate),
                'cost_efficiency' => $this->calculateCostEfficiency($startDate),
            ];

            // Department performance
            $departmentPerformance = [
                'production' => $this->getProductionDepartmentMetrics($startDate),
                'sales' => $this->getSalesDepartmentMetrics($startDate),
                'quality' => $this->getQualityDepartmentMetrics($startDate),
            ];

            // Pending approvals and decisions
            $pendingItems = $this->getPendingApprovals();

            return $this->sendResponse([
                'system_health' => $systemHealth,
                'strategic_kpis' => $strategicKPIs,
                'department_performance' => $departmentPerformance,
                'pending_approvals' => $pendingItems,
                'period_days' => $period,
                'generated_at' => Carbon::now()->toISOString(),
            ], 'System overview retrieved successfully');

        } catch (\Exception $e) {
            return $this->sendError('Failed to load system overview', ['error' => $e->getMessage()], 500);
        }
    }

    // Helper methods for calculations

    private function calculateTodayEfficiency()
    {
        $today = Carbon::today();
        $productions = Production::whereDate('production_date', $today)->get();
        
        if ($productions->isEmpty()) return 0;
        
        $totalEfficiency = $productions->sum(function ($production) {
            return $production->quantity_target > 0 
                ? ($production->quantity_produced / $production->quantity_target) * 100 
                : 0;
        });
        
        return round($totalEfficiency / $productions->count(), 2);
    }

    private function calculateTodayQualityRate()
    {
        $today = Carbon::today();
        $totalChecks = QualityCheck::whereDate('check_date', $today)->count();
        
        if ($totalChecks == 0) return 0;
        
        $passedChecks = QualityCheck::whereDate('check_date', $today)
            ->where('result', 'pass')->count();
        
        return round(($passedChecks / $totalChecks) * 100, 2);
    }

    private function calculateMonthlyQualityRate()
    {
        $thisMonth = Carbon::now()->startOfMonth();
        $totalChecks = QualityCheck::where('check_date', '>=', $thisMonth)->count();
        
        if ($totalChecks == 0) return 0;
        
        $passedChecks = QualityCheck::where('check_date', '>=', $thisMonth)
            ->where('result', 'pass')->count();
        
        return round(($passedChecks / $totalChecks) * 100, 2);
    }

    private function calculatePreviousMonthQualityRate()
    {
        $previousMonth = Carbon::now()->subMonth();
        $totalChecks = QualityCheck::whereBetween('check_date', [
            $previousMonth->startOfMonth(),
            $previousMonth->endOfMonth()
        ])->count();
        
        if ($totalChecks == 0) return 0;
        
        $passedChecks = QualityCheck::whereBetween('check_date', [
            $previousMonth->startOfMonth(),
            $previousMonth->endOfMonth()
        ])->where('result', 'pass')->count();
        
        return round(($passedChecks / $totalChecks) * 100, 2);
    }

    private function getRecentAlerts()
    {
        $alerts = [];
        
        // Check for low stock raw materials
        $lowStockMaterials = \App\Models\RawMaterial::where('status', 'active')
            ->whereRaw('current_stock <= minimum_stock')
            ->count();
        
        if ($lowStockMaterials > 0) {
            $alerts[] = [
                'type' => 'inventory',
                'severity' => 'high',
                'message' => "{$lowStockMaterials} raw materials are at or below minimum stock level",
                'timestamp' => Carbon::now()->toISOString(),
            ];
        }
        
        // Failed quality checks in last 24 hours
        $failedChecks = QualityCheck::where('check_date', '>=', Carbon::now()->subDay())
            ->where('result', 'fail')
            ->count();
        
        if ($failedChecks > 0) {
            $alerts[] = [
                'type' => 'quality',
                'severity' => 'high',
                'message' => "{$failedChecks} quality checks failed in the last 24 hours",
                'timestamp' => Carbon::now()->toISOString(),
            ];
        }
        
        // Low production efficiency
        $lowEfficiencyBatches = Production::whereDate('production_date', Carbon::today())
            ->where('quantity_target', '>', 0)
            ->whereRaw('(quantity_produced / quantity_target) * 100 < 80')
            ->count();
        
        if ($lowEfficiencyBatches > 0) {
            $alerts[] = [
                'type' => 'production',
                'severity' => 'medium',
                'message' => "{$lowEfficiencyBatches} production batches below 80% efficiency today",
                'timestamp' => Carbon::now()->toISOString(),
            ];
        }
        
        // Pending purchase orders
        $pendingPurchaseOrders = \App\Models\PurchaseOrder::where('status', 'pending')->count();
        
        if ($pendingPurchaseOrders > 0) {
            $alerts[] = [
                'type' => 'approval',
                'severity' => 'medium',
                'message' => "{$pendingPurchaseOrders} purchase orders awaiting approval",
                'timestamp' => Carbon::now()->toISOString(),
            ];
        }
        
        // Planned productions awaiting approval
        $plannedProductions = Production::where('status', 'planned')->count();
        
        if ($plannedProductions > 0) {
            $alerts[] = [
                'type' => 'approval',
                'severity' => 'low',
                'message' => "{$plannedProductions} production plans awaiting approval",
                'timestamp' => Carbon::now()->toISOString(),
            ];
        }
        
        return $alerts;
    }

    private function getTopPerformingProducts()
    {
        $startDate = Carbon::now()->subDays(30);
        
        // Get top products from order items
        return DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.order_date', '>=', $startDate)
            ->groupBy('order_items.product_name')
            ->selectRaw('
                order_items.product_name,
                SUM(order_items.total_price) as revenue,
                SUM(order_items.quantity) as quantity,
                COUNT(DISTINCT orders.id) as orders
            ')
            ->orderBy('revenue', 'desc')
            ->limit(5)
            ->get();
    }

    // Additional helper methods for system overview
    private function getProductionStatus()
    {
        return [
            'active_batches' => Production::where('status', 'in_progress')->count(),
            'completed_today' => Production::whereDate('production_date', Carbon::today())
                ->where('status', 'completed')->count(),
            'efficiency_avg' => $this->calculateTodayEfficiency(),
        ];
    }

    private function getSalesPerformance($startDate)
    {
        return [
            'total_revenue' => Sale::where('sale_date', '>=', $startDate)->sum('final_amount'),
            'total_orders' => Sale::where('sale_date', '>=', $startDate)->count(),
            'avg_order_value' => Sale::where('sale_date', '>=', $startDate)->avg('final_amount') ?? 0,
        ];
    }

    private function getQualityMetrics($startDate)
    {
        $totalChecks = QualityCheck::where('check_date', '>=', $startDate)->count();
        $passedChecks = QualityCheck::where('check_date', '>=', $startDate)
            ->where('result', 'pass')->count();
        
        return [
            'total_checks' => $totalChecks,
            'pass_rate' => $totalChecks > 0 ? round(($passedChecks / $totalChecks) * 100, 2) : 0,
            'failed_checks' => $totalChecks - $passedChecks,
        ];
    }

    private function getOperationalEfficiency($startDate)
    {
        // This would include more complex calculations
        return [
            'overall_score' => 85.5, // Placeholder
            'production_efficiency' => $this->calculateTodayEfficiency(),
            'quality_score' => $this->calculateTodayQualityRate(),
        ];
    }

    private function calculateRevenueGrowth($period)
    {
        $currentPeriodRevenue = Sale::where('sale_date', '>=', Carbon::now()->subDays($period))
            ->sum('final_amount');
        
        $previousPeriodRevenue = Sale::whereBetween('sale_date', [
            Carbon::now()->subDays($period * 2),
            Carbon::now()->subDays($period)
        ])->sum('final_amount');
        
        if ($previousPeriodRevenue == 0) return 0;
        
        return round((($currentPeriodRevenue - $previousPeriodRevenue) / $previousPeriodRevenue) * 100, 2);
    }

    private function calculateCapacityUtilization($startDate)
    {
        // Placeholder calculation - would need capacity data
        return 78.5;
    }

    private function calculateCustomerSatisfaction($startDate)
    {
        // Placeholder - would need customer feedback data
        return 92.3;
    }

    private function calculateCostEfficiency($startDate)
    {
        // Placeholder calculation
        return 88.7;
    }

    private function getProductionDepartmentMetrics($startDate)
    {
        return [
            'efficiency' => $this->calculateTodayEfficiency(),
            'completed_batches' => Production::where('production_date', '>=', $startDate)
                ->where('status', 'completed')->count(),
            'total_output' => Production::where('production_date', '>=', $startDate)
                ->sum('quantity_produced'),
        ];
    }

    private function getSalesDepartmentMetrics($startDate)
    {
        return [
            'revenue' => Sale::where('sale_date', '>=', $startDate)->sum('final_amount'),
            'orders' => Sale::where('sale_date', '>=', $startDate)->count(),
            'conversion_rate' => 85.2, // Placeholder
        ];
    }

    private function getQualityDepartmentMetrics($startDate)
    {
        return [
            'pass_rate' => $this->getQualityMetrics($startDate)['pass_rate'],
            'checks_performed' => QualityCheck::where('check_date', '>=', $startDate)->count(),
            'improvement_rate' => 12.5, // Placeholder
        ];
    }

    private function getPendingApprovals()
    {
        // Placeholder for pending approvals system
        return [
            [
                'type' => 'budget',
                'title' => 'Q2 Marketing Budget Approval',
                'amount' => 50000,
                'submitted_by' => 'Marketing Manager',
                'submitted_at' => Carbon::now()->subHours(2)->toISOString(),
            ],
            [
                'type' => 'policy',
                'title' => 'New Quality Control Procedures',
                'submitted_by' => 'Quality Manager',
                'submitted_at' => Carbon::now()->subDays(1)->toISOString(),
            ]
        ];
    }
}