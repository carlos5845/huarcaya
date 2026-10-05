<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleLine;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'view_sales', 'guard_name' => 'web']);
    $superAdminRole->givePermissionTo('view_sales');

    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Inversiones Huarcaya',
        'business_name' => 'INVERSIONES HUARCAYA S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20601234567',
        'address' => 'Av. Automotriz 123',
    ]);

    $this->user = User::factory()->create(['company_id' => $this->company->id, 'status' => 'ACTIVE']);
    $this->user->assignRole('Super Admin');

    $this->branch = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sede Central',
        'address' => 'Av. Principal 100',
        'phone' => '999888777',
        'status' => 'ACTIVE',
    ]);

    $this->customer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'legal_name' => 'Transportes San Pedro S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20555666777',
        'status' => 'ACTIVE',
        'created_by' => $this->user->id,
    ]);

    $unit = Unit::create(['uuid' => (string) Str::uuid(), 'company_id' => $this->company->id, 'name' => 'Pieza', 'code' => 'PZA']);

    $this->product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Bomba Hidráulica 12V',
        'normalized_name' => 'bomba hidraulica 12v',
        'primary_reference' => 'BMB-001',
        'normalized_reference' => 'bmb-001',
        'internal_code' => 'SKU-BMB-1',
        'product_type' => 'STANDARD',
        'unit_id' => $unit->id,
        'status' => 'ACTIVE',
        'created_by' => $this->user->id,
    ]);

    $this->sale = Sale::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'sale_number' => 'TK-202610-001',
        'sale_type' => 'BOLETA',
        'payment_type' => 'CASH',
        'payment_status' => 'PAID',
        'customer_name_snapshot' => 'Transportes San Pedro S.A.C.',
        'customer_document_snapshot' => '20555666777',
        'operation_date' => now()->toDateString(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1.0,
        'status' => 'CONFIRMED',
        'subtotal_amount' => 100.0,
        'tax_amount' => 18.0,
        'total_amount' => 118.0,
        'created_by' => $this->user->id,
    ]);

    SaleLine::create([
        'uuid' => (string) Str::uuid(),
        'sale_id' => $this->sale->id,
        'product_id' => $this->product->id,
        'product_type_snapshot' => 'STANDARD',
        'product_reference_snapshot' => 'BMB-001',
        'product_name_snapshot' => 'Bomba Hidráulica 12V',
        'quantity' => 1,
        'unit_price' => 118.0,
        'unit_cost_base' => 80.0,
        'line_subtotal' => 100.0,
        'tax_amount' => 18.0,
        'line_total' => 118.0,
    ]);
});

it('can render sales ticket in 80mm format with brand logo and company details', function () {
    $response = $this->actingAs($this->user)
        ->get(route('sales.print.ticket', $this->sale));

    $response->assertOk()
        ->assertViewIs('sales.print.ticket-80mm')
        ->assertSee('logo-text.png')
        ->assertSee('INVERSIONES HUARCAYA S.A.C.')
        ->assertSee('TK-202610-001')
        ->assertSee('Transportes San Pedro S.A.C.')
        ->assertSee('Bomba Hidráulica 12V')
        ->assertSee('118.00');
});

it('can render sales a4 official format with brand logo and company details', function () {
    $response = $this->actingAs($this->user)
        ->get(route('sales.print.a4', $this->sale));

    $response->assertOk()
        ->assertViewIs('sales.print.a4')
        ->assertSee('logo-text.png')
        ->assertSee('INVERSIONES HUARCAYA S.A.C.')
        ->assertSee('BOLETA DE VENTA ELECTRÓNICA')
        ->assertSee('TK-202610-001')
        ->assertSee('Transportes San Pedro S.A.C.')
        ->assertSee('Bomba Hidráulica 12V')
        ->assertSee('SON: CIENTO DIECIOCHO CON 00/100 SOLES')
        ->assertSee('118.00');
});

it('forbids unauthorized users from printing sales from other companies', function () {
    $otherCompany = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Otra Empresa',
        'business_name' => 'OTRA EMPRESA S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20999999999',
    ]);

    $otherUser = User::factory()->create([
        'company_id' => $otherCompany->id,
        'status' => 'ACTIVE',
    ]);
    // Regular role, not Super Admin
    $role = Role::firstOrCreate(['name' => 'Vendedor', 'guard_name' => 'web']);
    $role->givePermissionTo('view_sales');
    $otherUser->assignRole('Vendedor');

    $this->actingAs($otherUser)
        ->get(route('sales.print.a4', $this->sale))
        ->assertForbidden();
});
