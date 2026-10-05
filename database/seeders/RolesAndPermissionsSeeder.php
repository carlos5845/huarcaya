<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define all permissions
        $permissions = [
            'view_dashboard',
            'view_users',
            'view_branches',
            'view_customers',
            'view_suppliers',
            'view_products',
            'view_inventory',
            'view_inventory_general',
            'view_purchases',
            'view_sales',
            'view_transfers',
            'view_adjustments',
            'view_kardex',
            'view_import',
            'view_conflicts',
            'view_closings',
            'view_alerts',
            'view_reports',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // 2. Create roles and assign permissions

        // Super Admin gets all permissions
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::all());

        // Administrador de Tienda gets all EXCEPT users and branches
        $storeAdmin = Role::firstOrCreate(['name' => 'Administrador de Tienda', 'guard_name' => 'web']);
        $storeAdminPermissions = Permission::whereNotIn('name', ['view_users', 'view_branches'])->get();
        $storeAdmin->syncPermissions($storeAdminPermissions);

        // Gerente gets all EXCEPT users and branches (same as store admin)
        $gerente = Role::firstOrCreate(['name' => 'Gerente', 'guard_name' => 'web']);
        $gerente->syncPermissions($storeAdminPermissions);

        $contador = Role::firstOrCreate(['name' => 'Contador', 'guard_name' => 'web']);
        $contador->syncPermissions([]); // No permissions selected

        // Other existing roles (kept for consistency)
        $cajero = Role::firstOrCreate(['name' => 'Cajero', 'guard_name' => 'web']);
        $cajero->syncPermissions(Permission::whereIn('name', ['view_dashboard', 'view_sales', 'view_customers', 'view_inventory', 'view_closings', 'view_reports'])->get());

        $almacenero = Role::firstOrCreate(['name' => 'Almacenero', 'guard_name' => 'web']);
        $almacenero->syncPermissions(Permission::whereIn('name', ['view_dashboard', 'view_inventory', 'view_transfers', 'view_adjustments', 'view_kardex', 'view_products', 'view_alerts', 'view_reports'])->get());
    }
}
