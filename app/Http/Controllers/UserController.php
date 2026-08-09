<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Branch;
use App\Models\UserBranch;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with(['roles', 'defaultBranch'])->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'dni' => $user->dni,
                'phone' => $user->phone,
                'email' => $user->email,
                'status' => $user->status,
                'role' => $user->roles->first()?->name,
                'branch_id' => $user->default_branch_id,
                'branch_name' => $user->defaultBranch?->name,
                'last_login_at' => $user->last_login_at,
            ];
        });

        $roles = Role::all()->pluck('name');
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
            'username' => $validated['dni'],
            'dni' => $validated['dni'],
            'phone' => $validated['phone'],
            'email' => $validated['email'],
            'default_branch_id' => $validated['branch_id'],
            'status' => $validated['status'],
        ]);

        $user->syncRoles([$validated['role']]);

        UserBranch::updateOrCreate(
            ['user_id' => $user->id, 'branch_id' => $validated['branch_id']],
            ['is_default' => true, 'status' => 'ACTIVE']
        );

        return back()->with('success', 'Usuario actualizado correctamente.');
    }

    public function destroy(User $user)
    {
        $user->update([
            'status' => $user->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        ]);

        return back()->with('success', 'Estado del usuario modificado correctamente.');
    }
}
