<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use App\Models\UserBranch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Company
        $company = Company::firstOrCreate(
            ['document_number' => '20123456789'],
            [
                'uuid' => Str::uuid(),
                'name' => 'Mi Empresa Principal',
                'status' => 'ACTIVE',
            ]
        );

        // 2. Create Principal Branch
        $branch = Branch::firstOrCreate(
            ['code' => 'SUC-001', 'company_id' => $company->id],
            [
                'uuid' => Str::uuid(),
                'name' => 'Sede Central',
                'type' => 'STORE',
                'status' => 'ACTIVE',
            ]
        );

        // 3. Create Admin User
        $user = User::firstOrCreate(
            ['dni' => '12345678'],
            [
                'uuid' => Str::uuid(),
                'company_id' => $company->id,
                'default_branch_id' => $branch->id,
                'name' => 'Super Administrador',
                'password' => Hash::make('password123'),
                'status' => 'ACTIVE',
            ]
        );

        // 4. Assign Role
        if (! $user->hasRole('Super Admin')) {
            $user->assignRole('Super Admin');
        }

        // 5. Assign User to Branch
        UserBranch::firstOrCreate([
            'user_id' => $user->id,
            'branch_id' => $branch->id,
        ], [
            'is_default' => true,
            'status' => 'ACTIVE',
        ]);
    }
}
