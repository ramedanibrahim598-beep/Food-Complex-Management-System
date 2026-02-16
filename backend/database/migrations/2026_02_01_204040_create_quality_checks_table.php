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
        Schema::create('quality_checks', function (Blueprint $table) {
            $table->id();
            $table->string('check_number')->unique();
            $table->string('product_name');
            $table->string('batch_number');
            $table->string('check_type'); // incoming, in_process, final, random
            $table->string('test_parameter'); // weight, temperature, ph, moisture, etc.
            $table->decimal('expected_value', 8, 3);
            $table->decimal('actual_value', 8, 3);
            $table->decimal('tolerance_min', 8, 3);
            $table->decimal('tolerance_max', 8, 3);
            $table->string('result'); // pass, fail, warning
            $table->string('status')->default('pending'); // pending, completed, reviewed
            $table->date('check_date');
            $table->time('check_time');
            $table->text('observations')->nullable();
            $table->text('corrective_actions')->nullable();
            $table->string('equipment_used')->nullable();
            $table->foreignId('inspector_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('production_id')->nullable()->constrained('productions')->onDelete('cascade');
            $table->timestamps();

            $table->index(['check_date', 'result']);
            $table->index(['product_name', 'check_date']);
            $table->index(['batch_number', 'check_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quality_checks');
    }
};
