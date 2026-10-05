<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Conflict;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\SyncOperation;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'view_conflicts', 'guard_name' => 'web']);
    $superAdminRole->givePermissionTo('view_conflicts');

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
        'name' => 'Almacén Principal',
        'address' => 'Av. Central 500',
        'status' => 'ACTIVE',
    ]);

    $this->customer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'legal_name' => 'Comercializadora del Sur',
        'document_type' => 'DNI',
        'document_number' => '72889900',
        'status' => 'ACTIVE',
        'created_by' => $this->user->id,
    ]);

    $unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Unidad',
        'code' => 'UND',
    ]);

    $this->product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Filtro de Aceite PH4967',
        'normalized_name' => 'filtro de aceite ph4967',
        'primary_reference' => 'PH4967',
        'normalized_reference' => 'ph4967',
        'internal_code' => 'SKU-FLT-1',
        'product_type' => 'STANDARD',
        'unit_id' => $unit->id,
        'sale_price' => 25.0,
        'cost_price' => 15.0,
        'status' => 'ACTIVE',
        'created_by' => $this->user->id,
    ]);

    // Initial inventory at zero available stock to provoke shortage conflict
    $this->inventory = Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'physical_quantity' => 0,
        'available_quantity' => 0,
        'average_cost' => 15.0,
    ]);

    // Create sync operation & conflict
    $this->saleUuid = (string) Str::uuid();
    $this->syncOp = SyncOperation::create([
        'uuid' => (string) Str::uuid(),
        'user_id' => $this->user->id,
        'entity_type' => 'Sale',
        'entity_uuid' => $this->saleUuid,
        'operation_type' => 'CREATE',
        'payload' => [
            'uuid' => $this->saleUuid,
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customer->id,
            'sale_type' => 'BOLETA',
            'payment_type' => 'CASH',
            'total_amount' => 50.0,
            'action' => 'CONFIRM',
            'lines' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 2,
                    'unit_price' => 25.0,
                ],
            ],
        ],
        'status' => 'CONFLICT',
        'client_timestamp' => now(),
    ]);

    $this->conflict = Conflict::create([
        'uuid' => (string) Str::uuid(),
        'entity_type' => 'Sale',
        'entity_uuid' => $this->saleUuid,
        'conflict_type' => 'INSUFFICIENT_STOCK',
        'server_state' => ['error' => 'Stock insuficiente en la sucursal: Disponible 0, Solicitado 2'],
        'client_state' => $this->syncOp->payload,
        'status' => 'PENDING',
        'sync_operation_id' => $this->syncOp->id,
    ]);
});

it('can list synchronization conflicts in the admin tray with metrics', function () {
    $response = $this->actingAs($this->user)
        ->get(route('conflicts.index'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('conflicts/index')
            ->has('conflicts.data', 1)
            ->where('metrics.pending_count', 1)
            ->where('metrics.resolved_count', 0)
            ->where('metrics.rejected_count', 0)
        );
});

it('can view side-by-side conflict detail with client and server context', function () {
    $response = $this->actingAs($this->user)
        ->get(route('conflicts.show', $this->conflict));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('conflicts/show')
            ->where('conflict.id', $this->conflict->id)
            ->where('conflict.conflict_type', 'INSUFFICIENT_STOCK')
            ->has('serverContext.products.'.$this->product->id)
            ->where('serverContext.products.'.$this->product->id.'.current_available_stock', 0)
        );
});

it('can reject an offline conflict with mandatory resolution notes', function () {
    $response = $this->actingAs($this->user)
        ->post(route('conflicts.reject', $this->conflict), [
            'notes' => 'El cliente canceló la compra y los artículos no fueron retirados.',
        ]);

    $response->assertRedirect();

    $this->conflict->refresh();
    expect($this->conflict->status)->toBe('REJECTED')
        ->and($this->conflict->resolved_by)->toBe($this->user->id)
        ->and($this->conflict->resolution_notes)->toContain('canceló la compra');

    $this->syncOp->refresh();
    expect($this->syncOp->status)->toBe('FAILED');
});

