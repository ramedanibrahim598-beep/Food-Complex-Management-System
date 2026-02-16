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
        // Add quality_controller to the role enum
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'system_admin', 'manager', 'production_manager', 'quality_controller') DEFAULT 'user'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove quality_controller from the role enum
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'system_admin', 'manager', 'production_manager') DEFAULT 'user'");
    }
};