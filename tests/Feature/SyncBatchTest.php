<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Conflict;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\InventoryMovementLine;
use App\Models\Lot;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\SyncOperation;
use App\Models\Unit;
use App\Models\User;
use App\Services\KardexService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

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

    $this->customer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'document_type' => 'DNI',
        'document_number' => '12345678',
        'legal_name' => 'Cliente Offline Test',
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
        'name' => 'Filtro de Aceite Test',
        'primary_reference' => 'FIL-001',
        'normalized_reference' => 'fil-001',
        'normalized_name' => 'filtro de aceite test',
        'product_type' => 'STANDARD',
        'unit_id' => $this->unit->id,
        'status' => 'ACTIVE',
    ]);

    // Initial stock: 10 units
    $kardexService = new KardexService;
    $entryMovement = InventoryMovement::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'movement_type' => 'IN',
        'reference_type' => 'TEST',
        'reference_id' => 1,
        'operation_date' => now(),
        'notes' => 'Stock Inicial',
        'created_by' => $this->user->id,
    ]);

    $movementLine = InventoryMovementLine::create([
        'uuid' => (string) Str::uuid(),
        'inventory_movement_id' => $entryMovement->id,
        'product_id' => $this->product->id,
        'direction' => 'IN',
        'quantity' => 10,
        'unit_cost' => 20.0,
        'total_cost' => 200.0,
    ]);

    $kardexService->recordEntry([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
        'unit_cost' => 20.0,
        'operation_type' => 'INVENTARIO_INICIAL',
        'reference' => 'Stock Inicial',
        'inventory_movement_line_id' => $movementLine->id,
        'user_id' => $this->user->id,
    ]);

    $this->lot = Lot::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'lot_number' => 'LOTE-TEST-001',
        'original_quantity' => 10,
        'current_quantity' => 10,
        'unit_cost' => 20.0,
        'status' => 'ACTIVE',
    ]);

    $this->paymentMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Efectivo',
        'code' => 'EFECTIVO',
        'is_cash' => true,
        'is_active' => true,
    ]);
});

test('it can download catalog for offline indexeddb', function () {
    $response = $this->actingAs($this->user)
        ->getJson(route('sync.catalog', ['branch_id' => $this->branch->id]));

    $response->assertOk()
        ->assertJsonStructure([
            'products' => [
                '*' => ['id', 'uuid', 'name', 'primary_reference', 'local_stock'],
            ],
            'customers' => [
                '*' => ['id', 'uuid', 'document_type', 'document_number', 'legal_name'],
            ],
            'payment_methods' => [
                '*' => ['id', 'name', 'code', 'is_cash'],
            ],
            'branch' => ['id', 'name', 'code'],
            'server_time',
        ]);

    $data = $response->json();
    expect($data['products'])->toHaveCount(1)
        ->and($data['products'][0]['local_stock'])->toEqual(10)
        ->and($data['customers'])->toHaveCount(1)
        ->and($data['payment_methods'])->toHaveCount(1);
});

