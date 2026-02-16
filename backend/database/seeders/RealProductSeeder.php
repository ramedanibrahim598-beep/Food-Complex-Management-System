<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Production;
use App\Models\RawMaterial;
use App\Models\ProductionDetail;
use App\Models\QualityCheck;
use App\Models\User;
use Carbon\Carbon;

class RealProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Disable foreign key checks
        \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        
        // Clear existing data
        Production::truncate();
        ProductionDetail::truncate();
        QualityCheck::truncate();
        RawMaterial::truncate();
        
        // Re-enable foreign key checks
        \DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Get users
        $productionManager = User::where('role', 'production_manager')->first();
        $qualityController = User::where('role', 'quality_controller')->first();

        if (!$productionManager || !$qualityController) {
            echo "❌ Required users not found. Please run user seeders first.\n";
            return;
        }

        // Define real products with their specifications
        $products = [
            [
                'name' => 'Wheat Flour',
                'category' => 'Flour',
                'raw_material' => 'Wheat',
                'processing_steps' => 'Cleaning → Milling → Sieving → Packaging',
                'quality_params' => ['moisture', 'protein_content', 'ash_content', 'gluten_strength'],
                'target_quantity' => [500, 1000, 1500],
                'cost_range' => [800, 1500],
            ],
            [
                'name' => 'Maize Flour',
                'category' => 'Flour',
                'raw_material' => 'Maize',
                'processing_steps' => 'Cleaning → Grinding → Refining → Packaging',
                'quality_params' => ['moisture', 'particle_size', 'purity', 'contamination'],
                'target_quantity' => [400, 800, 1200],
                'cost_range' => [700, 1300],
            ],
            [
                'name' => 'Macaroni',
                'category' => 'Pasta',
                'raw_material' => 'Durum Wheat Semolina',
                'processing_steps' => 'Mixing → Extrusion → Drying → Packaging',
                'quality_params' => ['moisture', 'texture', 'shape_consistency', 'color'],
                'target_quantity' => [300, 600, 900],
                'cost_range' => [1000, 1800],
            ],
            [
                'name' => 'Spaghetti',
                'category' => 'Pasta',
                'raw_material' => 'Durum Wheat Semolina',
                'processing_steps' => 'Mixing → Extrusion → Drying → Packaging',
                'quality_params' => ['moisture', 'length_consistency', 'protein_content', 'breaking_strength'],
                'target_quantity' => [300, 600, 900],
                'cost_range' => [1000, 1800],
            ],
            [
                'name' => 'Biscuits',
                'category' => 'Baked Goods',
                'raw_material' => 'Flour, Sugar, Fat, Flavorings',
                'processing_steps' => 'Mixing → Shaping → Baking → Cooling → Packaging',
                'quality_params' => ['moisture', 'texture', 'taste', 'appearance'],
                'target_quantity' => [200, 400, 600],
                'cost_range' => [1200, 2000],
            ],
        ];

        // Create raw materials for each product
        $rawMaterials = [
            [
                'material_code' => 'RM-WHEAT-001',
                'material_name' => 'Wheat',
                'category' => 'Grain',
                'unit_of_measure' => 'kg',
                'current_stock' => 5000,
                'minimum_stock' => 1000,
                'maximum_stock' => 10000,
                'unit_cost' => 0.50,
                'supplier_name' => 'Grain Suppliers Ltd',
                'expiry_date' => Carbon::now()->addMonths(6),
                'status' => 'active',
            ],
            [
                'material_code' => 'RM-MAIZE-001',
                'material_name' => 'Maize',
                'category' => 'Grain',
                'unit_of_measure' => 'kg',
                'current_stock' => 4000,
                'minimum_stock' => 800,
                'maximum_stock' => 8000,
                'unit_cost' => 0.45,
                'supplier_name' => 'Grain Suppliers Ltd',
                'expiry_date' => Carbon::now()->addMonths(6),
                'status' => 'active',
            ],
            [
                'material_code' => 'RM-SEMOLINA-001',
                'material_name' => 'Durum Wheat Semolina',
                'category' => 'Processed Grain',
                'unit_of_measure' => 'kg',
                'current_stock' => 3000,
                'minimum_stock' => 600,
                'maximum_stock' => 6000,
                'unit_cost' => 0.80,
                'supplier_name' => 'Premium Grain Co',
                'expiry_date' => Carbon::now()->addMonths(4),
                'status' => 'active',
            ],
            [
                'material_code' => 'RM-SUGAR-001',
                'material_name' => 'Sugar',
                'category' => 'Sweetener',
                'unit_of_measure' => 'kg',
                'current_stock' => 2000,
                'minimum_stock' => 400,
                'maximum_stock' => 4000,
                'unit_cost' => 0.60,
                'supplier_name' => 'Sugar Mills Inc',
                'expiry_date' => Carbon::now()->addYears(2),
                'status' => 'active',
            ],
            [
                'material_code' => 'RM-FAT-001',
                'material_name' => 'Vegetable Fat',
                'category' => 'Fat',
                'unit_of_measure' => 'kg',
                'current_stock' => 1500,
                'minimum_stock' => 300,
                'maximum_stock' => 3000,
                'unit_cost' => 1.20,
                'supplier_name' => 'Oil & Fats Ltd',
                'expiry_date' => Carbon::now()->addMonths(8),
                'status' => 'active',
            ],
        ];

        foreach ($rawMaterials as $material) {
            RawMaterial::create($material);
        }

        echo "✅ Created " . count($rawMaterials) . " raw materials\n";

        // Create production batches for the last 30 days
        $productionCount = 0;
        $qualityCheckCount = 0;

        for ($i = 0; $i < 30; $i++) {
            $date = Carbon::now()->subDays($i);
            
            // Create 2-4 production batches per day
            $batchesPerDay = rand(2, 4);
            
            for ($j = 0; $j < $batchesPerDay; $j++) {
                $product = $products[array_rand($products)];
                $targetQty = $product['target_quantity'][array_rand($product['target_quantity'])];
                $producedQty = rand((int)($targetQty * 0.85), (int)($targetQty * 1.05));
                $cost = rand($product['cost_range'][0], $product['cost_range'][1]);
                
                $production = Production::create([
                    'product_name' => $product['name'],
                    'batch_number' => 'BATCH-' . $date->format('Ymd') . '-' . strtoupper(substr($product['name'], 0, 3)) . '-' . rand(100, 999),
                    'quantity_produced' => $producedQty,
                    'quantity_target' => $targetQty,
                    'production_cost' => $cost,
                    'production_line' => 'Line ' . rand(1, 3),
                    'shift' => ['morning', 'afternoon', 'night'][rand(0, 2)],
                    'status' => ['completed', 'in_progress'][rand(0, 1)],
                    'production_date' => $date->toDateString(),
                    'start_time' => $date->setHour(rand(6, 14))->format('H:i'),
                    'end_time' => $date->addHours(rand(4, 8))->format('H:i'),
                    'notes' => 'Production of ' . $product['name'] . ' - ' . $product['processing_steps'],
                    'supervisor_id' => $productionManager->id,
                ]);

                $productionCount++;

                // Create quality checks for each production
                foreach ($product['quality_params'] as $param) {
                    $expectedValue = $this->getExpectedValue($param);
                    $actualValue = $expectedValue + rand(-5, 5);
                    $toleranceMin = $expectedValue - 3;
                    $toleranceMax = $expectedValue + 3;
                    
                    $result = 'pass';
                    if ($actualValue < $toleranceMin || $actualValue > $toleranceMax) {
                        $result = rand(0, 1) ? 'fail' : 'warning';
                    }

                    QualityCheck::create([
                        'check_number' => 'QC-' . $date->format('Ymd') . '-' . $param . '-' . rand(10000, 99999),
                        'product_name' => $product['name'],
                        'batch_number' => $production->batch_number,
                        'check_type' => ['incoming', 'in_process', 'final'][rand(0, 2)],
                        'test_parameter' => $param,
                        'expected_value' => $expectedValue,
                        'actual_value' => $actualValue,
                        'tolerance_min' => $toleranceMin,
                        'tolerance_max' => $toleranceMax,
                        'result' => $result,
                        'status' => 'completed',
                        'check_date' => $date->toDateString(),
                        'check_time' => $date->setHour(rand(8, 16))->format('H:i'),
                        'observations' => $result === 'pass' ? 'Within acceptable limits' : 'Deviation noted - corrective action taken',
                        'corrective_actions' => $result !== 'pass' ? 'Process parameters adjusted' : null,
                        'equipment_used' => $this->getEquipment($param),
                        'inspector_id' => $qualityController->id,
                        'production_id' => $production->id,
                    ]);

                    $qualityCheckCount++;
                }
            }
        }

        echo "✅ Created $productionCount production batches\n";
        echo "✅ Created $qualityCheckCount quality checks\n";
        echo "\n📦 Real Products in System:\n";
        foreach ($products as $product) {
            echo "   - {$product['name']} ({$product['category']})\n";
        }
        echo "\n✅ System updated with real food products!\n";
    }

    private function getExpectedValue($param)
    {
        $values = [
            'moisture' => 12,
            'protein_content' => 11,
            'ash_content' => 0.5,
            'gluten_strength' => 28,
            'particle_size' => 150,
            'purity' => 98,
            'contamination' => 0.1,
            'texture' => 85,
            'shape_consistency' => 95,
            'color' => 90,
            'length_consistency' => 95,
            'breaking_strength' => 80,
            'taste' => 90,
            'appearance' => 92,
        ];

        return $values[$param] ?? 50;
    }

    private function getEquipment($param)
    {
        $equipment = [
            'moisture' => 'Moisture Analyzer MA-100',
            'protein_content' => 'Protein Analyzer PA-200',
            'ash_content' => 'Ash Analyzer AA-50',
            'gluten_strength' => 'Gluten Tester GT-300',
            'particle_size' => 'Particle Size Analyzer PSA-150',
            'purity' => 'Purity Tester PT-100',
            'contamination' => 'Contamination Detector CD-50',
            'texture' => 'Texture Analyzer TA-500',
            'shape_consistency' => 'Shape Inspector SI-200',
            'color' => 'Colorimeter CM-100',
            'length_consistency' => 'Length Gauge LG-300',
            'breaking_strength' => 'Strength Tester ST-400',
            'taste' => 'Sensory Panel',
            'appearance' => 'Visual Inspection',
        ];

        return $equipment[$param] ?? 'Standard Equipment';
    }
}
