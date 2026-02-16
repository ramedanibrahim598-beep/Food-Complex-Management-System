<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QualityCheck;
use App\Models\Production;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class QualityCheckController extends Controller
{
    private function mapDisplayStatus(QualityCheck $check): string
    {
        if ($check->status === 'pending') {
            return 'pending';
        }

        return match ($check->result) {
            'pass' => 'passed',
            'fail' => 'failed',
            default => $check->status ?: 'pending',
        };
    }

    /**
     * Get quality dashboard data
     */
    public function getDashboard()
    {
        try {
            $today = Carbon::today();
            $thisWeek = Carbon::now()->startOfWeek();
            $thisMonth = Carbon::now()->startOfMonth();

            // Today's quality metrics
            $todayMetrics = [
                'total_inspections' => QualityCheck::whereDate('check_date', $today)->count(),
                'passed_inspections' => QualityCheck::whereDate('check_date', $today)
                    ->where('result', 'pass')->count(),
                'failed_inspections' => QualityCheck::whereDate('check_date', $today)
                    ->where('result', 'fail')->count(),
                'pending_inspections' => QualityCheck::whereDate('check_date', $today)
                    ->where('status', 'pending')->count(),
                'pass_rate' => 0,
            ];

            // Calculate pass rate
            if ($todayMetrics['total_inspections'] > 0) {
                $todayMetrics['pass_rate'] = round(
                    ($todayMetrics['passed_inspections'] / $todayMetrics['total_inspections']) * 100, 
                    1
                );
            }

            // Weekly trends
            $weeklyTrends = QualityCheck::where('check_date', '>=', $thisWeek)
                ->selectRaw("DATE(check_date) as date,
                           COUNT(*) as total,
                           SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed,
                           SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as failed")
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            // Recent quality checks
            $recentChecks = QualityCheck::with(['production', 'inspector'])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function($check) {
                    return [
                        'id' => $check->id,
                        'status' => $this->mapDisplayStatus($check),
                        'check_date' => $check->check_date,
                        'defect_type' => $check->check_type,
                        'defect_count' => $check->result === 'fail' ? 1 : 0,
                        'sample_size' => 1,
                        'production' => [
                            'product_name' => $check->product_name,
                            'batch_number' => $check->batch_number,
                        ],
                        'inspector' => [
                            'name' => $check->inspector ? $check->inspector->name : 'Unknown',
                        ],
                    ];
                });

            // Quality issues summary (by check type for failed checks)
            $qualityIssues = QualityCheck::where('result', 'fail')
                ->where('check_date', '>=', $thisMonth)
                ->selectRaw('check_type as defect_type, COUNT(*) as count')
                ->groupBy('check_type')
                ->orderBy('count', 'desc')
                ->limit(5)
                ->get();

            // Productions pending inspection
            $pendingInspections = Production::whereNotIn('id', function($query) {
                $query->select('production_id')
                      ->from('quality_checks')
                      ->whereIn('result', ['pass', 'fail']);
            })
            ->where('status', 'completed')
            ->with('supervisor')
            ->orderBy('production_date', 'desc')
            ->limit(10)
            ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'today_metrics' => $todayMetrics,
                    'weekly_trends' => $weeklyTrends,
                    'recent_checks' => $recentChecks,
                    'quality_issues' => $qualityIssues,
                    'pending_inspections' => $pendingInspections,
                    'last_updated' => Carbon::now()->toISOString(),
                ],
                'message' => 'Quality dashboard data retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load quality dashboard',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all quality checks with filters
     */
    public function index(Request $request)
    {
        try {
            $query = QualityCheck::with(['production', 'inspector']);

            // Apply filters
            if ($request->filled('status')) {
                // Map frontend status to database columns
                if (in_array($request->status, ['passed', 'failed'])) {
                    $query->where('result', $request->status === 'passed' ? 'pass' : 'fail');
                } elseif ($request->status === 'pending') {
                    $query->where('status', 'pending');
                }
            }

            if ($request->filled('date_from')) {
                $query->whereDate('check_date', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->whereDate('check_date', '<=', $request->date_to);
            }

            if ($request->filled('production_id')) {
                $query->where('production_id', $request->production_id);
            }

            if ($request->filled('defect_type')) {
                $query->where('check_type', 'like', '%' . $request->defect_type . '%');
            }

            // Pagination
            $perPage = $request->get('per_page', 15);
            $qualityChecks = $query->orderBy('check_date', 'desc')
                ->paginate($perPage);

            // Transform data to match frontend expectations
            $qualityChecks->getCollection()->transform(function($check) {
                return [
                    'id' => $check->id,
                    'status' => $this->mapDisplayStatus($check),
                    'check_date' => $check->check_date ? $check->check_date->format('Y-m-d') : null,
                    'defect_type' => $check->check_type,
                    'defect_count' => $check->result === 'fail' ? 1 : 0,
                    'sample_size' => 1,
                    'notes' => $check->observations,
                    'production' => [
                        'id' => $check->production_id,
                        'product_name' => $check->product_name,
                        'batch_number' => $check->batch_number,
                        'production_date' => $check->production && $check->production->production_date 
                            ? $check->production->production_date->format('Y-m-d') 
                            : null,
                        'quantity_produced' => $check->production ? $check->production->quantity_produced : 0,
                    ],
                    'inspector' => [
                        'name' => $check->inspector ? $check->inspector->name : 'Unknown',
                    ],
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $qualityChecks,
                'message' => 'Quality checks retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve quality checks',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new quality check
     */
    public function store(Request $request)
    {
        try {
            \Log::info('Quality check creation request:', $request->all());

            $request->validate([
                'batch_number' => 'required|string',
                'product_name' => 'required|string',
                'check_date' => 'required|date',
                'status' => 'required|in:pending,passed,failed',
                'defect_type' => 'nullable|string|max:255',
                'defect_count' => 'nullable|integer|min:0',
                'sample_size' => 'nullable|integer|min:1',
                'notes' => 'nullable|string',
            ]);

            // Try to find the production by batch number
            $production = Production::where('batch_number', $request->batch_number)->first();
            \Log::info('Production found:', ['production' => $production ? $production->id : 'not found']);

            // Generate check number
            $checkNumber = 'QC-' . date('Ymd') . '-' . str_pad(QualityCheck::whereDate('created_at', today())->count() + 1, 4, '0', STR_PAD_LEFT);

            // Map frontend status to database result and status
            $result = 'pass';
            $dbStatus = 'pending';
            if ($request->status === 'passed') {
                $result = 'pass';
                $dbStatus = 'completed';
            } elseif ($request->status === 'failed') {
                $result = 'fail';
                $dbStatus = 'completed';
            }

            // Use defect_type as check_type, or default to 'general'
            $checkType = $request->defect_type ?: 'general';

            $qualityCheckData = [
                'check_number' => $checkNumber,
                'product_name' => $request->product_name,
                'batch_number' => $request->batch_number,
                'production_id' => $production ? $production->id : null,
                'inspector_id' => Auth::id(),
                'check_date' => $request->check_date,
                'check_time' => now()->format('H:i:s'),
                'check_type' => $checkType,
                'test_parameter' => 'Visual Inspection',
                'expected_value' => 100, // Expected quality score (0-100)
                'actual_value' => $request->status === 'failed' ? 0 : 100, // Actual quality score
                'tolerance_min' => 80, // Minimum acceptable score
                'tolerance_max' => 100, // Maximum score
                'result' => $result,
                'status' => $dbStatus,
                'observations' => $request->notes,
            ];

            \Log::info('Creating quality check with data:', $qualityCheckData);

            $qualityCheck = QualityCheck::create($qualityCheckData);

            $qualityCheck->load(['production', 'inspector']);

            return response()->json([
                'success' => true,
                'data' => $qualityCheck,
                'message' => 'Quality check created successfully'
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation error:', ['errors' => $e->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Quality check creation error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create quality check',
                'error' => $e->getMessage(),
                'details' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Update a quality check
     */
    public function update(Request $request, $id)
    {
        try {
            $qualityCheck = QualityCheck::findOrFail($id);

            $request->validate([
                'status' => 'sometimes|in:pending,passed,failed,completed',
                'result' => 'sometimes|in:pass,fail,warning',
                'observations' => 'nullable|string',
            ]);

            // Map frontend status to database columns
            $updateData = [];
            if ($request->has('status')) {
                if ($request->status === 'passed') {
                    $updateData['result'] = 'pass';
                    $updateData['status'] = 'completed';
                } elseif ($request->status === 'failed') {
                    $updateData['result'] = 'fail';
                    $updateData['status'] = 'completed';
                } else {
                    $updateData['status'] = $request->status;
                }
            }

            if ($request->has('result')) {
                $updateData['result'] = $request->result;
            }

            if ($request->has('observations')) {
                $updateData['observations'] = $request->observations;
            }

            $qualityCheck->update($updateData);
            $qualityCheck->load(['production', 'inspector']);

            return response()->json([
                'success' => true,
                'data' => $qualityCheck,
                'message' => 'Quality check updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update quality check',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get quality reports
     */
    public function getReports(Request $request)
    {
        try {
            $dateFrom = $request->get('date_from', Carbon::now()->subDays(30)->toDateString());
            $dateTo = $request->get('date_to', Carbon::now()->toDateString());

            // Overall quality metrics
            $overallMetrics = QualityCheck::whereBetween('check_date', [$dateFrom, $dateTo])
                ->selectRaw('
                    COUNT(*) as total_inspections,
                    SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) as passed_count,
                    SUM(CASE WHEN result = "fail" THEN 1 ELSE 0 END) as failed_count,
                    SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending_count,
                    AVG(CASE WHEN result = "pass" THEN 100 ELSE 0 END) as pass_rate
                ')
                ->first();

            // Daily quality trends
            $dailyTrends = QualityCheck::whereBetween('check_date', [$dateFrom, $dateTo])
                ->selectRaw('
                    DATE(check_date) as date,
                    COUNT(*) as total,
                    SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) as passed,
                    SUM(CASE WHEN result = "fail" THEN 1 ELSE 0 END) as failed,
                    ROUND(AVG(CASE WHEN result = "pass" THEN 100 ELSE 0 END), 1) as pass_rate
                ')
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            // Top defect types
            $defectTypes = QualityCheck::whereBetween('check_date', [$dateFrom, $dateTo])
                ->where('result', 'fail')
                ->whereNotNull('check_type')
                ->selectRaw('check_type as defect_type, COUNT(*) as count')
                ->groupBy('check_type')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get();

            // Inspector performance
            $inspectorPerformance = QualityCheck::whereBetween('check_date', [$dateFrom, $dateTo])
                ->with('inspector:id,name')
                ->selectRaw('
                    inspector_id,
                    COUNT(*) as total_inspections,
                    SUM(CASE WHEN result = "pass" THEN 1 ELSE 0 END) as passed_count,
                    ROUND(AVG(CASE WHEN result = "pass" THEN 100 ELSE 0 END), 1) as pass_rate
                ')
                ->groupBy('inspector_id')
                ->orderBy('total_inspections', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'overall_metrics' => $overallMetrics,
                    'daily_trends' => $dailyTrends,
                    'defect_types' => $defectTypes,
                    'inspector_performance' => $inspectorPerformance,
                    'date_range' => [
                        'from' => $dateFrom,
                        'to' => $dateTo
                    ]
                ],
                'message' => 'Quality reports generated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate quality reports',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get productions available for inspection
     */
    public function getAvailableProductions()
    {
        try {
            // Get all completed productions
            $productions = Production::where('status', 'completed')
                ->with('supervisor')
                ->orderBy('production_date', 'desc')
                ->limit(50) // Limit to recent 50 productions
                ->get();

            return response()->json([
                'success' => true,
                'data' => $productions,
                'message' => 'Available productions retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve available productions',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
