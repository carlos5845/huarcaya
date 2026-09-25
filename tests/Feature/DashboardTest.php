<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Permission::firstOrCreate(['name' => 'view_dashboard', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $cajeroRole = Role::firstOrCreate(['name' => 'Cajero', 'guard_name' => 'web']);
    $cajeroRole->givePermissionTo('view_dashboard');

    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Empresa Test',
        'document_type' => 'RUC',
        'document_number' => '12345678901',
    ]);

    $this->branch = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Central',
        'address' => 'Av. Central 123',
        'phone' => '999888777',
        'status' => 'ACTIVE',
    ]);

    $this->unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Unidad',
        'code' => 'NIU',
    ]);
});

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('admin user visits dashboard with executive metrics, company expenses and all branches', function () {
    $admin = User::factory()->create([
        'company_id' => $this->company->id,
        'status' => 'ACTIVE',
        'default_branch_id' => $this->branch->id,
    ]);
    $admin->assignRole('Super Admin');

    Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'unit_id' => $this->unit->id,
        'internal_code' => 'PROD-001',
        'primary_reference' => 'REF-001',
        'normalized_reference' => 'ref001',
        'name' => 'Filtro de Aceite',
        'normalized_name' => 'filtro de aceite',
        'unit_type' => 'NIU',
        'is_active' => true,
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('dashboard'));
    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('is_admin', true)
        ->has('stats.revenue_this_month')
        ->has('stats.expenses_this_month')
        ->has('stats.sales_count_this_month')
        ->has('stats.products_count')
        ->where('stats.products_count', 1)
        ->has('chartData')
        ->has('recentSales')
        ->has('branches')
    );
});

test('normal user visits dashboard with personal metrics and without company expenses', function () {
    $cajero = User::factory()->create([
        'company_id' => $this->company->id,
        'status' => 'ACTIVE',
        'default_branch_id' => $this->branch->id,
    ]);
    $cajero->assignRole('Cajero');

    $customer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'document_type' => 'DNI',
        'document_number' => '77889900',
        'legal_name' => 'Cliente Mostrador',
        'status' => 'ACTIVE',
    ]);

    Sale::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branch->id,
        'customer_id' => $customer->id,
        'customer_name_snapshot' => $customer->legal_name,
        'sale_type' => 'DIRECT',
        'sale_number' => 'V-000001',
        'operation_date' => now(),
        'currency_code' => 'PEN',
        'subtotal_amount' => 100,
        'tax_amount' => 18,
        'total_amount' => 118,
        'status' => 'CONFIRMED',
        'created_by' => $cajero->id,
    ]);

    $this->actingAs($cajero);

    $response = $this->get(route('dashboard'));
    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('is_admin', false)
        ->where('stats.my_revenue_this_month', 118)
        ->where('stats.my_revenue_today', 118)
        ->where('stats.my_sales_count_this_month', 1)
        ->missing('stats.expenses_this_month')
        ->has('chartData')
        ->has('recentSales')
    );
});
