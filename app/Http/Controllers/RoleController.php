<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'permissions' => 'required|array',
        ]);

        $role = Role::create(['name' => $validated['name'], 'guard_name' => 'web']);

        $permissionsToSync = [];
        foreach ($validated['permissions'] as $permName => $isEnabled) {
            if ($isEnabled) {
                $permission = Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);
                $permissionsToSync[] = $permission->name;
            }
        }

        $role->syncPermissions($permissionsToSync);

        return back()->with('success', 'Rol creado exitosamente.');
    }

    public function update(Request $request, Role $role)
    {
        if ($role->name === 'Super Admin') {
            abort(403, 'Cannot edit Super Admin role.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
            'permissions' => 'required|array',
        ]);

        $role->update(['name' => $validated['name']]);

        $permissionsToSync = [];
        foreach ($validated['permissions'] as $permName => $isEnabled) {
            if ($isEnabled) {
                $permission = Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);
                $permissionsToSync[] = $permission->name;
            }
        }

        $role->syncPermissions($permissionsToSync);

        return back()->with('success', 'Rol actualizado exitosamente.');
    }

    public function destroy(Role $role)
    {
        if ($role->name === 'Super Admin') {
            abort(403, 'Cannot delete Super Admin role.');
        }

        if ($role->users()->exists()) {
            return back()->with('error', 'No se puede eliminar el rol porque tiene usuarios asignados.');
        }

        $role->delete();

        return back()->with('success', 'Rol eliminado exitosamente.');
    }
}
