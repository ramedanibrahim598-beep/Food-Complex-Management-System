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
        // Add production_manager to the role enum
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'system_admin', 'production_manager') DEFAULT 'user'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove production_manager from the role enum
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'system_admin') DEFAULT 'user'");
    }
};