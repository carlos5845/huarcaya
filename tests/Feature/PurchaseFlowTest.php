<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Lot;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Empresa Huarcaya SAC',
        'document_type' => 'RUC',
        'document_number' => '20123456789',
    ]);

    $this->branch = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Almacén Central',
        'address' => 'Av. Principal 123',
        'phone' => '999888777',
        'status' => 'ACTIVE',
    ]);

    $this->user = tap(User::factory()->create([
        'company_id' => $this->company->id,
        'status' => 'ACTIVE',
        'default_branch_id' => $this->branch->id,
    ]), function (User $user) {
        $user->assignRole('Super Admin');
    });

    $this->supplier = Supplier::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'document_type' => 'RUC',
        'document_number' => '20987654321',
        'legal_name' => 'Distribuidora Automotriz SAC',
        'trade_name' => 'DistriAuto',
        'status' => 'ACTIVE',
    ]);

    $this->unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Unidad',
        'code' => 'NIU',
    ]);

    $this->product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Filtro de Aceite Toyota',
        'primary_reference' => 'TOY-12345',
        'normalized_reference' => 'toy12345',
        'normalized_name' => 'filtro de aceite toyota',
        'unit_id' => $this->unit->id,
        'requires_lot_tracking' => true,
        'fifo_enabled' => true,
        'created_by' => $this->user->id,
    ]);
});

test('can render purchase create view with suppliers', function () {
    $response = $this->actingAs($this->user)->get('/purchases/create');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('purchases/create')
        ->has('suppliers')
        ->has('defaultBranch')
    );
});

test('can create a draft purchase', function () {
    $response = $this->actingAs($this->user)->post('/purchases', [
        'supplier_id' => $this->supplier->id,
        'supplier_document_type' => 'FACTURA',
        'supplier_document_series' => 'F001',
        'supplier_document_number' => '0000456',
        'document_date' => now()->toDateString(),
        'tax_mode' => 'PLUS_TAX',
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'notes' => 'Compra de prueba borrador',
        'action' => 'DRAFT',
        'lines' => [
            [
                'product_id' => $this->product->id,
                'quantity' => 10,
                'unit_cost' => 25.50,
            ],
        ],
    ]);

    $purchase = Purchase::where('supplier_id', $this->supplier->id)->first();

    expect($purchase)->not->toBeNull()
        ->and($purchase->status)->toBe('DRAFT')
        ->and((float) $purchase->total_amount)->toBe(300.90) // 255 + 18% = 300.90
        ->and($purchase->lines)->toHaveCount(1);

    $response->assertRedirect(route('purchases.show', $purchase->id));
});

test('can create and directly confirm purchase into kardex and lots', function () {
    $response = $this->actingAs($this->user)->post('/purchases', [
        'supplier_id' => $this->supplier->id,
        'supplier_document_type' => 'FACTURA',
        'supplier_document_series' => 'F002',
        'supplier_document_number' => '0000789',
        'document_date' => now()->toDateString(),
        'tax_mode' => 'INCLUDED',
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'action' => 'CONFIRM',
        'lines' => [
            [
                'product_id' => $this->product->id,
                'quantity' => 20,
                'unit_cost' => 30.00,
            ],
        ],
    ]);

    $purchase = Purchase::where('supplier_document_number', '0000789')->first();

    expect($purchase)->not->toBeNull()
        ->and($purchase->status)->toBe('CONFIRMED')
        ->and($purchase->confirmed_at)->not->toBeNull();

    // Check that Lot was created
    $lot = Lot::where('product_id', $this->product->id)->where('branch_id', $this->branch->id)->first();
    expect($lot)->not->toBeNull()
        ->and((float) $lot->current_quantity)->toBe(20.0);

    $response->assertRedirect(route('purchases.show', $purchase->id));
});

test('can render purchase show view with enriched relations', function () {
    $purchase = Purchase::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branch->id,
        'supplier_id' => $this->supplier->id,
        'purchase_number' => 'PUR-TEST-001',
        'supplier_document_type' => 'FACTURA',
        'supplier_document_series' => 'F001',
        'supplier_document_number' => '000100',
        'document_date' => now()->toDateString(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'subtotal_amount' => 100,
        'tax_amount' => 18,
        'total_amount' => 118,
        'status' => 'DRAFT',
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->get("/purchases/{$purchase->id}");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('purchases/show')
        ->has('purchase.supplier')
        ->has('purchase.creator')
        ->has('purchase.branch')
    );
});

test('can confirm a draft purchase from show view', function () {
    $purchase = Purchase::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branch->id,
        'supplier_id' => $this->supplier->id,
        'purchase_number' => 'PUR-TEST-002',
        'supplier_document_type' => 'FACTURA',
        'supplier_document_series' => 'F001',
        'supplier_document_number' => '000101',
        'document_date' => now()->toDateString(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'subtotal_amount' => 100,
        'tax_amount' => 18,
        'total_amount' => 118,
        'status' => 'DRAFT',
        'created_by' => $this->user->id,
    ]);

    $purchase->lines()->create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $this->product->id,
        'ordered_quantity' => 15,
        'unit_cost_original' => 10,
        'unit_cost_base' => 10,
        'line_subtotal' => 150,
        'tax_amount' => 27,
        'line_total' => 177,
        'received_quantity' => 0,
    ]);

    $response = $this->actingAs($this->user)->post("/purchases/{$purchase->id}/confirm");

    $purchase->refresh();
    expect($purchase->status)->toBe('CONFIRMED');

    $lot = Lot::where('product_id', $this->product->id)->where('original_quantity', 15)->first();
    expect($lot)->not->toBeNull();
});
