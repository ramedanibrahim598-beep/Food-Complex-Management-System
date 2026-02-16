<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends BaseController
{
    private const ALLOWED_ROLES = [
        'user',
        'admin',
        'system_admin',
        'general_manager',
        'production_manager',
        'quality_controller',
        'cashier',
    ];

    private function roleValidationRule(): string
    {
        return 'in:' . implode(',', self::ALLOWED_ROLES);
    }

    /**
     * Get all users
     */
    public function index()
    {
        $users = User::select('id', 'name', 'email', 'role', 'is_active', 'created_at')
                    ->orderBy('created_at', 'desc')
                    ->get();

        return $this->sendResponse($users, 'Users retrieved successfully');
    }

    /**
     * Create new user
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|' . $this->roleValidationRule(),
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error', $validator->errors(), 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'is_active' => $request->is_active ?? true,
        ]);

        return $this->sendResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => $user->is_active,
            'created_at' => $user->created_at,
        ], 'User created successfully');
    }

    /**
     * Update user
     */
    public function update(Request $request, $id)
    {
        $user = User::find($id);
        
        if (!$user) {
            return $this->sendError('User not found', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
            'password' => 'sometimes|string|min:8',
            'role' => 'sometimes|' . $this->roleValidationRule(),
            'is_active' => 'sometimes|boolean'
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error', $validator->errors(), 422);
        }

        $updateData = $request->only(['name', 'email', 'role', 'is_active']);
        
        if ($request->has('password')) {
            $updateData['password'] = Hash::make($request->password);
        }

        $user->update($updateData);

        return $this->sendResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => $user->is_active,
            'created_at' => $user->created_at,
        ], 'User updated successfully');
    }

    /**
     * Delete user
     */
    public function destroy($id)
    {
        $user = User::find($id);
        
        if (!$user) {
            return $this->sendError('User not found', [], 404);
        }

        // Prevent deleting yourself
        if ($user->id === auth()->id()) {
            return $this->sendError('Cannot delete your own account', [], 400);
        }

        try {
            $user->delete();
        } catch (QueryException $exception) {
            return $this->sendError('Cannot delete user because related records exist. Deactivate the user instead.', [], 422);
        }

        return $this->sendResponse([], 'User deleted successfully');
    }

    /**
     * Reset user password
     */
    public function resetPassword(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error', $validator->errors(), 422);
        }

        $user = User::find($id);
        
        if (!$user) {
            return $this->sendError('User not found', [], 404);
        }

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        return $this->sendResponse([], 'Password reset successfully');
    }
}
