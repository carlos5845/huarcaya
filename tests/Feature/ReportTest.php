<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\DailyClosing;
use App\Models\DailyClosingVersion;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'view_reports', 'guard_name' => 'web']);
    $superAdminRole->givePermissionTo('view_reports');

    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Inversiones Huarcaya',
        'business_name' => 'INVERSIONES HUARCAYA S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20601234567',
    ]);

    $this->user = User::factory()->create([
        'company_id' => $this->company->id,
        'status' => 'ACTIVE',
    ]);
    $this->user->assignRole('Super Admin');

    $this->branchA = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Central',
        'address' => 'Av. Los Ficus 123',
        'status' => 'ACTIVE',
    ]);

    $this->branchB = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Sur',
        'address' => 'Av. El Sol 456',
        'status' => 'ACTIVE',
    ]);

    $this->customer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'legal_name' => 'Comercializadora Lima S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20123456789',
        'status' => 'ACTIVE',
        'created_by' => $this->user->id,
    ]);

    $this->sale = Sale::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branchA->id,
        'customer_id' => $this->customer->id,
        'sale_number' => 'BOL-001-000001',
        'sale_type' => 'BOLETA',
        'payment_type' => 'CASH',
        'operation_date' => now(),
        'subtotal_amount' => 100.00,
        'tax_amount' => 18.00,
        'total_amount' => 118.00,
        'status' => 'CONFIRMED',
        'customer_name_snapshot' => 'Comercializadora Lima S.A.C.',
        'customer_document_snapshot' => '20123456789',
        'created_by' => $this->user->id,
    ]);
});

test('un usuario con permiso view_reports puede acceder al centro de reportes', function () {
    $response = $this->actingAs($this->user)->get('/reports');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('reports/index')
        ->where('report_type', 'sales')
        ->has('report')
        ->has('report.kpis')
        ->has('report.columns')
        ->has('report.rows.data', 1)
        ->where('is_super_admin', true)
    );
});

test('se pueden consultar diferentes tipos de reportes del catálogo', function () {
    $reportTypes = [
        'branch_inventory',
        'consolidated_inventory',
        'kardex',
        'inventory_exits',
        'purchases',
        'payments',
        'receivables',
        'transfers',
        'daily_closings',
        'offline_operations',
        'conflicts',
    ];

    foreach ($reportTypes as $type) {
        $response = $this->actingAs($this->user)->get("/reports?type={$type}");
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('reports/index')
            ->where('report_type', $type)
            ->has('report.title')
            ->has('report.columns')
            ->has('report.rows')
        );
    }
});

test('el sistema permite exportar cualquier reporte a Excel (.xlsx)', function () {
    $response = $this->actingAs($this->user)->get('/reports/export/sales');

    $response->assertOk();
    expect($response->headers->get('content-type'))->toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($response->headers->get('content-disposition'))->toContain('Reporte_sales_');
});

test('el sistema renderiza la vista imprimible A4 compatible con visor modal integrado', function () {
    $response = $this->actingAs($this->user)->get('/reports/print/sales');

    $response->assertOk();
    $response->assertViewIs('reports.print.general-a4');
    $response->assertSee('INVERSIONES HUARCAYA S.A.C.');
    $response->assertSee('BOL-001-000001');
    $response->assertSee('Comercializadora Lima S.A.C.');
});

test('un usuario no-admin no puede consultar reportes de una sucursal no asignada (403)', function () {
    $storeAdminRole = Role::firstOrCreate(['name' => 'Administrador de Tienda', 'guard_name' => 'web']);
    $storeAdminRole->givePermissionTo('view_reports');

    $branchUser = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branchA->id,
        'status' => 'ACTIVE',
    ]);
    $branchUser->assignRole('Administrador de Tienda');
    $branchUser->branches()->attach($this->branchA->id);

    // Intento de consultar sucursal ajena (Branch B)
    $response = $this->actingAs($branchUser)->get("/reports?branch_id={$this->branchB->id}");
    $response->assertForbidden();

    // Intento de exportar sucursal ajena
    $exportResponse = $this->actingAs($branchUser)->get("/reports/export/sales?branch_id={$this->branchB->id}");
    $exportResponse->assertForbidden();

    // Intento de imprimir sucursal ajena
    $printResponse = $this->actingAs($branchUser)->get("/reports/print/sales?branch_id={$this->branchB->id}");
    $printResponse->assertForbidden();
});

test('el reporte de cierres diarios carga correctamente con arqueos y versiones', function () {
    $closing = DailyClosing::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'closing_date' => now()->format('Y-m-d'),
        'status' => 'CLOSED',
        'opened_at' => now()->startOfDay(),
        'closed_at' => now(),
        'opened_by' => $this->user->id,
        'closed_by' => $this->user->id,
    ]);

    DailyClosingVersion::create([
        'uuid' => (string) Str::uuid(),
        'daily_closing_id' => $closing->id,
        'version_number' => 1,
        'snapshot_data' => ['sales' => 500],
        'total_expected' => 500.00,
        'total_counted' => 500.00,
        'total_difference' => 0.00,
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->get('/reports?type=daily_closings');
    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('reports/index')
        ->where('report_type', 'daily_closings')
        ->has('report.rows.data', 1)
        ->where('report.rows.data.0.status', 'CLOSED')
        ->where('report.rows.data.0.sales', 500)
    );

    $exportResponse = $this->actingAs($this->user)->get('/reports/export/daily_closings');
    $exportResponse->assertOk();
});
