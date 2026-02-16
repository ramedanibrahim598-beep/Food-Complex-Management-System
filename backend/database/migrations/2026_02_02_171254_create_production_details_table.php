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
        Schema::create('production_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_id')->constrained('productions')->onDelete('cascade');
            $table->foreignId('raw_material_id')->constrained('raw_materials')->onDelete('cascade');
            $table->decimal('planned_quantity', 10, 2); // Planned usage
            $table->decimal('actual_quantity', 10, 2)->nullable(); // Actual usage
            $table->decimal('unit_cost', 8, 2); // Cost per unit at time of production
            $table->decimal('total_cost', 10, 2); // Total cost for this material
            $table->decimal('waste_quantity', 10, 2)->default(0); // Material waste
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_details');
    }
};