test('it can sync an offline sale and update kardex', function () {
    $saleUuid = (string) Str::uuid();
    $syncOpUuid = (string) Str::uuid();

    $payload = [
        'uuid' => $saleUuid,
        'customer_id' => $this->customer->id,
        'sale_type' => 'BOLETA',
        'payment_type' => 'CASH',
        'payment_method_id' => $this->paymentMethod->id,
        'operation_date' => now()->toDateString(),
        'tax_mode' => 'INCLUDED',
        'currency_code' => 'PEN',
        'exchange_rate' => 1.0,
        'action' => 'CONFIRM',
        'lines' => [
            [
                'product_id' => $this->product->id,
                'quantity' => 4,
                'unit_price' => 35.0,
            ],
        ],
    ];

    $response = $this->actingAs($this->user)->postJson(route('sync.batch'), [
        'branch_id' => $this->branch->id,
        'operations' => [
            [
                'uuid' => $syncOpUuid,
                'entity_type' => 'Sale',
                'operation_type' => 'CREATE',
                'payload' => $payload,
                'client_timestamp' => now()->toIso8601String(),
            ],
        ],
    ]);

    $response->assertOk()
        ->assertJsonPath('results.0.status', 'SUCCESS')
        ->assertJsonPath('results.0.uuid', $syncOpUuid);

    // Verify Sale exists in database
    $sale = Sale::where('uuid', $saleUuid)->first();
    expect($sale)->not->toBeNull()
        ->and($sale->status)->toBe('CONFIRMED')
        ->and((float) $sale->total_amount)->toEqual(140.0);

    // Verify inventory stock deducted: 10 - 4 = 6
    $inv = Inventory::where('branch_id', $this->branch->id)->where('product_id', $this->product->id)->first();
    expect((float) $inv->physical_quantity)->toEqual(6.0);

    // Verify Lot depleted: 10 - 4 = 6
    $lot = $this->lot->fresh();
    expect((float) $lot->current_quantity)->toEqual(6.0);

    // Verify SyncOperation record
    $syncOp = SyncOperation::where('uuid', $syncOpUuid)->first();
    expect($syncOp)->not->toBeNull()
        ->and($syncOp->status)->toBe('SUCCESS')
        ->and($syncOp->processed_at)->not->toBeNull();
});

test('it guarantees idempotency when re-submitting same sync operation uuid', function () {
    $saleUuid = (string) Str::uuid();
    $syncOpUuid = (string) Str::uuid();

    $operation = [
        'uuid' => $syncOpUuid,
        'entity_type' => 'Sale',
        'operation_type' => 'CREATE',
        'payload' => [
            'uuid' => $saleUuid,
            'customer_id' => $this->customer->id,
            'sale_type' => 'BOLETA',
            'payment_type' => 'CASH',
            'payment_method_id' => $this->paymentMethod->id,
            'operation_date' => now()->toDateString(),
            'tax_mode' => 'INCLUDED',
            'currency_code' => 'PEN',
            'exchange_rate' => 1.0,
            'action' => 'CONFIRM',
            'lines' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 3,
                    'unit_price' => 30.0,
                ],
            ],
        ],
        'client_timestamp' => now()->toIso8601String(),
    ];

    // First submission
    $this->actingAs($this->user)->postJson(route('sync.batch'), [
        'branch_id' => $this->branch->id,
        'operations' => [$operation],
    ])->assertOk()->assertJsonPath('results.0.status', 'SUCCESS');

    $initialSalesCount = Sale::where('uuid', $saleUuid)->count();
    expect($initialSalesCount)->toBe(1);

    // Second submission with exact same sync operation UUID
    $secondResponse = $this->actingAs($this->user)->postJson(route('sync.batch'), [
        'branch_id' => $this->branch->id,
        'operations' => [$operation],
    ]);

    $secondResponse->assertOk()
        ->assertJsonPath('results.0.status', 'SUCCESS');

    // Assure no duplicated sales or double stock deduction
    expect(Sale::where('uuid', $saleUuid)->count())->toBe(1);

    $inv = Inventory::where('branch_id', $this->branch->id)->where('product_id', $this->product->id)->first();
    // 10 - 3 = 7 (not 4)
    expect((float) $inv->physical_quantity)->toEqual(7.0);
});

test('it registers conflict when offline sale exceeds physical inventory stock', function () {
    $saleUuid = (string) Str::uuid();
    $syncOpUuid = (string) Str::uuid();

    $operation = [
        'uuid' => $syncOpUuid,
        'entity_type' => 'Sale',
        'operation_type' => 'CREATE',
        'payload' => [
            'uuid' => $saleUuid,
            'customer_id' => $this->customer->id,
            'sale_type' => 'BOLETA',
            'payment_type' => 'CASH',
            'payment_method_id' => $this->paymentMethod->id,
            'operation_date' => now()->toDateString(),
            'tax_mode' => 'INCLUDED',
            'currency_code' => 'PEN',
            'lines' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 50, // Physical stock is only 10!
                    'unit_price' => 30.0,
                ],
            ],
        ],
        'client_timestamp' => now()->toIso8601String(),
    ];

    $response = $this->actingAs($this->user)->postJson(route('sync.batch'), [
        'branch_id' => $this->branch->id,
        'operations' => [$operation],
    ]);

    $response->assertOk()
        ->assertJsonPath('results.0.status', 'CONFLICT');

    // Conflict row must exist
    $conflict = Conflict::where('sync_operation_id', function ($query) use ($syncOpUuid) {
        $query->select('id')->from('sync_operations')->where('uuid', $syncOpUuid);
    })->first();

    expect($conflict)->not->toBeNull()
        ->and($conflict->conflict_type)->toBe('INSUFFICIENT_STOCK')
        ->and($conflict->status)->toBe('PENDING');
});

