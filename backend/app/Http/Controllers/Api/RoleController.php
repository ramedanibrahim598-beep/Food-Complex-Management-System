<?php

namespace App\Http\Controllers\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RoleController extends BaseController
{
    /**
     * Get all available roles
     */
    public function index()
    {
        $roles = Role::where('is_active', true)
            ->orderBy('display_name')
            ->get(['name', 'display_name', 'description'])
            ->map(function ($role) {
                return [
                    'value' => $role->name,
                    'label' => $role->display_name,
                    'description' => $role->description,
                ];
            })
            ->values();

        return $this->sendResponse($roles, 'Roles retrieved successfully');
    }

    /**
     * Assign role to user
     */
    public function assignRole(Request $request, $userId)
    {
        $allowedRoles = [
            'user',
            'admin',
            'system_admin',
            'production_manager',
            'quality_controller',
            'cashier',
            'general_manager',
        ];

        $validator = Validator::make($request->all(), [
            'role' => 'required|in:' . implode(',', $allowedRoles),
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error', $validator->errors(), 422);
        }

        $user = User::find($userId);
        
        if (!$user) {
            return $this->sendError('User not found', [], 404);
        }

        $user->update(['role' => $request->role]);

        return $this->sendResponse([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ], 'Role assigned successfully');
    }

    /**
     * Get users by role
     */
    public function getUsersByRole($role)
    {
        $allowedRoles = [
            'user',
            'admin',
            'system_admin',
            'production_manager',
            'quality_controller',
            'cashier',
            'general_manager',
        ];

        if (!in_array($role, $allowedRoles, true)) {
            return $this->sendError('Invalid role', [], 400);
        }

        $users = User::where('role', $role)
                    ->select('id', 'name', 'email', 'role', 'is_active', 'created_at')
                    ->orderBy('created_at', 'desc')
                    ->get();

        return $this->sendResponse($users, "Users with role '{$role}' retrieved successfully");
    }

    /**
     * Get role statistics
     */
    public function getRoleStats()
    {
        $stats = [
            'system_admin' => User::where('role', 'system_admin')->count(),
            'admin' => User::where('role', 'admin')->count(),
            'user' => User::where('role', 'user')->count(),
            'production_manager' => User::where('role', 'production_manager')->count(),
            'quality_controller' => User::where('role', 'quality_controller')->count(),
            'cashier' => User::where('role', 'cashier')->count(),
            'general_manager' => User::where('role', 'general_manager')->count(),
            'total' => User::count(),
            'active' => User::where('is_active', true)->count(),
            'inactive' => User::where('is_active', false)->count(),
        ];

        return $this->sendResponse($stats, 'Role statistics retrieved successfully');
    }
}
