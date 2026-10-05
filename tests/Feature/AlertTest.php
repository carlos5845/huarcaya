<?php

use App\Models\Alert;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductMinStock;
use App\Models\Receivable;
use App\Models\Unit;
use App\Models\User;
use App\Services\AlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'view_alerts', 'guard_name' => 'web']);
    $superAdminRole->givePermissionTo('view_alerts');

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
        'name' => 'Sucursal Principal',
        'address' => 'Av. Industrial 100',
        'status' => 'ACTIVE',
    ]);

    $this->branchB = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Norte',
        'address' => 'Av. Norte 200',
        'status' => 'ACTIVE',
    ]);

    $this->unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'NIU',
        'name' => 'Unidad',
        'sunat_code' => 'NIU',
    ]);

    $this->category = Category::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Filtros',
        'normalized_name' => 'filtros',
    ]);
});

test('un usuario autenticado con permiso view_alerts puede acceder a la bandeja de alertas', function () {
    $response = $this->actingAs($this->user)->get('/alerts');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('alerts/index')
        ->has('alerts')
        ->has('kpis')
        ->has('branches')
        ->where('is_super_admin', true)
    );
});

test('el servicio detecta alerta de producto agotado (OUT_OF_STOCK) y stock bajo (LOW_STOCK)', function () {
    $productAgotado = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'name' => 'Filtro de Aceite Hilux',
        'normalized_name' => 'filtro de aceite hilux',
        'primary_reference' => 'FILT-001',
        'normalized_reference' => 'FILT001',
        'status' => 'ACTIVE',
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $productAgotado->id,
        'physical_quantity' => 0,
        'available_quantity' => 0,
        'average_cost' => 15.00,
        'status' => 'ACTIVE',
    ]);

    $productBajo = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'name' => 'Bujía Iridium',
        'normalized_name' => 'bujia iridium',
        'primary_reference' => 'BUJ-002',
        'normalized_reference' => 'BUJ002',
        'status' => 'ACTIVE',
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $productBajo->id,
        'physical_quantity' => 3,
        'available_quantity' => 3,
        'average_cost' => 25.00,
        'status' => 'ACTIVE',
    ]);

    ProductMinStock::create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $productBajo->id,
        'branch_id' => $this->branchA->id,
        'minimum_quantity' => 10,
        'effective_from' => now(),
        'version' => 1,
        'status' => 'ACTIVE',
        'created_by' => $this->user->id,
    ]);

    $alertService = app(AlertService::class);
    $data = $alertService->getAlertsForUser($this->user);

    expect($data['kpis']['critical'])->toBeGreaterThanOrEqual(1);
    expect($data['kpis']['warning'])->toBeGreaterThanOrEqual(1);

    $alertTypes = collect($data['alerts']->items())->pluck('alert_type')->toArray();
    expect($alertTypes)->toContain('OUT_OF_STOCK');
    expect($alertTypes)->toContain('LOW_STOCK');
});

test('el sistema detecta alerta de cuenta por cobrar vencida (OVERDUE_RECEIVABLE)', function () {
    $customer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'legal_name' => 'Transportes Los Andes S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20555666777',
        'status' => 'ACTIVE',
        'created_by' => $this->user->id,
    ]);

    Receivable::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'customer_id' => $customer->id,
        'receivable_number' => 'CXC-2026-0001',
        'issue_date' => now()->subDays(45),
        'due_date' => now()->subDays(15), // Vencida hace 15 días
        'currency_code' => 'PEN',
        'original_amount' => 1500.00,
        'total_amount' => 1500.00,
        'paid_amount' => 500.00,
        'balance_amount' => 1000.00,
        'status' => 'ACTIVE',
    ]);

    $alertService = app(AlertService::class);
    $data = $alertService->getAlertsForUser($this->user);

    $alertTypes = collect($data['alerts']->items())->pluck('alert_type')->toArray();
    expect($alertTypes)->toContain('OVERDUE_RECEIVABLE');
});