test('it can sync an offline purchase and record entry in kardex', function () {
    $supplier = Supplier::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'document_type' => 'RUC',
        'document_number' => '20123456789',
        'legal_name' => 'Proveedor Repuestos SAC',
        'status' => 'ACTIVE',
    ]);

    $purchaseUuid = (string) Str::uuid();
    $syncOpUuid = (string) Str::uuid();

    $operation = [
        'uuid' => $syncOpUuid,
        'entity_type' => 'Purchase',
        'operation_type' => 'CREATE',
        'payload' => [
            'uuid' => $purchaseUuid,
            'supplier_id' => $supplier->id,
            'document_date' => now()->toDateString(),
            'tax_mode' => 'INCLUDED',
            'currency_code' => 'PEN',
            'action' => 'CONFIRM',
            'lines' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 15,
                    'unit_cost' => 18.0,
                ],
            ],
        ],
        'client_timestamp' => now()->toIso8601String(),
    ];

    $response = $this->actingAs($this->user)->postJson(route('sync.batch'), [
        'branch_id' => $this->branch->id,
        'operations' => [$operation],
    ]);

    $response->assertOk()
        ->assertJsonPath('results.0.status', 'SUCCESS');

    $purchase = Purchase::where('uuid', $purchaseUuid)->first();
    expect($purchase)->not->toBeNull()
        ->and($purchase->status)->toBe('CONFIRMED');

    // Initial was 10, added 15 => 25
    $inv = Inventory::where('branch_id', $this->branch->id)->where('product_id', $this->product->id)->first();
    expect((float) $inv->physical_quantity)->toEqual(25.0);
});

test('it can sync an offline purchase with base64 attached document', function () {
    Storage::fake('public');

    $supplier = Supplier::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'document_type' => 'RUC',
        'document_number' => '20999888777',
        'legal_name' => 'Distribuidora Global SAC',
        'status' => 'ACTIVE',
    ]);

    $purchaseUuid = (string) Str::uuid();
    $syncOpUuid = (string) Str::uuid();

    $fakeBase64 = 'data:application/pdf;base64,'.base64_encode('%PDF-1.4 test invoice content');

    $operation = [
        'uuid' => $syncOpUuid,
        'entity_type' => 'Purchase',
        'operation_type' => 'CREATE',
        'payload' => [
            'uuid' => $purchaseUuid,
            'supplier_id' => $supplier->id,
            'document_date' => now()->toDateString(),
            'tax_mode' => 'INCLUDED',
            'currency_code' => 'PEN',
            'action' => 'DRAFT',
            'document_file' => [
                'name' => 'factura_compra_001.pdf',
                'type' => 'application/pdf',
                'size' => 1024,
                'base64' => $fakeBase64,
            ],
            'lines' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 5,
                    'unit_cost' => 20.0,
                ],
            ],
        ],
        'client_timestamp' => now()->toIso8601String(),
    ];

    $response = $this->actingAs($this->user)->postJson(route('sync.batch'), [
        'branch_id' => $this->branch->id,
        'operations' => [$operation],
    ]);

    $response->assertOk()
        ->assertJsonPath('results.0.status', 'SUCCESS');

    $purchase = Purchase::where('uuid', $purchaseUuid)->first();
    expect($purchase)->not->toBeNull()
        ->and($purchase->document_file_path)->not->toBeNull();

    Storage::disk('public')->assertExists($purchase->document_file_path);
});
