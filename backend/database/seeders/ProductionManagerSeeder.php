<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RawMaterial;
use App\Models\ProductionDetail;
use App\Models\Production;
use App\Models\User;
use Carbon\Carbon;

class ProductionManagerSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        // Check if raw materials already exist
        if (RawMaterial::count() > 0) {
            $this->command->info('Raw materials already exist, skipping creation...');
        } else {
            // Create raw materials
            $rawMaterials = [
            [
                'material_name' => 'Wheat Flour',
                'material_code' => 'WF001',
                'category' => 'Flour',
                'unit_of_measure' => 'kg',
                'current_stock' => 500.00,
                'minimum_stock' => 100.00,
                'maximum_stock' => 1000.00,
                'unit_cost' => 2.50,
                'supplier_name' => 'Grain Mills Ltd',
                'supplier_contact' => '+1-555-0101',
                'last_purchase_date' => Carbon::now()->subDays(15),
                'last_purchase_quantity' => 200.00,
                'last_purchase_cost' => 500.00,
                'status' => 'active',
                'description' => 'High-quality wheat flour for bread production',
                'storage_location' => 'Warehouse A-1',
                'expiry_date' => Carbon::now()->addMonths(6),
            ],
            [
                'material_name' => 'Sugar',
                'material_code' => 'SG001',
                'category' => 'Sweetener',
                'unit_of_measure' => 'kg',
                'current_stock' => 150.00,
                'minimum_stock' => 50.00,
                'maximum_stock' => 300.00,
                'unit_cost' => 1.20,
                'supplier_name' => 'Sweet Supply Co',
                'supplier_contact' => '+1-555-0102',
                'last_purchase_date' => Carbon::now()->subDays(10),
                'last_purchase_quantity' => 100.00,
                'last_purchase_cost' => 120.00,
                'status' => 'active',
                'description' => 'Refined white sugar for baking',
                'storage_location' => 'Warehouse A-2',
                'expiry_date' => Carbon::now()->addYears(2),
            ],
            [
                'material_name' => 'Yeast',
                'material_code' => 'YS001',
                'category' => 'Leavening',
                'unit_of_measure' => 'kg',
                'current_stock' => 25.00,
                'minimum_stock' => 10.00,
                'maximum_stock' => 50.00,
                'unit_cost' => 8.50,
                'supplier_name' => 'Bio Yeast Corp',
                'supplier_contact' => '+1-555-0103',
                'last_purchase_date' => Carbon::now()->subDays(5),
                'last_purchase_quantity' => 20.00,
                'last_purchase_cost' => 170.00,
                'status' => 'active',
                'description' => 'Active dry yeast for bread fermentation',
                'storage_location' => 'Cold Storage B-1',
                'expiry_date' => Carbon::now()->addMonths(8),
            ],
            [
                'material_name' => 'Salt',
                'material_code' => 'SL001',
                'category' => 'Seasoning',
                'unit_of_measure' => 'kg',
                'current_stock' => 80.00,
                'minimum_stock' => 20.00,
                'maximum_stock' => 150.00,
                'unit_cost' => 0.80,
                'supplier_name' => 'Pure Salt Ltd',
                'supplier_contact' => '+1-555-0104',
                'last_purchase_date' => Carbon::now()->subDays(20),
                'last_purchase_quantity' => 50.00,
                'last_purchase_cost' => 40.00,
                'status' => 'active',
                'description' => 'Fine table salt for baking',
                'storage_location' => 'Warehouse A-3',
                'expiry_date' => null, // Salt doesn't expire
            ],
            [
                'material_name' => 'Butter',
                'material_code' => 'BT001',
                'category' => 'Dairy',
                'unit_of_measure' => 'kg',
                'current_stock' => 45.00,
                'minimum_stock' => 15.00,
                'maximum_stock' => 100.00,
                'unit_cost' => 6.50,
                'supplier_name' => 'Dairy Fresh Inc',
                'supplier_contact' => '+1-555-0105',
                'last_purchase_date' => Carbon::now()->subDays(3),
                'last_purchase_quantity' => 30.00,
                'last_purchase_cost' => 195.00,
                'status' => 'active',
                'description' => 'Unsalted butter for pastries',
                'storage_location' => 'Cold Storage B-2',
                'expiry_date' => Carbon::now()->addDays(45),
            ],
            [
                'material_name' => 'Eggs',
                'material_code' => 'EG001',
                'category' => 'Dairy',
                'unit_of_measure' => 'dozen',
                'current_stock' => 30.00,
                'minimum_stock' => 10.00,
                'maximum_stock' => 60.00,
                'unit_cost' => 3.50,
                'supplier_name' => 'Farm Fresh Eggs',
                'supplier_contact' => '+1-555-0106',
                'last_purchase_date' => Carbon::now()->subDays(2),
                'last_purchase_quantity' => 20.00,
                'last_purchase_cost' => 70.00,
                'status' => 'active',
                'description' => 'Fresh grade A eggs',
                'storage_location' => 'Cold Storage B-3',
                'expiry_date' => Carbon::now()->addDays(21),
            ],
            [
                'material_name' => 'Milk',
                'material_code' => 'MK001',
                'category' => 'Dairy',
                'unit_of_measure' => 'liters',
                'current_stock' => 120.00,
                'minimum_stock' => 50.00,
                'maximum_stock' => 200.00,
                'unit_cost' => 1.80,
                'supplier_name' => 'Dairy Fresh Inc',
                'supplier_contact' => '+1-555-0105',
                'last_purchase_date' => Carbon::now()->subDays(1),
                'last_purchase_quantity' => 80.00,
                'last_purchase_cost' => 144.00,
                'status' => 'active',
                'description' => 'Whole milk for baking',
                'storage_location' => 'Cold Storage B-4',
                'expiry_date' => Carbon::now()->addDays(7),
            ],
            [
                'material_name' => 'Vanilla Extract',
                'material_code' => 'VE001',
                'category' => 'Flavoring',
                'unit_of_measure' => 'ml',
                'current_stock' => 2000.00,
                'minimum_stock' => 500.00,
                'maximum_stock' => 5000.00,
                'unit_cost' => 0.15,
                'supplier_name' => 'Flavor House',
                'supplier_contact' => '+1-555-0107',
                'last_purchase_date' => Carbon::now()->subDays(30),
                'last_purchase_quantity' => 1000.00,
                'last_purchase_cost' => 150.00,
                'status' => 'active',
                'description' => 'Pure vanilla extract for flavoring',
                'storage_location' => 'Warehouse A-4',
                'expiry_date' => Carbon::now()->addYears(3),
            ],
            [
                'material_name' => 'Baking Powder',
                'material_code' => 'BP001',
                'category' => 'Leavening',
                'unit_of_measure' => 'kg',
                'current_stock' => 8.00,
                'minimum_stock' => 5.00,
                'maximum_stock' => 20.00,
                'unit_cost' => 4.20,
                'supplier_name' => 'Baking Supplies Ltd',
                'supplier_contact' => '+1-555-0108',
                'last_purchase_date' => Carbon::now()->subDays(25),
                'last_purchase_quantity' => 10.00,
                'last_purchase_cost' => 42.00,
                'status' => 'active',
                'description' => 'Double-acting baking powder',
                'storage_location' => 'Warehouse A-5',
                'expiry_date' => Carbon::now()->addMonths(18),
            ],
            [
                'material_name' => 'Chocolate Chips',
                'material_code' => 'CC001',
                'category' => 'Add-ins',
                'unit_of_measure' => 'kg',
                'current_stock' => 35.00,
                'minimum_stock' => 15.00,
                'maximum_stock' => 75.00,
                'unit_cost' => 7.80,
                'supplier_name' => 'Choco Delights',
                'supplier_contact' => '+1-555-0109',
                'last_purchase_date' => Carbon::now()->subDays(12),
                'last_purchase_quantity' => 25.00,
                'last_purchase_cost' => 195.00,
                'status' => 'active',
                'description' => 'Semi-sweet chocolate chips',
                'storage_location' => 'Warehouse A-6',
                'expiry_date' => Carbon::now()->addMonths(12),
            ],
        ];

            foreach ($rawMaterials as $material) {
                RawMaterial::create($material);
            }
        }

        // Check if production details already exist
        if (ProductionDetail::count() > 0) {
            $this->command->info('Production details already exist, skipping creation...');
        } else {
            // Create production details for existing productions
        $productions = Production::all();
        $materials = RawMaterial::all();

        foreach ($productions as $production) {
            // Randomly assign 2-4 materials per production
            $materialCount = rand(2, 4);
            $selectedMaterials = $materials->random($materialCount);

            foreach ($selectedMaterials as $material) {
                $plannedQty = rand(5, 50);
                $actualQty = $production->status === 'completed' ? 
                    $plannedQty + rand(-5, 5) : // Add some variance for completed productions
                    ($production->status === 'in_progress' ? rand(0, $plannedQty) : 0);
                
                $wasteQty = $production->status === 'completed' ? rand(0, 3) : 0;
                $unitCost = $material->unit_cost;
                $totalCost = $actualQty * $unitCost;

                ProductionDetail::create([
                    'production_id' => $production->id,
                    'raw_material_id' => $material->id,
                    'planned_quantity' => $plannedQty,
                    'actual_quantity' => $actualQty,
                    'unit_cost' => $unitCost,
                    'total_cost' => $totalCost,
                    'waste_quantity' => $wasteQty,
                    'notes' => $production->status === 'completed' ? 
                        'Production completed successfully' : 
                        ($production->status === 'in_progress' ? 'Production in progress' : 'Planned production'),
                ]);
            }

            // Update production cost based on material costs
            $totalProductionCost = $production->productionDetails()->sum('total_cost');
            $production->update(['production_cost' => $totalProductionCost]);
        }
        }

        // Create a production manager user if not exists
        if (!User::where('email', 'production@example.com')->exists()) {
            User::create([
                'name' => 'Production Manager',
                'email' => 'production@example.com',
                'password' => bcrypt('password123'),
                'role' => 'production_manager',
                'is_active' => true,
            ]);
        }

        $this->command->info('Production Manager data seeded successfully!');
        $this->command->info('- Raw Materials: ' . RawMaterial::count());
        $this->command->info('- Production Details: ' . ProductionDetail::count());
        $this->command->info('- Production Manager User: production@example.com / password123');
    }
}