test('un usuario puede marcar una alerta como leída / atendida', function () {
    $alert = Alert::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branchA->id,
        'alert_type' => 'LOW_STOCK',
        'severity' => 'WARNING',
        'title' => 'Stock Bajo Test',
        'message' => 'Alerta de prueba',
        'is_read' => false,
    ]);

    $response = $this->actingAs($this->user)->post("/alerts/{$alert->id}/read");
    $response->assertRedirect();

    $alert->refresh();
    expect($alert->is_read)->toBeTrue();
    expect($alert->read_by)->toBe($this->user->id);
    expect($alert->read_at)->not->toBeNull();
});

test('un usuario puede marcar todas las alertas como atendidas', function () {
    Alert::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branchA->id,
        'alert_type' => 'LOW_STOCK',
        'severity' => 'WARNING',
        'title' => 'Alerta 1',
        'message' => 'Prueba 1',
        'is_read' => false,
    ]);

    Alert::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branchA->id,
        'alert_type' => 'OUT_OF_STOCK',
        'severity' => 'CRITICAL',
        'title' => 'Alerta 2',
        'message' => 'Prueba 2',
        'is_read' => false,
    ]);

    $response = $this->actingAs($this->user)->post('/alerts/read-all');
    $response->assertRedirect();

    $unreadCount = Alert::where('company_id', $this->company->id)->where('is_read', false)->count();
    expect($unreadCount)->toBe(0);
});

test('un usuario no-admin solo recibe alertas de su sucursal asignada', function () {
    $storeAdminRole = Role::firstOrCreate(['name' => 'Administrador de Tienda', 'guard_name' => 'web']);
    $storeAdminRole->givePermissionTo('view_alerts');

    $branchUser = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branchA->id,
        'status' => 'ACTIVE',
    ]);
    $branchUser->assignRole('Administrador de Tienda');
    $branchUser->branches()->attach($this->branchA->id);

    // Alerta de la Sucursal A
    Alert::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branchA->id,
        'alert_type' => 'LOW_STOCK',
        'severity' => 'WARNING',
        'title' => 'Alerta Sucursal A',
        'message' => 'Solo para sucursal A',
        'is_read' => false,
    ]);

    // Alerta de la Sucursal B (ajena)
    $alertB = Alert::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branchB->id,
        'alert_type' => 'OUT_OF_STOCK',
        'severity' => 'CRITICAL',
        'title' => 'Alerta Sucursal B',
        'message' => 'Solo para sucursal B',
        'is_read' => false,
    ]);

    $response = $this->actingAs($branchUser)->get('/alerts');
    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('alerts/index')
        ->where('is_super_admin', false)
        ->has('alerts.data', 1)
        ->where('alerts.data.0.title', 'Alerta Sucursal A')
    );

    // Si intenta marcar como leída la alerta de la sucursal B ajena, recibe 403
    $forbiddenResponse = $this->actingAs($branchUser)->post("/alerts/{$alertB->id}/read");
    $forbiddenResponse->assertForbidden();
});

test('las alertas de stock formatean cantidades sin decimales innecesarios y con mensaje descriptivo', function () {
    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'name' => 'Pastilla de Freno Delantera',
        'normalized_name' => 'pastilla de freno delantera',
        'primary_reference' => 'PST-100',
        'normalized_reference' => 'PST100',
        'status' => 'ACTIVE',
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $product->id,
        'physical_quantity' => 2.000000,
        'available_quantity' => 2.000000,
        'average_cost' => 45.00,
        'status' => 'ACTIVE',
    ]);

    ProductMinStock::create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $product->id,
        'branch_id' => $this->branchA->id,
        'minimum_quantity' => 5.000000,
        'effective_from' => now(),
        'version' => 1,
        'status' => 'ACTIVE',
        'created_by' => $this->user->id,
    ]);

    $alertService = app(AlertService::class);
    $data = $alertService->getAlertsForUser($this->user);

    $alert = collect($data['alerts']->items())->firstWhere('alert_type', 'LOW_STOCK');
    expect($alert)->not->toBeNull();
    // No debe contener "2.000000" ni "5.000000"
    expect($alert->message)->not->toContain('2.000000');
    expect($alert->message)->not->toContain('5.000000');
    // Debe contener cantidades limpias y mensaje descriptivo
    expect($alert->message)->toContain('2 unidad');
    expect($alert->message)->toContain('5 unidad');
    expect($alert->message)->toContain('Pastilla de Freno Delantera');
    expect($alert->message)->toContain('Sucursal Principal');
});