it('can resolve conflict with corrected data and reprocess', function () {
    // Add stock of 1 unit in inventory
    $this->inventory->update(['physical_quantity' => 1, 'available_quantity' => 1]);

    // Correct payload from 2 units to 1 unit
    $correctedPayload = $this->syncOp->payload;
    $correctedPayload['lines'][0]['quantity'] = 1;
    $correctedPayload['total_amount'] = 25.0;

    $response = $this->actingAs($this->user)
        ->post(route('conflicts.correct', $this->conflict), [
            'payload' => $correctedPayload,
            'notes' => 'Se acordó con el cliente entregar 1 unidad acorde al stock disponible.',
        ]);

    $response->assertRedirect(route('conflicts.show', $this->conflict->id));

    $this->conflict->refresh();
    expect($this->conflict->status)->toBe('RESOLVED')
        ->and($this->conflict->resolved_by)->toBe($this->user->id);

    $this->syncOp->refresh();
    expect($this->syncOp->status)->toBe('SUCCESS');

    // Kardex should now have remaining stock 0
    $this->inventory->refresh();
    expect((float) $this->inventory->available_quantity)->toBe(0.0);
});

it('can force authorize conflict with automatic kardex regularization', function () {
    expect((float) $this->inventory->available_quantity)->toBe(0.0);

    $response = $this->actingAs($this->user)
        ->post(route('conflicts.force', $this->conflict), [
            'notes' => 'Mercadería ingresada físicamente a tienda sin registro oportuno. Se autoriza regularización tras arqueo.',
        ]);

    $response->assertRedirect(route('conflicts.show', $this->conflict->id));

    $this->conflict->refresh();
    expect($this->conflict->status)->toBe('RESOLVED_FORCE')
        ->and($this->conflict->resolved_by)->toBe($this->user->id)
        ->and($this->conflict->resolution_notes)->toContain('Mercadería ingresada físicamente');

    $this->syncOp->refresh();
    expect($this->syncOp->status)->toBe('SUCCESS');

    // Check that positive regularization entry was recorded in Kardex
    $this->assertDatabaseHas('kardex_entries', [
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'operation_type' => 'AJUSTE_POSITIVO',
    ]);
});

it('requires notes with at least 5 characters to reject or authorize', function () {
    $response = $this->actingAs($this->user)
        ->post(route('conflicts.reject', $this->conflict), [
            'notes' => 'no',
        ]);

    $response->assertSessionHasErrors(['notes']);
});

it('restricts non-admin user to only view conflicts from their assigned branch', function () {
    $branch2 = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Sur',
        'address' => 'Av. Sur 100',
        'status' => 'ACTIVE',
    ]);

    // Create a conflict for branch 2
    $conflictBranch2 = Conflict::create([
        'uuid' => (string) Str::uuid(),
        'entity_type' => 'Sale',
        'entity_uuid' => (string) Str::uuid(),
        'conflict_type' => 'STOCK_EXHAUSTED',
        'client_state' => ['branch_id' => $branch2->id],
        'server_state' => ['current_stock' => 0],
        'status' => 'PENDING',
    ]);

    // Create a non-admin user assigned only to branch 1
    $cajeroRole = Role::firstOrCreate(['name' => 'Cajero', 'guard_name' => 'web']);
    $cajeroRole->givePermissionTo('view_conflicts');

    $cajero = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branch->id,
        'status' => 'ACTIVE',
    ]);
    $cajero->assignRole('Cajero');

    $response = $this->actingAs($cajero)->get(route('conflicts.index'));
    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('conflicts/index')
        ->has('conflicts.data', 1)
        ->where('conflicts.data.0.id', $this->conflict->id)
        ->where('is_super_admin', false)
        ->where('metrics.pending_count', 1)
    );
});

it('forbids non-admin user from viewing or resolving conflicts from another branch', function () {
    $branch2 = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Oeste',
        'address' => 'Av. Oeste 200',
        'status' => 'ACTIVE',
    ]);

    $conflictBranch2 = Conflict::create([
        'uuid' => (string) Str::uuid(),
        'entity_type' => 'Sale',
        'entity_uuid' => (string) Str::uuid(),
        'conflict_type' => 'STOCK_EXHAUSTED',
        'client_state' => ['branch_id' => $branch2->id],
        'server_state' => ['current_stock' => 0],
        'status' => 'PENDING',
    ]);

    $cajeroRole = Role::firstOrCreate(['name' => 'Cajero', 'guard_name' => 'web']);
    $cajeroRole->givePermissionTo('view_conflicts');

    $cajero = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branch->id,
        'status' => 'ACTIVE',
    ]);
    $cajero->assignRole('Cajero');

    // 1. Attempt show
    $showResponse = $this->actingAs($cajero)->get(route('conflicts.show', $conflictBranch2));
    $showResponse->assertForbidden();

    // 2. Attempt reject
    $rejectResponse = $this->actingAs($cajero)->post(route('conflicts.reject', $conflictBranch2), [
        'notes' => 'Intento de rechazar conflicto ajeno',
    ]);
    $rejectResponse->assertForbidden();
});
