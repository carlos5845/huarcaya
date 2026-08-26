<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\User;
use App\Models\UserBranch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index()
    {
        $activeSessionTime = now()->subMinutes(config('session.lifetime', 120))->getTimestamp();
        $activeUserIds = \Illuminate\Support\Facades\DB::table('sessions')
            ->whereNotNull('user_id')
            ->where('last_activity', '>=', $activeSessionTime)
            ->pluck('user_id')
            ->toArray();

        $users = User::with(['roles', 'defaultBranch'])->get()->map(function ($user) use ($activeUserIds) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'last_name' => $user->last_name,
                'mother_last_name' => $user->mother_last_name,
                'dni' => $user->dni,
                'phone' => $user->phone,
                'email' => $user->email,
                'status' => $user->status,
                'role' => $user->roles->first()?->name,
                'branch_id' => $user->default_branch_id,
                'branch_name' => $user->defaultBranch?->name,
                'dni_ubigeo' => $user->dni_ubigeo,
                'dni_expiration_date' => $user->dni_expiration_date ? $user->dni_expiration_date->format('Y-m-d') : null,
                'last_login_at' => $user->last_login_at,
                'is_online' => in_array($user->id, $activeUserIds),
            ];
        });

        $roles = Role::with('permissions')->get()->map(function($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name'),
            ];
        });
        $branches = Branch::where('status', 'ACTIVE')->get(['id', 'name']);

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
            'branches' => $branches,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'dni' => ['required', 'string', 'size:8', 'unique:users,dni'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'unique:users,email'],
            'role' => ['required', 'string', 'exists:roles,name'],
            'branch_id' => ['required', 'exists:branches,id'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $companyId = Auth::user()->company_id;

        $user = User::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'default_branch_id' => $validated['branch_id'],
            'name' => $validated['name'],
            'last_name' => $validated['last_name'] ?? null,
            'mother_last_name' => $validated['mother_last_name'] ?? null,
            'username' => $validated['dni'],
            'dni' => $validated['dni'],
            'phone' => $validated['phone'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['dni']),
            'status' => $validated['status'],
            'must_change_password' => true,
        ]);

        $user->assignRole($validated['role']);

        UserBranch::create([
            'user_id' => $user->id,
            'branch_id' => $validated['branch_id'],
            'is_default' => true,
            'status' => 'ACTIVE',
        ]);

        return back()->with('success', 'Usuario creado correctamente.');
    }

        public function update(Request $request, User $user)
    {
        if ($user->hasRole('Super Admin') && $request->input('role') !== 'Super Admin') {
            return back()->with('error', 'No se puede quitar el rol de Super Admin a este usuario.');
        }

        if ($user->hasRole('Super Admin') && $request->input('status') === 'INACTIVE') {
            return back()->with('error', 'No se puede desactivar a un Super Admin.');
        }
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'dni' => ['required', 'string', 'size:8', Rule::unique('users')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', Rule::unique('users')->ignore($user->id)],
            'role' => ['required', 'string', 'exists:roles,name'],
            'branch_id' => ['required', 'exists:branches,id'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $user->update([
            'name' => $validated['name'],
            'last_name' => $validated['last_name'] ?? null,
            'mother_last_name' => $validated['mother_last_name'] ?? null,
            'username' => $validated['dni'],
            'dni' => $validated['dni'],
            'phone' => $validated['phone'],
            'email' => $validated['email'],
            'default_branch_id' => $validated['branch_id'],
            'status' => $validated['status'],
        ]);

        $user->syncRoles([$validated['role']]);

        // Eliminar las otras sucursales asignadas anteriormente (el sistema actual permite 1 sucursal principal)
        \App\Models\UserBranch::where('user_id', $user->id)
            ->where('branch_id', '!=', $validated['branch_id'])
            ->delete();

        \App\Models\UserBranch::updateOrCreate(
            ['user_id' => $user->id, 'branch_id' => $validated['branch_id']],
            ['is_default' => true, 'status' => 'ACTIVE']
        );

        return back()->with('success', 'Usuario actualizado correctamente.');
    }

        public function destroy(User $user)
    {
        if ($user->hasRole('Super Admin')) {
            return back()->with('error', 'No se puede modificar el estado de un Super Admin.');
        }
        $user->update([
            'status' => $user->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        ]);

        return back()->with('success', 'Estado del usuario modificado correctamente.');
    }
}
