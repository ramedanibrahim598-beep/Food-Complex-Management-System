<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_daily_reports', function (Blueprint $table) {
            $table->id();
            $table->date('report_date');
            $table->integer('total_batches')->default(0);
            $table->integer('completed_batches')->default(0);
            $table->integer('in_progress_batches')->default(0);
            $table->decimal('total_produced', 12, 2)->default(0);
            $table->decimal('total_target', 12, 2)->default(0);
            $table->decimal('efficiency', 5, 2)->default(0);
            $table->text('issues')->nullable();
            $table->text('recommendations')->nullable();
            $table->foreignId('submitted_by_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            // Ensure one report per date per user
            $table->unique(['report_date', 'submitted_by_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_daily_reports');
    }
};
