<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductionController;
use App\Http\Controllers\Api\QualityCheckController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Debug endpoint
Route::post('/debug-login', function (Request $request) {
    return response()->json([
        'method' => $request->method(),
        'content_type' => $request->header('Content-Type'),
        'all_data' => $request->all(),
        'json_data' => $request->json()->all(),
        'raw_input' => $request->getContent(),
    ]);
});

// Health check endpoint
Route::get('/health', function () {
    return response()->json([
        'status' => 'OK',
        'message' => 'Laravel API is running',
        'timestamp' => now()
    ]);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // System Admin routes
    Route::prefix('admin')->middleware('role:system_admin')->group(function () {
        // User management
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
        Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword']);
        
        // Role management
        Route::get('/roles', [RoleController::class, 'index']);
        Route::post('/roles/{userId}/assign', [RoleController::class, 'assignRole']);
        Route::get('/roles/{role}/users', [RoleController::class, 'getUsersByRole']);
        Route::get('/roles/stats', [RoleController::class, 'getRoleStats']);
        
        // Backup management
        Route::post('/backup', [BackupController::class, 'createBackup']);
        Route::get('/backups', [BackupController::class, 'listBackups']);
        Route::get('/backups/{filename}/download', [BackupController::class, 'downloadBackup']);
        Route::delete('/backups/{filename}', [BackupController::class, 'deleteBackup']);
        Route::get('/system-usage', [BackupController::class, 'getSystemUsage']);
    });

    // General Manager routes
    Route::prefix('manager')->middleware('role:general_manager,system_admin,admin')->group(function () {
        // Dashboard summary
        Route::get('/dashboard/overview', [DashboardController::class, 'getManagerOverview']);
        Route::get('/dashboard/system', [DashboardController::class, 'getSystemOverview']);

        // Reports
        Route::get('/reports/production', [ReportController::class, 'getProductionReport']);
        Route::get('/reports/sales', [ReportController::class, 'getSalesReport']);
        Route::get('/reports/quality', [ReportController::class, 'getQualityReport']);
        Route::get('/reports/operational', [ReportController::class, 'getOperationalReport']);
        
        // Production Daily Reports (for General Manager to view)
        Route::get('/reports/production-daily', function (\Illuminate\Http\Request $request) {
            try {
                $query = \App\Models\ProductionDailyReport::with('submittedBy:id,name');

                if ($request->filled('date_from')) {
                    $query->whereDate('report_date', '>=', $request->date_from);
                }

                if ($request->filled('date_to')) {
                    $query->whereDate('report_date', '<=', $request->date_to);
                }

                $reports = $query->orderBy('report_date', 'desc')
                    ->paginate($request->get('per_page', 30));

                return response()->json([
                    'success' => true,
                    'data' => $reports,
                    'message' => 'Production daily reports retrieved successfully'
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve production daily reports',
                    'error' => $e->getMessage()
                ], 500);
            }
        });

        // Approval workflows
        Route::get('/approvals/overview', function () {
            try {
                $plannedProductions = \App\Models\Production::with(['supervisor:id,name'])
                    ->where('status', 'planned')
                    ->orderBy('production_date', 'asc')
                    ->orderBy('created_at', 'asc')
                    ->limit(30)
                    ->get();

                $pendingPurchaseOrders = \App\Models\PurchaseOrder::with(['creator:id,name', 'rawMaterial:id,material_name,material_code'])
                    ->where('status', 'pending')
                    ->orderBy('created_at', 'desc')
                    ->limit(30)
                    ->get();

                return response()->json([
                    'success' => true,
                    'data' => [
                        'planned_productions' => $plannedProductions,
                        'pending_purchase_orders' => $pendingPurchaseOrders,
                    ],
                    'message' => 'Approval overview retrieved successfully'
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve approval overview',
                    'error' => $e->getMessage(),
                ], 500);
            }
        });

        Route::put('/approvals/productions/{id}', function (\Illuminate\Http\Request $request, $id) {
            try {
                $validated = $request->validate([
                    'decision' => 'required|in:approve,reject',
                    'comment' => 'nullable|string|max:1000',
                ]);

                $production = \App\Models\Production::findOrFail($id);

                if ($production->status !== 'planned') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Only planned productions can be approved or rejected'
                    ], 422);
                }

                $newStatus = $validated['decision'] === 'approve' ? 'in_progress' : 'cancelled';
                $stamp = now()->format('Y-m-d H:i');
                $decisionText = strtoupper($validated['decision']);
                $comment = $validated['comment'] ?? '';
                $auditLine = "[GM $decisionText at $stamp]" . ($comment !== '' ? " $comment" : '');
                $existingNotes = trim((string) $production->notes);

                $production->update([
                    'status' => $newStatus,
                    'notes' => trim($existingNotes . PHP_EOL . $auditLine),
                ]);

                return response()->json([
                    'success' => true,
                    'data' => $production->fresh(['supervisor:id,name']),
                    'message' => 'Production plan decision saved successfully',
                ]);
            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Production not found',
                ], 404);
            } catch (\Illuminate\Validation\ValidationException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors(),
                ], 422);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to save production decision',
                    'error' => $e->getMessage(),
                ], 500);
            }
        });

        Route::put('/approvals/purchase-orders/{id}', function (\Illuminate\Http\Request $request, $id) {
            try {
                $validated = $request->validate([
                    'decision' => 'required|in:approve,reject',
                    'comment' => 'nullable|string|max:1000',
                ]);

                $purchaseOrder = \App\Models\PurchaseOrder::findOrFail($id);

                if ($purchaseOrder->status !== 'pending') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Only pending purchase orders can be approved or rejected'
                    ], 422);
                }

                $newStatus = $validated['decision'] === 'approve' ? 'approved' : 'cancelled';
                $stamp = now()->format('Y-m-d H:i');
                $decisionText = strtoupper($validated['decision']);
                $comment = $validated['comment'] ?? '';
                $auditLine = "[GM $decisionText at $stamp]" . ($comment !== '' ? " $comment" : '');
                $existingNotes = trim((string) $purchaseOrder->notes);

                $purchaseOrder->update([
                    'status' => $newStatus,
                    'notes' => trim($existingNotes . PHP_EOL . $auditLine),
                ]);

                return response()->json([
                    'success' => true,
                    'data' => $purchaseOrder->fresh(['creator:id,name', 'rawMaterial:id,material_name,material_code']),
                    'message' => 'Purchase order decision saved successfully',
                ]);
            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Purchase order not found',
                ], 404);
            } catch (\Illuminate\Validation\ValidationException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors(),
                ], 422);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to save purchase order decision',
                    'error' => $e->getMessage(),
                ], 500);
            }
        });
    });

    // Production Manager routes
    Route::prefix('production')->middleware('role:production_manager,system_admin,admin')->group(function () {
        // Dashboard
        Route::get('/dashboard', function () {
            try {
                $today = \Carbon\Carbon::today();
                
                // Calculate today's metrics
                $totalProduced = \App\Models\Production::whereDate('production_date', $today)
                    ->sum('quantity_produced');
                $totalTarget = \App\Models\Production::whereDate('production_date', $today)
                    ->sum('quantity_target');
                
                // Calculate efficiency percentage
                $efficiency = 0;
                if ($totalTarget > 0) {
                    $efficiency = ($totalProduced / $totalTarget) * 100;
                }

                $todayMetrics = [
                    'total_batches' => \App\Models\Production::whereDate('production_date', $today)->count(),
                    'completed_batches' => \App\Models\Production::whereDate('production_date', $today)
                        ->where('status', 'completed')->count(),
                    'in_progress_batches' => \App\Models\Production::whereDate('production_date', $today)
                        ->where('status', 'in_progress')->count(),
                    'total_produced' => $totalProduced,
                    'total_target' => $totalTarget,
                    'efficiency' => round($efficiency, 1),
                ];

                // Material alerts
                $lowStockMaterials = \App\Models\RawMaterial::where('current_stock', '<=', \Illuminate\Support\Facades\DB::raw('minimum_stock'))
                    ->where('status', 'active')
                    ->count();

                $expiringMaterials = \App\Models\RawMaterial::where('expiry_date', '<=', \Carbon\Carbon::now()->addDays(30))
                    ->where('status', 'active')
                    ->count();

                // Recent productions
                $recentProductions = \App\Models\Production::with(['supervisor', 'productionDetails.rawMaterial'])
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get();

                return response()->json([
                    'success' => true,
                    'data' => [
                        'today_metrics' => $todayMetrics,
                        'material_alerts' => [
                            'low_stock_count' => $lowStockMaterials,
                            'expiring_count' => $expiringMaterials,
                        ],
                        'recent_productions' => $recentProductions,
                        'last_updated' => \Carbon\Carbon::now()->toISOString(),
                    ],
                    'message' => 'Production dashboard data retrieved successfully'
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to load production dashboard',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        // Create new production
        Route::post('/productions', function (\Illuminate\Http\Request $request) {
            try {
                $validated = $request->validate([
                    'product_name' => 'required|string|max:255',
                    'batch_number' => 'required|string|unique:productions,batch_number',
                    'quantity_target' => 'required|numeric|min:0',
                    'production_line' => 'required|string',
                    'shift' => 'required|in:morning,afternoon,night',
                    'production_date' => 'required|date',
                    'start_time' => 'required',
                    'notes' => 'nullable|string',
                ]);

                $user = auth()->user();
                
                $production = \App\Models\Production::create([
                    'product_name' => $validated['product_name'],
                    'batch_number' => $validated['batch_number'],
                    'quantity_produced' => 0,
                    'quantity_target' => $validated['quantity_target'],
                    'production_cost' => 0,
                    'production_line' => $validated['production_line'],
                    'shift' => $validated['shift'],
                    'status' => 'planned',
                    'production_date' => $validated['production_date'],
                    'start_time' => $validated['start_time'],
                    'end_time' => null,
                    'notes' => $validated['notes'] ?? '',
                    'supervisor_id' => $user->id,
                ]);

                return response()->json([
                    'success' => true,
                    'data' => $production->load('supervisor'),
                    'message' => 'Production batch created successfully'
                ], 201);

            } catch (\Illuminate\Validation\ValidationException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors()
                ], 422);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create production',
                    'error' => $e->getMessage()
                ], 500);
            }
        });

        // Update production status and details
        Route::put('/productions/{id}', function (\Illuminate\Http\Request $request, $id) {
            try {
                $production = \App\Models\Production::findOrFail($id);

                $validated = $request->validate([
                    'status' => 'sometimes|in:planned,in_progress,completed,cancelled',
                    'quantity_produced' => 'sometimes|numeric|min:0',
                    'production_cost' => 'sometimes|numeric|min:0',
                    'end_time' => 'sometimes|nullable',
                    'notes' => 'sometimes|nullable|string',
                ]);

                // If marking as completed, set end_time if not provided
                if (isset($validated['status']) && $validated['status'] === 'completed' && !isset($validated['end_time'])) {
                    $validated['end_time'] = now()->format('H:i');
                }

                // If marking as in_progress and start_time is in future, update it
                if (isset($validated['status']) && $validated['status'] === 'in_progress') {
                    // Optionally update start_time to now if it was planned for future
                }

                $production->update($validated);

                return response()->json([
                    'success' => true,
                    'data' => $production->load('supervisor'),
                    'message' => 'Production updated successfully'
                ]);

            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Production not found'
                ], 404);
            } catch (\Illuminate\Validation\ValidationException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors()
                ], 422);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update production',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        // Production management
        Route::get('/productions', function (\Illuminate\Http\Request $request) {
            try {
                $query = \App\Models\Production::with(['supervisor', 'productionDetails.rawMaterial']);

                // Apply filters
                if ($request->filled('status')) {
                    $query->where('status', $request->status);
                }

                if ($request->filled('product_name')) {
                    $query->where('product_name', 'like', '%' . $request->product_name . '%');
                }

                if ($request->filled('date_from')) {
                    $query->whereDate('production_date', '>=', $request->date_from);
                }

                if ($request->filled('date_to')) {
                    $query->whereDate('production_date', '<=', $request->date_to);
                }

                if ($request->filled('production_line')) {
                    $query->where('production_line', $request->production_line);
                }

                // Pagination
                $perPage = $request->get('per_page', 15);
                $productions = $query->orderBy('production_date', 'desc')
                    ->paginate($perPage);

                return response()->json([
                    'success' => true,
                    'data' => $productions,
                    'message' => 'Productions retrieved successfully'
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve productions',
                    'error' => $e->getMessage()
                ], 500);
            }
        });

        Route::get('/reports', [ReportController::class, 'getProductionReport']);

        // Production Daily Reports
        Route::post('/daily-reports', function (\Illuminate\Http\Request $request) {
            try {
                $validated = $request->validate([
                    'report_date' => 'required|date',
                    'total_batches' => 'required|integer|min:0',
                    'completed_batches' => 'required|integer|min:0',
                    'in_progress_batches' => 'required|integer|min:0',
                    'total_produced' => 'required|numeric|min:0',
                    'total_target' => 'required|numeric|min:0',
                    'efficiency' => 'required|numeric|min:0|max:100',
                    'issues' => 'nullable|string',
                    'recommendations' => 'nullable|string',
                ]);

                $user = auth()->user();

                $report = \App\Models\ProductionDailyReport::updateOrCreate(
                    [
                        'report_date' => $validated['report_date'],
                        'submitted_by_id' => $user->id,
                    ],
                    [
                        'total_batches' => $validated['total_batches'],
                        'completed_batches' => $validated['completed_batches'],
                        'in_progress_batches' => $validated['in_progress_batches'],
                        'total_produced' => $validated['total_produced'],
                        'total_target' => $validated['total_target'],
                        'efficiency' => $validated['efficiency'],
                        'issues' => $validated['issues'],
                        'recommendations' => $validated['recommendations'],
                    ]
                );

                return response()->json([
                    'success' => true,
                    'data' => $report->load('submittedBy:id,name'),
                    'message' => 'Daily production report submitted successfully'
                ], 201);

            } catch (\Illuminate\Validation\ValidationException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors()
                ], 422);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to submit daily report',
                    'error' => $e->getMessage()
                ], 500);
            }
        });

        Route::get('/daily-reports', function (\Illuminate\Http\Request $request) {
            try {
                $query = \App\Models\ProductionDailyReport::with('submittedBy:id,name');

                if ($request->filled('date_from')) {
                    $query->whereDate('report_date', '>=', $request->date_from);
                }

                if ($request->filled('date_to')) {
                    $query->whereDate('report_date', '<=', $request->date_to);
                }

                $reports = $query->orderBy('report_date', 'desc')
                    ->paginate($request->get('per_page', 15));

                return response()->json([
                    'success' => true,
                    'data' => $reports,
                    'message' => 'Daily production reports retrieved successfully'
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve daily reports',
                    'error' => $e->getMessage()
                ], 500);
            }
        });

        Route::get('/productions/{id}/materials', function ($id) {
            try {
                $production = \App\Models\Production::with(['productionDetails.rawMaterial'])->findOrFail($id);

                return response()->json([
                    'success' => true,
                    'data' => $production->productionDetails,
                    'message' => 'Production materials retrieved successfully'
                ]);
            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Production not found'
                ], 404);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve production materials',
                    'error' => $e->getMessage()
                ], 500);
            }
        });

        Route::post('/productions/{id}/materials', function (\Illuminate\Http\Request $request, $id) {
            try {
                $production = \App\Models\Production::findOrFail($id);

                $validated = $request->validate([
                    'materials' => 'required|array|min:1',
                    'materials.*.raw_material_id' => 'required|exists:raw_materials,id',
                    'materials.*.planned_quantity' => 'required|numeric|min:0.01',
                    'materials.*.actual_quantity' => 'nullable|numeric|min:0',
                    'materials.*.unit_cost' => 'nullable|numeric|min:0',
                    'materials.*.waste_quantity' => 'nullable|numeric|min:0',
                    'materials.*.notes' => 'nullable|string',
                ]);

                \Illuminate\Support\Facades\DB::beginTransaction();

                foreach ($validated['materials'] as $materialData) {
                    $rawMaterial = \App\Models\RawMaterial::findOrFail($materialData['raw_material_id']);
                    $plannedQuantity = $materialData['planned_quantity'];
                    $actualQuantity = $materialData['actual_quantity'] ?? null;
                    $unitCost = $materialData['unit_cost'] ?? (float) $rawMaterial->unit_cost;
                    $wasteQuantity = $materialData['waste_quantity'] ?? 0;
                    $costQuantity = $actualQuantity ?? $plannedQuantity;
                    $totalCost = $costQuantity * $unitCost;

                    \App\Models\ProductionDetail::updateOrCreate(
                        [
                            'production_id' => $production->id,
                            'raw_material_id' => $rawMaterial->id,
                        ],
                        [
                            'planned_quantity' => $plannedQuantity,
                            'actual_quantity' => $actualQuantity,
                            'unit_cost' => $unitCost,
                            'total_cost' => $totalCost,
                            'waste_quantity' => $wasteQuantity,
                            'notes' => $materialData['notes'] ?? null,
                        ]
                    );
                }

                $production->update([
                    'production_cost' => $production->productionDetails()->sum('total_cost')
                ]);

                \Illuminate\Support\Facades\DB::commit();

                return response()->json([
                    'success' => true,
                    'data' => $production->load('productionDetails.rawMaterial'),
                    'message' => 'Production materials assigned successfully'
                ]);
            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Production or raw material not found'
                ], 404);
            } catch (\Illuminate\Validation\ValidationException $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors()
                ], 422);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to assign materials',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        // Raw materials
        Route::get('/raw-materials', function (\Illuminate\Http\Request $request) {
            try {
                $query = \App\Models\RawMaterial::where('status', 'active');

                if ($request->has('category')) {
                    $query->where('category', $request->category);
                }

                if ($request->has('search')) {
                    $query->where(function($q) use ($request) {
                        $q->where('material_name', 'like', '%' . $request->search . '%')
                          ->orWhere('material_code', 'like', '%' . $request->search . '%');
                    });
                }

                $materials = $query->orderBy('material_name')->get();

                return response()->json([
                    'success' => true,
                    'data' => $materials,
                    'message' => 'Raw materials retrieved successfully'
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve raw materials',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        Route::get('/inventory', function (\Illuminate\Http\Request $request) {
            try {
                $materials = \App\Models\RawMaterial::where('status', 'active')
                    ->orderBy('material_name')
                    ->get();

                $inventory = [
                    'materials' => $materials,
                    'summary' => [
                        'total_materials' => $materials->count(),
                        'low_stock_count' => $materials->where('stock_status', 'low_stock')->count(),
                        'out_of_stock_count' => $materials->where('stock_status', 'out_of_stock')->count(),
                        'expiring_soon_count' => $materials->filter(function($material) {
                            return $material->isExpiringSoon();
                        })->count(),
                        'total_inventory_value' => $materials->sum('stock_value'),
                    ],
                    'alerts' => [
                        'low_stock' => $materials->where('stock_status', 'low_stock')->values(),
                        'out_of_stock' => $materials->where('stock_status', 'out_of_stock')->values(),
                        'expiring_soon' => $materials->filter(function($material) {
                            return $material->isExpiringSoon();
                        })->values(),
                    ]
                ];

                return response()->json([
                    'success' => true,
                    'data' => $inventory,
                    'message' => 'Material inventory retrieved successfully'
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve material inventory',
                    'error' => $e->getMessage()
                ], 500);
            }
        });

        Route::get('/purchase-orders', function (\Illuminate\Http\Request $request) {
            try {
                $query = \App\Models\PurchaseOrder::with(['creator:id,name', 'rawMaterial:id,material_name,material_code']);

                if ($request->filled('status')) {
                    $query->where('status', $request->status);
                }

                if ($request->filled('supplier_name')) {
                    $query->where('supplier_name', 'like', '%' . $request->supplier_name . '%');
                }

                if ($request->filled('date_from')) {
                    $query->whereDate('created_at', '>=', $request->date_from);
                }

                if ($request->filled('date_to')) {
                    $query->whereDate('created_at', '<=', $request->date_to);
                }

                $purchaseOrders = $query->orderBy('created_at', 'desc')
                    ->paginate($request->get('per_page', 15));

                return response()->json([
                    'success' => true,
                    'data' => $purchaseOrders,
                    'message' => 'Purchase orders retrieved successfully'
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve purchase orders',
                    'error' => $e->getMessage()
                ], 500);
            }
        });

        Route::post('/purchase-orders', function (\Illuminate\Http\Request $request) {
            try {
                $validated = $request->validate([
                    'raw_material_id' => 'nullable|exists:raw_materials,id',
                    'material_name' => 'required|string|max:255',
                    'supplier_name' => 'required|string|max:255',
                    'unit_of_measure' => 'nullable|string|max:50',
                    'quantity' => 'required|numeric|min:0.01',
                    'unit_cost' => 'required|numeric|min:0',
                    'expected_delivery_date' => 'required|date',
                    'notes' => 'nullable|string',
                ]);

                \Illuminate\Support\Facades\DB::beginTransaction();

                $purchaseOrder = \App\Models\PurchaseOrder::create([
                    'po_number' => \App\Models\PurchaseOrder::generatePoNumber(),
                    'raw_material_id' => $validated['raw_material_id'] ?? null,
                    'material_name' => $validated['material_name'],
                    'supplier_name' => $validated['supplier_name'],
                    'unit_of_measure' => $validated['unit_of_measure'] ?? null,
                    'quantity' => $validated['quantity'],
                    'unit_cost' => $validated['unit_cost'],
                    'total_cost' => $validated['quantity'] * $validated['unit_cost'],
                    'expected_delivery_date' => $validated['expected_delivery_date'],
                    'status' => 'pending',
                    'notes' => $validated['notes'] ?? null,
                    'created_by' => auth()->id(),
                ]);

                if (!empty($validated['raw_material_id'])) {
                    $rawMaterial = \App\Models\RawMaterial::find($validated['raw_material_id']);
                    if ($rawMaterial) {
                        $rawMaterial->update([
                            'last_purchase_date' => now()->toDateString(),
                            'last_purchase_quantity' => $validated['quantity'],
                            'last_purchase_cost' => $validated['quantity'] * $validated['unit_cost'],
                            'supplier_name' => $validated['supplier_name'],
                            'unit_of_measure' => $validated['unit_of_measure'] ?? $rawMaterial->unit_of_measure,
                        ]);
                    }
                }

                \Illuminate\Support\Facades\DB::commit();

                return response()->json([
                    'success' => true,
                    'data' => $purchaseOrder->load('creator:id,name'),
                    'message' => 'Purchase order created successfully'
                ], 201);
            } catch (\Illuminate\Validation\ValidationException $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors()
                ], 422);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create purchase order',
                    'error' => $e->getMessage()
                ], 500);
            }
        });

        Route::put('/purchase-orders/{id}/status', function (\Illuminate\Http\Request $request, $id) {
            try {
                $validated = $request->validate([
                    'status' => 'required|in:pending,approved,ordered,received,cancelled',
                    'notes' => 'nullable|string',
                ]);

                $purchaseOrder = \App\Models\PurchaseOrder::findOrFail($id);

                $updateData = ['status' => $validated['status']];
                if (array_key_exists('notes', $validated)) {
                    $updateData['notes'] = $validated['notes'];
                }

                $purchaseOrder->update($updateData);

                return response()->json([
                    'success' => true,
                    'data' => $purchaseOrder->fresh(['creator:id,name', 'rawMaterial:id,material_name,material_code']),
                    'message' => 'Purchase order status updated successfully'
                ]);
            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Purchase order not found'
                ], 404);
            } catch (\Illuminate\Validation\ValidationException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors()
                ], 422);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update purchase order status',
                    'error' => $e->getMessage()
                ], 500);
            }
        });

        // Stock Adjustment
        Route::post('/raw-materials/{id}/adjust-stock', function (\Illuminate\Http\Request $request, $id) {
            try {
                $validated = $request->validate([
                    'adjustment_type' => 'required|in:add,remove',
                    'quantity' => 'required|numeric|min:0.01',
                    'reason' => 'required|string|max:500',
                ]);

                $material = \App\Models\RawMaterial::findOrFail($id);
                $user = auth()->user();
                
                $oldStock = $material->current_stock;
                $adjustmentQty = $validated['quantity'];
                
                if ($validated['adjustment_type'] === 'add') {
                    $newStock = $oldStock + $adjustmentQty;
                } else {
                    // Remove - ensure we don't go negative
                    if ($oldStock < $adjustmentQty) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Cannot remove more stock than available. Current stock: ' . $oldStock
                        ], 422);
                    }
                    $newStock = $oldStock - $adjustmentQty;
                }

                \Illuminate\Support\Facades\DB::beginTransaction();

                // Update material stock
                $material->update([
                    'current_stock' => $newStock
                ]);

                // Log the adjustment in activity logs
                \App\Models\ActivityLog::create([
                    'user_id' => $user->id,
                    'action' => 'stock_adjustment',
                    'description' => sprintf(
                        'Stock %s for %s: %s %s (Old: %s, New: %s). Reason: %s',
                        $validated['adjustment_type'] === 'add' ? 'added' : 'removed',
                        $material->material_name,
                        $adjustmentQty,
                        $material->unit_of_measure,
                        $oldStock,
                        $newStock,
                        $validated['reason']
                    ),
                    'ip_address' => $request->ip(),
                ]);

                \Illuminate\Support\Facades\DB::commit();

                return response()->json([
                    'success' => true,
                    'data' => [
                        'material' => $material->fresh(),
                        'old_stock' => $oldStock,
                        'new_stock' => $newStock,
                        'adjustment' => $adjustmentQty,
                        'type' => $validated['adjustment_type']
                    ],
                    'message' => 'Stock adjusted successfully'
                ], 200);

            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Material not found'
                ], 404);
            } catch (\Illuminate\Validation\ValidationException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors()
                ], 422);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to adjust stock',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
    });

    // Quality Controller routes
    Route::prefix('quality')->middleware('role:quality_controller,system_admin,admin')->group(function () {
        Route::get('/dashboard', [QualityCheckController::class, 'getDashboard']);
        Route::get('/checks', [QualityCheckController::class, 'index']);
        Route::post('/checks', [QualityCheckController::class, 'store']);
        Route::put('/checks/{id}', [QualityCheckController::class, 'update']);
        Route::get('/reports', [QualityCheckController::class, 'getReports']);
        Route::get('/available-productions', [QualityCheckController::class, 'getAvailableProductions']);
    });

    // Cashier routes
    Route::prefix('orders')->middleware('role:cashier,system_admin,admin')->group(function () {
        Route::get('/', [OrderController::class, 'index']);
        Route::post('/', [OrderController::class, 'store']);
        Route::get('/{id}', [OrderController::class, 'show']);
        Route::put('/{id}/status', [OrderController::class, 'updateStatus']);
    });

    Route::prefix('payments')->middleware('role:cashier,system_admin,admin')->group(function () {
        Route::get('/', [PaymentController::class, 'index']);
        Route::post('/process', [PaymentController::class, 'processPayment']);
        Route::get('/reports', [PaymentController::class, 'getReports']);
        Route::put('/{id}/refund', [PaymentController::class, 'refund']);
    });

    Route::prefix('cashier')->middleware('role:cashier,system_admin,admin')->group(function () {
        Route::get('/dashboard', [OrderController::class, 'getDashboard']);
        Route::get('/products', [OrderController::class, 'getProducts']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders/{id}', [OrderController::class, 'show']);
        Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);
        
        Route::get('/payments', [PaymentController::class, 'index']);
        Route::post('/payments', [PaymentController::class, 'processPayment']);
        Route::get('/payment-reports', [PaymentController::class, 'getReports']);
        Route::put('/payments/{id}/refund', [PaymentController::class, 'refund']);
    });
});

// Example API routes
Route::prefix('v1')->group(function () {
    // Add your API routes here
});
