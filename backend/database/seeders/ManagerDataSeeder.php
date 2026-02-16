<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Production;
use App\Models\Sale;
use App\Models\QualityCheck;
use App\Models\User;
use Carbon\Carbon;

class ManagerDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get existing users or use the first available user
        $existingUsers = User::limit(4)->get();
        
        if ($existingUsers->count() < 4) {
            echo "Not enough users in database. Please ensure at least 4 users exist.\n";
            return;
        }

        $supervisor = $existingUsers[0];
        $salesperson = $existingUsers[1];
        $inspector = $existingUsers[2];
        $manager = $existingUsers[3];

        // Sample products
        $products = ['Premium Bread', 'Whole Wheat Bread', 'Croissants', 'Bagels', 'Muffins'];

        // Create sample production data for the last 30 days
        for ($i = 0; $i < 30; $i++) {
            $date = Carbon::now()->subDays($i);
            
            foreach (array_slice($products, 0, rand(2, 4)) as $product) {
                $targetQuantity = rand(100, 500);
                $producedQuantity = rand(80, $targetQuantity + 20);
                
                $production = Production::create([
                    'product_name' => $product,
                    'batch_number' => 'BATCH-' . $date->format('Ymd') . '-' . strtoupper(substr($product, 0, 3)) . '-' . rand(100, 999),
                    'quantity_produced' => $producedQuantity,
                    'quantity_target' => $targetQuantity,
                    'production_cost' => rand(500, 2000),
                    'production_line' => 'Line ' . rand(1, 3),
                    'shift' => ['morning', 'afternoon', 'night'][rand(0, 2)],
                    'status' => ['completed', 'in_progress', 'failed'][rand(0, 2)],
                    'production_date' => $date->toDateString(),
                    'start_time' => $date->setHour(rand(6, 14))->format('H:i'),
                    'end_time' => $date->addHours(rand(4, 8))->format('H:i'),
                    'notes' => rand(0, 1) ? 'Production completed successfully' : null,
                    'supervisor_id' => $supervisor->id,
                ]);

                // Create quality checks for each production
                for ($j = 0; $j < rand(1, 3); $j++) {
                    $expectedValue = rand(50, 100);
                    $actualValue = $expectedValue + rand(-10, 10);
                    $toleranceMin = $expectedValue - 5;
                    $toleranceMax = $expectedValue + 5;
                    
                    $result = 'pass';
                    if ($actualValue < $toleranceMin || $actualValue > $toleranceMax) {
                        $result = rand(0, 1) ? 'fail' : 'warning';
                    }

                    QualityCheck::create([
                        'check_number' => 'QC-' . $date->format('Ymd') . '-' . rand(1000, 9999),
                        'product_name' => $product,
                        'batch_number' => $production->batch_number,
                        'check_type' => ['incoming', 'in_process', 'final', 'random'][rand(0, 3)],
                        'test_parameter' => ['weight', 'temperature', 'ph', 'moisture', 'texture'][rand(0, 4)],
                        'expected_value' => $expectedValue,
                        'actual_value' => $actualValue,
                        'tolerance_min' => $toleranceMin,
                        'tolerance_max' => $toleranceMax,
                        'result' => $result,
                        'status' => 'completed',
                        'check_date' => $date->toDateString(),
                        'check_time' => $date->setHour(rand(8, 16))->format('H:i'),
                        'observations' => $result === 'pass' ? 'Within acceptable limits' : 'Deviation noted',
                        'corrective_actions' => $result !== 'pass' ? 'Adjusted process parameters' : null,
                        'equipment_used' => 'Scale-' . rand(1, 5),
                        'inspector_id' => $inspector->id,
                        'production_id' => $production->id,
                    ]);
                }
            }
        }

        // Create sample sales data for the last 30 days
        for ($i = 0; $i < 30; $i++) {
            $date = Carbon::now()->subDays($i);
            
            for ($j = 0; $j < rand(5, 15); $j++) {
                $product = $products[rand(0, count($products) - 1)];
                $quantity = rand(1, 20);
                $unitPrice = rand(5, 25);
                $totalAmount = $quantity * $unitPrice;
                $discountAmount = rand(0, 1) ? rand(0, $totalAmount * 0.2) : 0;
                $finalAmount = $totalAmount - $discountAmount;

                Sale::create([
                    'order_number' => 'ORD-' . $date->format('Ymd') . '-' . rand(1000, 9999),
                    'customer_name' => 'Customer ' . rand(1, 100),
                    'customer_email' => 'customer' . rand(1, 100) . '@example.com',
                    'product_name' => $product,
                    'quantity_sold' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_amount' => $totalAmount,
                    'discount_amount' => $discountAmount,
                    'final_amount' => $finalAmount,
                    'payment_method' => ['cash', 'card', 'bank_transfer'][rand(0, 2)],
                    'payment_status' => ['pending', 'paid', 'refunded'][rand(0, 2)],
                    'order_status' => ['processing', 'shipped', 'delivered', 'cancelled'][rand(0, 3)],
                    'sale_date' => $date->toDateString(),
                    'delivery_date' => rand(0, 1) ? $date->addDays(rand(1, 7))->toDateString() : null,
                    'sales_channel' => ['online', 'store', 'phone'][rand(0, 2)],
                    'region' => ['North', 'South', 'East', 'West', 'Central'][rand(0, 4)],
                    'notes' => rand(0, 1) ? 'Customer satisfied with product quality' : null,
                    'salesperson_id' => $salesperson->id,
                ]);
            }
        }

        echo "Sample data created successfully!\n";
        echo "- Productions: " . Production::count() . "\n";
        echo "- Sales: " . Sale::count() . "\n";
        echo "- Quality Checks: " . QualityCheck::count() . "\n";
        echo "- Additional Users: 4\n";
    }
}
