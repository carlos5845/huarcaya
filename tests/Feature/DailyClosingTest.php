<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Conflict;
use App\Models\Customer;
use App\Models\DailyClosing;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\PaymentMethodLine;
use App\Models\Sale;
use App\Models\User;
use App\Services\DailyClosingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'view_closings', 'guard_name' => 'web']);
    $superAdminRole->givePermissionTo('view_closings');

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

    $this->branch = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Principal',
        'address' => 'Av. Industrial 123',
        'status' => 'ACTIVE',
    ]);

    $this->customer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'legal_name' => 'Cliente Mostrador',
        'document_type' => 'DNI',
        'document_number' => '45678901',
        'status' => 'ACTIVE',
        'created_by' => $this->user->id,
    ]);

    $this->cashMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'EFECTIVO',
        'name' => 'Efectivo',
        'is_cash' => true,
        'is_active' => true,
    ]);

    $this->yapeMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'YAPE',
        'name' => 'Yape',
        'is_cash' => false,
        'is_active' => true,
    ]);
});

test('user can view closings index page with KPIs and filters', function () {
    $response = $this->actingAs($this->user)->get(route('closings.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('closings/index')
        ->has('closings')
        ->has('kpis')
        ->has('branches')
    );
});

test('daily closing service calculates daily metrics correctly', function () {
    $today = now()->toDateString();

    // 1. Create a cash sale
    Sale::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'sale_number' => 'V-TEST-001',
        'sale_type' => 'DIRECTA',
        'payment_type' => 'CASH',
        'payment_status' => 'PAID',
        'payment_method_id' => $this->cashMethod->id,
        'operation_date' => now(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1.0,
        'subtotal_amount' => 100.0,
        'tax_amount' => 18.0,
        'discount_amount' => 0.0,
        'total_amount' => 118.0,
        'customer_name_snapshot' => 'Cliente Mostrador',
        'external_document_type' => 'BOLETA',
        'status' => 'CONFIRMED',
        'created_by' => $this->user->id,
    ]);

    // 2. Create payment with method line for cash
    $payment = Payment::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'payment_number' => 'PAY-TEST-001',
        'operation_date' => now(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1.0,
        'total_amount' => 118.0,
        'status' => 'CONFIRMED',
        'created_by' => $this->user->id,
    ]);

    PaymentMethodLine::create([
        'uuid' => (string) Str::uuid(),
        'payment_id' => $payment->id,
        'payment_method_id' => $this->cashMethod->id,
        'amount' => 118.0,
    ]);

    $service = app(DailyClosingService::class);
    $metrics = $service->getDailyMetrics($this->branch->id, $today);

    expect($metrics['sales']['total_amount'])->toEqual(118.0)
        ->and($metrics['sales']['count'])->toEqual(1)
        ->and($metrics['can_close'])->toBeTrue()
        ->and($metrics['pending_conflicts'])->toEqual(0);

    $cashItem = collect($metrics['payment_methods'])->firstWhere('id', $this->cashMethod->id);
    expect($cashItem['expected_amount'])->toEqual(118.0);
});

