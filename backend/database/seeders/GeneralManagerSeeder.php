<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class GeneralManagerSeeder extends Seeder
{
    public function run(): void
    {
        $generalManager = User::updateOrCreate(
            ['email' => 'manager@example.com'],
            [
                'name' => 'General Manager',
                'email' => 'manager@example.com',
                'password' => Hash::make('password123'),
                'role' => 'general_manager',
                'email_verified_at' => now(),
            ]
        );

        echo "✅ General Manager user created:\n";
        echo "   Email: manager@example.com\n";
        echo "   Password: password123\n";
        echo "   Role: general_manager\n";
    }
}
