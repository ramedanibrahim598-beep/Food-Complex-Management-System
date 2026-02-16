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
        Schema::create('productions', function (Blueprint $table) {
            $table->id();
            $table->string('product_name');
            $table->string('batch_number')->unique();
            $table->integer('quantity_produced');
            $table->integer('quantity_target');
            $table->decimal('production_cost', 10, 2);
            $table->string('production_line');
            $table->string('shift'); // morning, afternoon, night
            $table->string('status')->default('in_progress'); // in_progress, completed, failed
            $table->date('production_date');
            $table->time('start_time');
            $table->time('end_time')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['production_date', 'status']);
            $table->index(['product_name', 'production_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productions');
    }
};
