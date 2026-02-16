<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update order_type enum to support wholesale business model
        DB::statement("ALTER TABLE orders MODIFY COLUMN order_type ENUM('dine_in', 'takeout', 'delivery', 'wholesale', 'distributor', 'export', 'institutional') DEFAULT 'wholesale'");
        
        // Update status enum to support wholesale processing
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled', 'processing', 'shipped', 'delivered') DEFAULT 'pending'");
        
        // Update payment_method enum in payments table to support B2B payments
        DB::statement("ALTER TABLE payments MODIFY COLUMN payment_method ENUM('cash', 'card', 'digital_wallet', 'bank_transfer', 'check', 'credit_terms') DEFAULT 'bank_transfer'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original retail values
        DB::statement("ALTER TABLE orders MODIFY COLUMN order_type ENUM('dine_in', 'takeout', 'delivery') DEFAULT 'dine_in'");
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'pending'");
        DB::statement("ALTER TABLE payments MODIFY COLUMN payment_method ENUM('cash', 'card', 'digital_wallet') DEFAULT 'cash'");
    }
};
