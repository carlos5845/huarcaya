<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use App\Models\UserBranch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        // Limpiar caché de permisos
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Obtener Empresa principal
        $company = Company::first();
        if (! $company) {
            $company = Company::create([
                'uuid' => (string) Str::uuid(),
                'name' => 'Inversiones Huarcaya',
                'document_type' => 'RUC',
                'document_number' => '20123456789',
                'status' => 'ACTIVE',
            ]);
        }

        // 2. Obtener Sucursales de la empresa
        $branches = Branch::where('company_id', $company->id)->get();
        $defaultBranch = $branches->first() ?? Branch::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $company->id,
            'code' => 'SUC-001',
            'name' => 'Sede Central',
            'type' => 'STORE',
            'status' => 'ACTIVE',
        ]);

        // 3. Crear rol 'Demo' con todos los privilegios excepto el módulo de usuarios ('view_users')
        $demoRole = Role::firstOrCreate(['name' => 'Demo', 'guard_name' => 'web']);
        $allExceptUsers = Permission::where('name', '!=', 'view_users')->get();
        $demoRole->syncPermissions($allExceptUsers);

        // 4. Crear o actualizar usuario demo
        $user = User::updateOrCreate(
            ['dni' => '88888888'],
            [
                'uuid' => (string) Str::uuid(),
                'company_id' => $company->id,
                'default_branch_id' => $defaultBranch->id,
                'name' => 'demo',
                'username' => 'demo',
                'email' => 'demo@inversioneshuarcaya.com',
                'password' => Hash::make('12345678'),
                'status' => 'ACTIVE',
                'must_change_password' => false,
            ]
        );

        // 5. Asignar rol y permisos directos garantizando acceso a todo excepto módulo usuarios
        $user->syncRoles([$demoRole]);
        $user->syncPermissions($allExceptUsers);

        // 6. Asignar acceso a las sucursales
        if ($branches->isNotEmpty()) {
            foreach ($branches as $branch) {
                UserBranch::firstOrCreate([
                    'user_id' => $user->id,
                    'branch_id' => $branch->id,
                ], [
                    'is_default' => ($branch->id === $defaultBranch->id),
                    'status' => 'ACTIVE',
                ]);
            }
        } else {
            UserBranch::firstOrCreate([
                'user_id' => $user->id,
                'branch_id' => $defaultBranch->id,
            ], [
                'is_default' => true,
                'status' => 'ACTIVE',
            ]);
        }
    }
}
