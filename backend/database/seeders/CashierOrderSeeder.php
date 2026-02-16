<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\User;
use Carbon\Carbon;

class CashierOrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing orders
        \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Order::truncate();
        OrderItem::truncate();
        Payment::truncate();
        \DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        
        // Get cashier user
        $cashier = User::where('role', 'cashier')->first();

        if (!$cashier) {
            echo "❌ Cashier user not found. Please run user seeders first.\n";
            return;
        }

        // Real products from your system - WHOLESALE/INDUSTRIAL PRICING
        // All products sold by CARTONS for B2B customers
        $products = [
            [
                'name' => 'Wheat Flour',
                'price' => 2500, // ETB per carton
                'unit' => 'Carton (20 bags × 25kg = 500kg)',
                'carton_weight' => 500, // kg
                'packs_per_carton' => 20,
            ],
            [
                'name' => 'Maize Flour',
                'price' => 2800, // ETB per carton
                'unit' => 'Carton (20 bags × 25kg = 500kg)',
                'carton_weight' => 500, // kg
                'packs_per_carton' => 20,
            ],
            [
                'name' => 'Macaroni',
                'price' => 1200, // ETB per carton
                'unit' => 'Carton (24 packs × 500g = 12kg)',
                'carton_weight' => 12, // kg
                'packs_per_carton' => 24,
            ],
            [
                'name' => 'Spaghetti',
                'price' => 1300, // ETB per carton
                'unit' => 'Carton (24 packs × 500g = 12kg)',
                'carton_weight' => 12, // kg
                'packs_per_carton' => 24,
            ],
            [
                'name' => 'Biscuits',
                'price' => 800, // ETB per carton
                'unit' => 'Carton (48 packs × 200g = 9.6kg)',
                'carton_weight' => 9.6, // kg
                'packs_per_carton' => 48,
            ],
        ];

        $orderCount = 0;
        $itemCount = 0;
        $paymentCount = 0;

        // B2B Customer types for wholesale orders
        $customerTypes = [
            'Distributors' => ['Addis Distribution Center', 'Hawassa Wholesale', 'Bahir Dar Traders', 'Mekelle Supply Co.'],
            'Retailers' => ['Sheger Supermarket', 'Bole Grocery Store', 'Merkato Food Shop', 'Piassa Mini Market'],
            'Exporters' => ['East Africa Export Ltd', 'Horn Trading Company', 'Red Sea Logistics'],
            'Institutions' => ['Ethiopian Airlines Catering', 'Addis Ababa University', 'Millennium Hall'],
        ];

        // Create orders for the last 30 days (wholesale orders are less frequent but larger)
        for ($i = 0; $i < 30; $i++) {
            $date = Carbon::now()->subDays($i);
            
            // Create 2-5 wholesale orders per day (B2B orders are less frequent)
            $ordersPerDay = rand(2, 5);
            
            for ($j = 0; $j < $ordersPerDay; $j++) {
                $customerType = array_rand($customerTypes);
                $customerName = $customerTypes[$customerType][array_rand($customerTypes[$customerType])];
                
                $orderType = ['wholesale', 'distributor', 'export', 'institutional'][rand(0, 3)];
                $status = $i === 0 ? ['pending', 'processing', 'ready', 'completed'][rand(0, 3)] : 'completed';
                
                // Calculate order totals (wholesale quantities)
                $subtotal = 0;
                $itemsInOrder = rand(2, 5); // Multiple products per order
                $orderItems = [];
                
                for ($k = 0; $k < $itemsInOrder; $k++) {
                    $product = $products[array_rand($products)];
                    $quantity = rand(10, 100); // 10-100 CARTONS per product (wholesale quantity)
                    $unitPrice = $product['price'];
                    $totalPrice = $quantity * $unitPrice;
                    $subtotal += $totalPrice;
                    
                    $orderItems[] = [
                        'product_name' => $product['name'],
                        'product_code' => strtoupper(substr($product['name'], 0, 3)) . '-CTN',
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'total_price' => $totalPrice,
                        'notes' => 'Unit: ' . $product['unit'],
                    ];
                }
                
                $taxAmount = $subtotal * 0.15; // 15% VAT for Ethiopia
                $discountAmount = $subtotal > 50000 ? ($subtotal * 0.05) : 0; // 5% discount for orders > 50,000 ETB
                $totalAmount = $subtotal + $taxAmount - $discountAmount;
                
                // Create order
                $order = Order::create([
                    'order_number' => 'WO-' . $date->format('Ymd') . '-' . str_pad($j + 1, 4, '0', STR_PAD_LEFT),
                    'cashier_id' => $cashier->id,
                    'customer_name' => $customerName,
                    'customer_phone' => '+251-9' . rand(10, 99) . '-' . rand(100000, 999999),
                    'order_type' => $orderType,
                    'status' => $status,
                    'subtotal' => $subtotal,
                    'tax_amount' => $taxAmount,
                    'discount_amount' => $discountAmount,
                    'total_amount' => $totalAmount,
                    'notes' => 'Customer Type: ' . $customerType . ' | Delivery: ' . ['Pickup', 'Factory Delivery', 'Third-party Logistics'][rand(0, 2)],
                    'order_date' => $date,
                    'created_at' => $date,
                    'updated_at' => $date,
                ]);

                $orderCount++;

                // Create order items
                foreach ($orderItems as $item) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_name' => $item['product_name'],
                        'product_code' => $item['product_code'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'total_price' => $item['total_price'],
                        'notes' => $item['notes'],
                        'created_at' => $date,
                        'updated_at' => $date,
                    ]);
                    $itemCount++;
                }

                // Create payment if order is completed
                if ($status === 'completed') {
                    $paymentMethod = ['bank_transfer', 'check', 'credit_terms'][rand(0, 2)];
                    
                    Payment::create([
                        'order_id' => $order->id,
                        'payment_method' => $paymentMethod,
                        'amount_paid' => $totalAmount,
                        'change_amount' => 0,
                        'status' => 'completed',
                        'transaction_id' => 'TXN-' . $date->format('Ymd') . '-' . rand(10000, 99999),
                        'payment_date' => $date,
                        'notes' => $paymentMethod === 'bank_transfer' ? 'Bank: Commercial Bank of Ethiopia' : ($paymentMethod === 'check' ? 'Check cleared' : '30-day credit terms'),
                        'created_at' => $date,
                        'updated_at' => $date,
                    ]);
                    $paymentCount++;
                }
            }
        }

        echo "✅ Created $orderCount wholesale orders\n";
        echo "✅ Created $itemCount order items\n";
        echo "✅ Created $paymentCount payments\n";
        echo "\n📦 Yetebaberut Food Complex - Products (Wholesale Pricing):\n";
        foreach ($products as $product) {
            echo "   - {$product['name']}: {$product['price']} ETB per {$product['unit']}\n";
        }
        echo "\n✅ Industrial/Wholesale order data ready!\n";
        echo "💼 B2B Customers: Distributors, Retailers, Exporters, Institutions\n";
    }
}