test('user can access closing create form and view current metrics', function () {
    $today = now()->toDateString();

    $response = $this->actingAs($this->user)->get(route('closings.create', [
        'branch_id' => $this->branch->id,
        'date' => $today,
    ]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('closings/create')
        ->has('closing')
        ->has('metrics')
        ->where('selectedBranchId', $this->branch->id)
    );
});

test('user can save draft version of cash count', function () {
    $today = now()->toDateString();

    $postData = [
        'branch_id' => $this->branch->id,
        'closing_date' => $today,
        'action' => 'draft',
        'notes' => 'Primer arqueo preliminar a mitad de turno',
        'counts' => [
            [
                'payment_method_id' => $this->cashMethod->id,
                'counted_amount' => 200.0,
                'notes' => 'Conteo de billetes',
            ],
            [
                'payment_method_id' => $this->yapeMethod->id,
                'counted_amount' => 50.0,
                'notes' => 'Capturas de Yape',
            ],
        ],
    ];

    $response = $this->actingAs($this->user)->post(route('closings.store'), $postData);

    $response->assertSessionHas('success');

    $closing = DailyClosing::where('branch_id', $this->branch->id)
        ->whereDate('closing_date', $today)
        ->first();

    expect($closing)->not->toBeNull()
        ->and($closing->status)->toEqual('IN_PROGRESS')
        ->and($closing->versions()->count())->toEqual(1);

    $version = $closing->latestVersion;
    expect((float) $version->total_counted)->toEqual(250.0)
        ->and($version->cashCounts()->count())->toEqual(2);
});

test('user can confirm daily closing definitively', function () {
    $today = now()->toDateString();

    $postData = [
        'branch_id' => $this->branch->id,
        'closing_date' => $today,
        'action' => 'confirm',
        'notes' => 'Cierre definitivo de turno sin incidencias',
        'counts' => [
            [
                'payment_method_id' => $this->cashMethod->id,
                'counted_amount' => 150.0,
                'notes' => null,
            ],
            [
                'payment_method_id' => $this->yapeMethod->id,
                'counted_amount' => 0.0,
                'notes' => null,
            ],
        ],
    ];

    $response = $this->actingAs($this->user)->post(route('closings.store'), $postData);

    $closing = DailyClosing::where('branch_id', $this->branch->id)
        ->whereDate('closing_date', $today)
        ->first();

    $response->assertRedirect(route('closings.show', $closing->id));

    expect($closing->status)->toEqual('CLOSED')
        ->and($closing->closed_at)->not->toBeNull()
        ->and($closing->closed_by)->toEqual($this->user->id);
});

test('daily closing confirmation is blocked if pending conflicts exist', function () {
    $today = now()->toDateString();

    // Create a pending conflict for this branch
    Conflict::create([
        'uuid' => (string) Str::uuid(),
        'entity_type' => 'Sale',
        'entity_uuid' => (string) Str::uuid(),
        'conflict_type' => 'STOCK_EXHAUSTED',
        'client_state' => ['branch_id' => $this->branch->id],
        'server_state' => ['current_stock' => 0],
        'status' => 'PENDING',
    ]);

    $postData = [
        'branch_id' => $this->branch->id,
        'closing_date' => $today,
        'action' => 'confirm',
        'counts' => [
            [
                'payment_method_id' => $this->cashMethod->id,
                'counted_amount' => 100.0,
            ],
        ],
    ];

    $response = $this->actingAs($this->user)->post(route('closings.store'), $postData);

    $response->assertSessionHas('error');

    $closing = DailyClosing::where('branch_id', $this->branch->id)
        ->whereDate('closing_date', $today)
        ->first();

    // Must NOT be closed
    expect($closing->status)->not->toEqual('CLOSED');
});

test('user can view closing show audit page and render print ticket with logo', function () {
    $today = now()->toDateString();

    $service = app(DailyClosingService::class);
    $closing = $service->getOrCreateClosing($this->branch->id, $today, $this->user->id);
    $service->confirmClosing($closing, [
        'counts' => [
            [
                'payment_method_id' => $this->cashMethod->id,
                'counted_amount' => 100.0,
            ],
        ],
    ], $this->user->id);

    // 1. Show page
    $showResponse = $this->actingAs($this->user)->get(route('closings.show', $closing->id));
    $showResponse->assertOk();
    $showResponse->assertInertia(fn (Assert $page) => $page
        ->component('closings/show')
        ->has('closing')
    );

    // 2. Print ticket
    $printResponse = $this->actingAs($this->user)->get(route('closings.print', $closing->id));
    $printResponse->assertOk();
    $printResponse->assertSee('CIERRE DIARIO DE CAJA');
    $printResponse->assertSee('logo-text.png');
    $printResponse->assertSee('ARQUEO DE CAJA Y COBRANZAS');
    $printResponse->assertSee('Cajero / Responsable');
});

test('non-admin user can only view closings from their assigned branch', function () {
    $today = now()->toDateString();

    $branch2 = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Secundaria',
        'address' => 'Av. Arequipa 456',
        'status' => 'ACTIVE',
    ]);

    // Create closing for branch 1 and branch 2
    $service = app(DailyClosingService::class);
    $closing1 = $service->getOrCreateClosing($this->branch->id, $today, $this->user->id);
    $closing2 = $service->getOrCreateClosing($branch2->id, $today, $this->user->id);

    // Create a Cashier role and user assigned only to branch 1
    $cajeroRole = Role::firstOrCreate(['name' => 'Cajero', 'guard_name' => 'web']);
    $cajeroRole->givePermissionTo('view_closings');

    $cajero = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branch->id,
        'status' => 'ACTIVE',
    ]);
    $cajero->assignRole('Cajero');

    $response = $this->actingAs($cajero)->get(route('closings.index'));
    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('closings/index')
        ->has('closings.data', 1)
        ->where('closings.data.0.id', $closing1->id)
        ->where('is_super_admin', false)
    );
});

test('non-admin user cannot access or create closing for another branch', function () {
    $today = now()->toDateString();

    $branch2 = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Norte',
        'address' => 'Calle Los Álamos 100',
        'status' => 'ACTIVE',
    ]);

    $cajeroRole = Role::firstOrCreate(['name' => 'Cajero', 'guard_name' => 'web']);
    $cajeroRole->givePermissionTo('view_closings');

    $cajero = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branch->id,
        'status' => 'ACTIVE',
    ]);
    $cajero->assignRole('Cajero');

    // 1. Attempt GET create for branch2
    $getResponse = $this->actingAs($cajero)->get(route('closings.create', ['branch_id' => $branch2->id]));
    $getResponse->assertForbidden();

    // 2. Attempt POST store for branch2
    $postResponse = $this->actingAs($cajero)->post(route('closings.store'), [
        'branch_id' => $branch2->id,
        'closing_date' => $today,
        'action' => 'draft',
        'counts' => [
            [
                'payment_method_id' => $this->cashMethod->id,
                'counted_amount' => 50.0,
            ],
        ],
    ]);
    $postResponse->assertForbidden();
});

test('non-admin user cannot view or print closing of another branch', function () {
    $today = now()->toDateString();

    $branch2 = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Este',
        'address' => 'Av. Javier Prado 2000',
        'status' => 'ACTIVE',
    ]);

    $service = app(DailyClosingService::class);
    $closingBranch2 = $service->getOrCreateClosing($branch2->id, $today, $this->user->id);

    $cajeroRole = Role::firstOrCreate(['name' => 'Cajero', 'guard_name' => 'web']);
    $cajeroRole->givePermissionTo('view_closings');

    $cajero = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branch->id,
        'status' => 'ACTIVE',
    ]);
    $cajero->assignRole('Cajero');

    // Attempt to view closing from branch 2
    $showResponse = $this->actingAs($cajero)->get(route('closings.show', $closingBranch2->id));
    $showResponse->assertForbidden();

    // Attempt to print closing from branch 2
    $printResponse = $this->actingAs($cajero)->get(route('closings.print', $closingBranch2->id));
    $printResponse->assertForbidden();
});
