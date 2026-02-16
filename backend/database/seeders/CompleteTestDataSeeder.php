<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Production;
use App\Models\RawMaterial;
use App\Models\ProductionDetail;
use App\Models\QualityCheck;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\PurchaseOrder;
use App\Models\ProductionDailyReport;
use Carbon\Carbon;

class CompleteTestDataSeeder extends Seeder
{
    public function run(): void
    {
        echo "🚀 Starting Complete Test Data Seeding...\n\n";

        // Get users
        $productionManager = User::where('role', 'production_manager')->first();
        $qualityController = User::where('role', 'quality_controller')->first();
        $cashier = User::where('role', 'cashier')->first();

        if (!$productionManager || !$qualityController || !$cashier) {
            echo "❌ Error: Required users not found. Please run user seeders first.\n";
            return;
        }

        echo "✅ Found users:\n";
        echo "   - Production Manager: {$productionManager->name}\n";
        echo "   - Quality Controller: {$qualityController->name}\n";
        echo "   - Cashier: {$cashier->name}\n\n";

        // 1. Create Raw Materials
        echo "📦 Creating Raw Materials...\n";
        $materials = [
            [
                'material_name' => 'Wheat Grain',
                'material_code' => 'RM-WHEAT-001',
                'category' => 'grain',
                'unit_of_measure' => 'kg',
                'current_stock' => 5000,
                'minimum_stock' => 1000,
                'maximum_stock' => 10000,
                'unit_cost' => 25.50,
                'supplier_name' => 'Ethiopian Grain Suppliers',
                'supplier_contact' => '+251911234567',
                'expiry_date' => Carbon::now()->addMonths(6),
                'status' => 'active',
            ],
            [
                'material_name' => 'Maize Grain',
                'material_code' => 'RM-MAIZE-001',
                'category' => 'grain',
                'unit_of_measure' => 'kg',
                'current_stock' => 3000,
                'minimum_stock' => 800,
                'maximum_stock' => 8000,
                'unit_cost' => 22.00,
                'supplier_name' => 'Ethiopian Grain Suppliers',
                'supplier_contact' => '+251911234567',
                'expiry_date' => Carbon::now()->addMonths(6),
                'status' => 'active',
            ],
            [
                'material_name' => 'Packaging Material',
                'material_code' => 'RM-PKG-001',
                'category' => 'packaging',
                'unit_of_measure' => 'units',
                'current_stock' => 10000,
                'minimum_stock' => 2000,
                'maximum_stock' => 20000,
                'unit_cost' => 5.00,
                'supplier_name' => 'Addis Packaging Co.',
                'supplier_contact' => '+251922345678',
                'expiry_date' => null,
                'status' => 'active',
            ],
            [
                'material_name' => 'Sugar',
                'material_code' => 'RM-SUGAR-001',
                'category' => 'ingredient',
                'unit_of_measure' => 'kg',
                'current_stock' => 800,
                'minimum_stock' => 500,
                'maximum_stock' => 3000,
                'unit_cost' => 45.00,
                'supplier_name' => 'Sugar Factory Ltd',
                'supplier_contact' => '+251933456789',
                'expiry_date' => Carbon::now()->addMonths(12),
                'status' => 'active',
            ],
        ];

        foreach ($materials as $material) {
            RawMaterial::updateOrCreate(
                ['material_code' => $material['material_code']],
                $material
            );
        }
        echo "   ✓ Created " . count($materials) . " raw materials\n\n";

        // 2. Create Productions (last 5 days including today)
        echo "🏭 Creating Production Batches...\n";
        $products = ['Wheat Flour', 'Maize Flour', 'Macaroni', 'Spaghetti', 'Biscuits'];
        $shifts = ['morning', 'afternoon', 'night'];
        $productionLines = ['Line A', 'Line B', 'Line C'];
        
        $productionCount = 0;
        $globalBatchCounter = 1;
        for ($day = 4; $day >= 0; $day--) {
            $date = Carbon::today()->subDays($day);
            $batchesPerDay = $day === 0 ? 3 : rand(4, 6); // Fewer batches today
            
            for ($i = 0; $i < $batchesPerDay; $i++) {
                $product = $products[array_rand($products)];
                $target = rand(800, 1500);
                $produced = rand((int)($target * 0.75), (int)($target * 1.05));
                $status = $day === 0 ? ($i < 2 ? 'completed' : 'in_progress') : 'completed';
                
                $production = Production::create([
                    'product_name' => $product,
                    'batch_number' => 'BATCH-' . $date->format('Ymd') . '-' . str_pad($globalBatchCounter, 3, '0', STR_PAD_LEFT),
                    'quantity_produced' => $status === 'completed' ? $produced : rand((int)($target * 0.5), (int)($target * 0.8)),
                    'quantity_target' => $target,
                    'production_cost' => rand(15000, 35000),
                    'production_line' => $productionLines[array_rand($productionLines)],
                    'shift' => $shifts[array_rand($shifts)],
                    'status' => $status,
                    'production_date' => $date,
                    'start_time' => sprintf('%02d:00', rand(6, 14)),
                    'end_time' => $status === 'completed' ? sprintf('%02d:00', rand(15, 22)) : null,
                    'notes' => $status === 'in_progress' ? 'Production ongoing' : 'Completed successfully',
                    'supervisor_id' => $productionManager->id,
                ]);

                // Add production details (materials used)
                $wheat = RawMaterial::where('material_code', 'RM-WHEAT-001')->first();
                $packaging = RawMaterial::where('material_code', 'RM-PKG-001')->first();
                
                if ($wheat && in_array($product, ['Wheat Flour', 'Macaroni', 'Spaghetti', 'Biscuits'])) {
                    ProductionDetail::create([
                        'production_id' => $production->id,
                        'raw_material_id' => $wheat->id,
                        'planned_quantity' => rand(500, 800),
                        'actual_quantity' => rand(480, 820),
                        'unit_cost' => $wheat->unit_cost,
                        'total_cost' => rand(12000, 20000),
                        'waste_quantity' => rand(5, 20),
                        'notes' => 'Used for ' . $product,
                    ]);
                }
                
                if ($packaging) {
                    ProductionDetail::create([
                        'production_id' => $production->id,
                        'raw_material_id' => $packaging->id,
                        'planned_quantity' => rand(100, 200),
                        'actual_quantity' => rand(95, 205),
                        'unit_cost' => $packaging->unit_cost,
                        'total_cost' => rand(500, 1000),
                        'waste_quantity' => rand(0, 5),
                        'notes' => 'Packaging for ' . $product,
                    ]);
                }

                $productionCount++;
                $globalBatchCounter++;
            }
        }
        echo "   ✓ Created {$productionCount} production batches\n\n";

        // 3. Create Quality Checks
        echo "✅ Creating Quality Checks...\n";
        $completedProductions = Production::where('status', 'completed')->get();
        $checkTypes = ['incoming', 'in_process', 'final', 'random'];
        $testParameters = ['weight', 'temperature', 'moisture', 'ph', 'texture'];
        $qualityCount = 0;
        
        foreach ($completedProductions as $production) {
            $checksPerBatch = rand(2, 3);
            for ($i = 0; $i < $checksPerBatch; $i++) {
                $passRate = 0.92; // 92% pass rate
                $expectedValue = rand(50, 100);
                $toleranceMin = $expectedValue * 0.95;
                $toleranceMax = $expectedValue * 1.05;
                $actualValue = rand(1, 100) <= ($passRate * 100) ? 
                    rand((int)$toleranceMin, (int)$toleranceMax) : 
                    (rand(1, 2) === 1 ? rand((int)($toleranceMin * 0.8), (int)$toleranceMin) : rand((int)$toleranceMax, (int)($toleranceMax * 1.2)));
                
                $result = ($actualValue >= $toleranceMin && $actualValue <= $toleranceMax) ? 'pass' : 
                         (abs($actualValue - $expectedValue) / $expectedValue < 0.1 ? 'warning' : 'fail');
                
                $checkNumber = 'QC-' . $production->production_date->format('Ymd') . '-' . str_pad($qualityCount + 1, 4, '0', STR_PAD_LEFT);
                
                QualityCheck::create([
                    'check_number' => $checkNumber,
                    'production_id' => $production->id,
                    'product_name' => $production->product_name,
                    'batch_number' => $production->batch_number,
                    'check_type' => $checkTypes[array_rand($checkTypes)],
                    'test_parameter' => $testParameters[array_rand($testParameters)],
                    'expected_value' => $expectedValue,
                    'actual_value' => $actualValue,
                    'tolerance_min' => $toleranceMin,
                    'tolerance_max' => $toleranceMax,
                    'check_date' => $production->production_date,
                    'check_time' => sprintf('%02d:%02d:00', rand(8, 17), rand(0, 59)),
                    'inspector_id' => $qualityController->id,
                    'result' => $result,
                    'status' => 'completed',
                    'observations' => $result === 'pass' ? 'All parameters within acceptable range' : 
                                    ($result === 'fail' ? 'Quality standards not met - values out of tolerance' : 'Minor deviations observed'),
                    'corrective_actions' => $result === 'fail' ? 'Batch rejected and rework initiated' : 
                                    ($result === 'warning' ? 'Batch approved with monitoring' : null),
                ]);
                $qualityCount++;
            }
        }
        echo "   ✓ Created {$qualityCount} quality checks\n\n";

        // 4. Create Orders (Sales)
        echo "💰 Creating Sales Orders...\n";
        $customers = [
            ['name' => 'Addis Supermarket', 'phone' => '+251911111111'],
            ['name' => 'Bole Trading PLC', 'phone' => '+251922222222'],
            ['name' => 'Merkato Wholesale', 'phone' => '+251933333333'],
            ['name' => 'Piassa Distributors', 'phone' => '+251944444444'],
            ['name' => 'Megenagna Store', 'phone' => '+251955555555'],
        ];
        
        $orderCount = 0;
        for ($day = 4; $day >= 0; $day--) {
            $date = Carbon::today()->subDays($day);
            $ordersPerDay = $day === 0 ? 2 : rand(3, 5);
            
            for ($i = 0; $i < $ordersPerDay; $i++) {
                $customer = $customers[array_rand($customers)];
                $orderNumber = 'ORD-' . $date->format('Ymd') . '-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT);
                
                $order = Order::create([
                    'order_number' => $orderNumber,
                    'customer_name' => $customer['name'],
                    'customer_phone' => $customer['phone'],
                    'order_type' => 'takeout',
                    'order_date' => $date,
                    'status' => 'completed',
                    'cashier_id' => $cashier->id,
                    'subtotal' => 0,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'total_amount' => 0,
                    'notes' => 'B2B Wholesale Order',
                ]);

                // Add order items
                $itemsCount = rand(2, 4);
                $subtotal = 0;
                
                for ($j = 0; $j < $itemsCount; $j++) {
                    $product = $products[array_rand($products)];
                    $quantity = rand(10, 50); // Cartons
                    $unitPrice = rand(800, 1500);
                    $totalPrice = $quantity * $unitPrice;
                    $subtotal += $totalPrice;
                    
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_name' => $product,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'total_price' => $totalPrice,
                    ]);
                }

                // Update order totals
                $discount = rand(0, (int)($subtotal * 0.05));
                $tax = ($subtotal - $discount) * 0.15;
                $total = $subtotal - $discount + $tax;
                
                $order->update([
                    'subtotal' => $subtotal,
                    'discount_amount' => $discount,
                    'tax_amount' => $tax,
                    'total_amount' => $total,
                ]);

                // Create payment
                Payment::create([
                    'order_id' => $order->id,
                    'amount_paid' => $total,
                    'change_amount' => 0,
                    'payment_method' => ['cash', 'card', 'digital_wallet'][array_rand(['cash', 'card', 'digital_wallet'])],
                    'payment_date' => $date,
                    'status' => 'completed',
                    'transaction_id' => 'TXN-' . $date->format('Ymd') . '-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                ]);

                $orderCount++;
            }
        }
        echo "   ✓ Created {$orderCount} sales orders\n\n";

        // 5. Create Purchase Orders (some pending for approval)
        echo "📋 Creating Purchase Orders...\n";
        $lowStockMaterial = RawMaterial::where('material_code', 'RM-SUGAR-001')->first();
        
        if ($lowStockMaterial) {
            PurchaseOrder::create([
                'po_number' => 'PO-' . Carbon::today()->format('Ymd') . '-001',
                'raw_material_id' => $lowStockMaterial->id,
                'material_name' => $lowStockMaterial->material_name,
                'supplier_name' => $lowStockMaterial->supplier_name,
                'unit_of_measure' => $lowStockMaterial->unit_of_measure,
                'quantity' => 2000,
                'unit_cost' => $lowStockMaterial->unit_cost,
                'total_cost' => 2000 * $lowStockMaterial->unit_cost,
                'expected_delivery_date' => Carbon::today()->addDays(7),
                'status' => 'pending',
                'notes' => 'Urgent: Stock running low - requires General Manager approval',
                'created_by' => $productionManager->id,
            ]);
            echo "   ✓ Created 1 pending purchase order\n\n";
        }

        // 6. Create Production Daily Reports (last 3 days, not today)
        echo "📊 Creating Production Daily Reports...\n";
        for ($day = 3; $day >= 1; $day--) {
            $date = Carbon::today()->subDays($day);
            $dayProductions = Production::whereDate('production_date', $date)->get();
            
            if ($dayProductions->count() > 0) {
                $totalBatches = $dayProductions->count();
                $completedBatches = $dayProductions->where('status', 'completed')->count();
                $inProgressBatches = $dayProductions->where('status', 'in_progress')->count();
                $totalProduced = $dayProductions->sum('quantity_produced');
                $totalTarget = $dayProductions->sum('quantity_target');
                $efficiency = $totalTarget > 0 ? ($totalProduced / $totalTarget) * 100 : 0;
                
                ProductionDailyReport::create([
                    'report_date' => $date,
                    'total_batches' => $totalBatches,
                    'completed_batches' => $completedBatches,
                    'in_progress_batches' => $inProgressBatches,
                    'total_produced' => $totalProduced,
                    'total_target' => $totalTarget,
                    'efficiency' => round($efficiency, 2),
                    'issues' => $efficiency < 85 ? 'Some delays in Line B due to maintenance' : 'No major issues',
                    'recommendations' => $efficiency < 85 ? 'Schedule preventive maintenance during off-peak hours' : 'Continue current operations',
                    'submitted_by_id' => $productionManager->id,
                ]);
            }
        }
        echo "   ✓ Created 3 production daily reports\n\n";

        echo "✨ Complete Test Data Seeding Finished!\n\n";
        echo "📈 Summary:\n";
        echo "   - Raw Materials: " . RawMaterial::count() . "\n";
        echo "   - Productions: " . Production::count() . "\n";
        echo "   - Quality Checks: " . QualityCheck::count() . "\n";
        echo "   - Orders: " . Order::count() . "\n";
        echo "   - Purchase Orders: " . PurchaseOrder::count() . "\n";
        echo "   - Daily Reports: " . ProductionDailyReport::count() . "\n\n";
        echo "🎯 You can now test:\n";
        echo "   1. Production Manager: View dashboard, create today's daily report\n";
        echo "   2. Quality Controller: View quality checks\n";
        echo "   3. Cashier: View orders and create new ones\n";
        echo "   4. General Manager: View all reports and approve purchase orders\n";
    }
}
