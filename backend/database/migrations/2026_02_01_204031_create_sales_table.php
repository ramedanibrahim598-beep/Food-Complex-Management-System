<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->string('customer_name');
            $table->string('customer_email')->nullable();
            $table->string('product_name');
            $table->integer('quantity_sold');
            $table->decimal('unit_price', 8, 2);
            $table->decimal('total_amount', 10, 2);
            $table->decimal('discount_amount', 8, 2)->default(0);
            $table->decimal('final_amount', 10, 2);
            $table->string('payment_method'); // cash, card, bank_transfer
            $table->string('payment_status')->default('pending'); // pending, paid, refunded
            $table->string('order_status')->default('processing'); // processing, shipped, delivered, cancelled
            $table->date('sale_date');
            $table->date('delivery_date')->nullable();
            $table->string('sales_channel'); // online, store, phone
            $table->string('region')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('salesperson_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['sale_date', 'order_status']);
            $table->index(['customer_name', 'sale_date']);
            $table->index(['product_name', 'sale_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
