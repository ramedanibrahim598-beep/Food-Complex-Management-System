<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'name' => 'system_admin',
                'display_name' => 'System Administrator',
                'description' => 'Responsible for managing user accounts, roles, permissions, and system settings.',
                'permissions' => [
                    'view_profile',
                    'edit_profile',
                    'change_password',
                    'manage_users',
                    'manage_roles',
                    'manage_permissions',
                    'manage_system_settings',
                    'view_system_logs',
                    'manage_backups'
                ],
                'is_active' => true,
            ],
            [
                'name' => 'production_manager',
                'display_name' => 'Production Manager',
                'description' => 'Oversees production planning, scheduling, and batch execution.',
                'permissions' => [
                    'view_profile',
                    'edit_profile',
                    'change_password',
                    'create_production_batches',
                    'schedule_production_batches',
                    'monitor_production_progress',
                    'update_production_status',
                    'manage_production_materials',
                    'view_production_reports',
                    'view_inventory'
                ],
                'is_active' => true,
            ],
            [
                'name' => 'quality_controller',
                'display_name' => 'Quality Controller',
                'description' => 'Ensures products meet quality standards before release.',
                'permissions' => [
                    'view_profile',
                    'edit_profile',
                    'change_password',
                    'inspect_products',
                    'inspect_batches',
                    'record_quality_results',
                    'report_quality_issues',
                    'manage_quality_checks',
                    'view_quality_reports'
                ],
                'is_active' => true,
            ],
            [
                'name' => 'cashier',
                'display_name' => 'Cashier',
                'description' => 'Manages sales transactions, billing, and receipt generation.',
                'permissions' => [
                    'view_profile',
                    'edit_profile',
                    'change_password',
                    'process_customer_sales',
                    'generate_invoices',
                    'generate_receipts',
                    'update_inventory_after_sale',
                    'manage_orders',
                    'process_payments',
                    'view_cashier_reports'
                ],
                'is_active' => true,
            ],
            [
                'name' => 'general_manager',
                'display_name' => 'General Manager',
                'description' => 'Oversees major approvals, business reports, and performance metrics.',
                'permissions' => [
                    'view_profile',
                    'edit_profile',
                    'change_password',
                    'review_production_reports',
                    'review_quality_reports',
                    'approve_large_transactions',
                    'approve_system_changes',
                    'monitor_key_performance_metrics',
                    'view_operational_dashboard',
                    'view_reports'
                ],
                'is_active' => true,
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['name' => $role['name']],
                $role
            );
        }
    }
}
