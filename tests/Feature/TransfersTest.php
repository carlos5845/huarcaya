<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\KardexEntry;
use App\Models\Product;
use App\Models\Transfer;
use App\Models\Unit;
use App\Models\User;
use App\Services\KardexService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Setup roles and permissions
    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'view_transfers', 'guard_name' => 'web']);
    $superAdminRole->givePermissionTo('view_transfers');

    $company = Company::create(['uuid' => (string) Str::uuid(), 'name' => 'Empresa Test', 'document_type' => 'RUC', 'document_number' => '12345678901']);
    $this->user = User::factory()->create(['company_id' => $company->id, 'status' => 'ACTIVE']);
    $this->company = $company;

    $this->user->assignRole('Super Admin');

    $this->branchA = Branch::create(['uuid' => (string) Str::uuid(), 'company_id' => $company->id, 'name' => 'Sucursal A', 'address' => 'X', 'phone' => '123', 'status' => 'ACTIVE']);
    $this->branchB = Branch::create(['uuid' => (string) Str::uuid(), 'company_id' => $company->id, 'name' => 'Sucursal B', 'address' => 'Y', 'phone' => '456', 'status' => 'ACTIVE']);
    $unit = Unit::create(['uuid' => (string) Str::uuid(), 'company_id' => $company->id, 'name' => 'Unidad', 'code' => 'UN']);

    $this->product = Product::create(['uuid' => (string) Str::uuid(), 'company_id' => $company->id, 'name' => 'Taladro', 'primary_reference' => 'T-01', 'normalized_reference' => 't-01', 'normalized_name' => 'taladro', 'unit_id' => $unit->id, 'sale_price' => 20, 'cost_price' => 10]);

    // Add initial stock to Branch A
    $kardexService = new KardexService;
    $kardexService->recordEntry([
        'branch_id' => $this->branchA->id,
        'product_id' => $this->product->id,
        'quantity' => 50,
        'unit_cost' => 10.00,
        'operation_type' => 'INVENTARIO_INICIAL',
        'reference' => 'INICIAL',
        'user_id' => $this->user->id,
    ]);
});

it('can create a draft transfer request', function () {
    $this->actingAs($this->user);

    $response = $this->post(route('transfers.store'), [
        'source_branch_id' => $this->branchA->id,
        'destination_branch_id' => $this->branchB->id,
        'notes' => 'Transferencia de prueba',
        'lines' => [
            [
                'product_id' => $this->product->id,
                'requested_quantity' => 10,
            ],
        ],
    ]);

    $response->assertSessionHas('success');
    $this->assertDatabaseHas('transfers', [
        'source_branch_id' => $this->branchA->id,
        'destination_branch_id' => $this->branchB->id,
        'status' => 'DRAFT',
    ]);

    $transfer = Transfer::first();
    $this->assertDatabaseHas('transfer_lines', [
        'transfer_id' => $transfer->id,
        'product_id' => $this->product->id,
        'requested_quantity' => 10,
    ]);
});

it('can dispatch a transfer and deduct stock from origin', function () {
    $this->actingAs($this->user);

    // Create Draft Transfer
    $transfer = Transfer::create([
        'uuid' => (string) Str::uuid(),
        'transfer_number' => 'TR-TEST',
        'request_date' => now(),
        'source_branch_id' => $this->branchA->id,
        'destination_branch_id' => $this->branchB->id,
        'status' => 'DRAFT',
        'created_by' => $this->user->id,
        'company_id' => $this->company->id,
    ]);

    $line = $transfer->lines()->create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $this->product->id,
        'requested_quantity' => 10,
    ]);

    $response = $this->post(route('transfers.shipments.store', $transfer));

    $response->assertSessionHas('success');

    // Status should be IN_TRANSIT
    $this->assertDatabaseHas('transfers', [
        'id' => $transfer->id,
        'status' => 'IN_TRANSIT',
    ]);

    // Verify Kardex exit in Branch A
    $this->assertDatabaseHas('kardex_entries', [
        'branch_id' => $this->branchA->id,
        'product_id' => $this->product->id,
        'operation_type' => 'TRANSFERENCIA_SALIDA',
        'output_quantity' => 10,
    ]);

    // Verify physical stock in Branch A is now 40 (50 - 10)
    $this->assertDatabaseHas('inventories', [
        'branch_id' => $this->branchA->id,
        'product_id' => $this->product->id,
        'physical_quantity' => 40,
    ]);
});

it('can receive a transfer and add stock to destination', function () {
    $this->actingAs($this->user);

    // Create Transfer in Transit
    $transfer = Transfer::create([
        'uuid' => (string) Str::uuid(),
        'transfer_number' => 'TR-TEST-2',
        'request_date' => now(),
        'source_branch_id' => $this->branchA->id,
        'destination_branch_id' => $this->branchB->id,
        'status' => 'IN_TRANSIT',
        'created_by' => $this->user->id,
        'company_id' => $this->company->id,
    ]);

    $line = $transfer->lines()->create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $this->product->id,
        'requested_quantity' => 10,
        'shipped_quantity' => 10,
        'company_id' => $this->company->id,
    ]);

    // Create Shipment manually
    $shipment = $transfer->shipments()->create([
        'uuid' => (string) Str::uuid(),
        'shipment_number' => 'SHP-TEST',
        'shipment_date' => now(),
        'status' => 'SHIPPED',
        'company_id' => $this->company->id,
    ]);

    $shipment->lines()->create([
        'uuid' => (string) Str::uuid(),
        'transfer_line_id' => $line->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
        'company_id' => $this->company->id,
    ]);

    $response = $this->post(route('transfers.receipts.store', $transfer), [
        'lines' => [
            [
                'id' => $line->id,
                'received_quantity' => 10,
                'damaged_quantity' => 0,
                'missing_quantity' => 0,
            ],
        ],
    ]);

    $response->assertSessionHas('success');

    // Status should be COMPLETED
    $this->assertDatabaseHas('transfers', [
        'id' => $transfer->id,
        'status' => 'COMPLETED',
    ]);

    // Verify Kardex entry in Branch B
    $this->assertDatabaseHas('kardex_entries', [
        'branch_id' => $this->branchB->id,
        'product_id' => $this->product->id,
        'operation_type' => 'TRANSFERENCIA_ENTRADA',
        'input_quantity' => 10,
    ]);

    // Verify physical stock in Branch B is now 10
    $this->assertDatabaseHas('inventories', [
        'branch_id' => $this->branchB->id,
        'product_id' => $this->product->id,
        'physical_quantity' => 10,
    ]);
});

it('can cancel an in-transit transfer and revert stock', function () {
    $this->actingAs($this->user);

    $transfer = Transfer::create([
        'uuid' => (string) Str::uuid(),
        'transfer_number' => 'TR-CANCEL',
        'request_date' => now(),
        'source_branch_id' => $this->branchA->id,
        'destination_branch_id' => $this->branchB->id,
        'status' => 'IN_TRANSIT',
        'created_by' => $this->user->id,
        'company_id' => $this->company->id,
    ]);

    $line = $transfer->lines()->create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $this->product->id,
        'requested_quantity' => 10,
        'shipped_quantity' => 10,
    ]);

    // Simular que habia salido stock. (Fisicamente tendriamos 40, pero forzaremos 50 en la DB por el BeforeEach, no importa mucho)
    $response = $this->post(route('transfers.cancel', $transfer));

    $response->assertSessionHas('success');

    $this->assertDatabaseHas('transfers', [
        'id' => $transfer->id,
        'status' => 'CANCELLED',
    ]);

    $this->assertDatabaseHas('kardex_entries', [
        'branch_id' => $this->branchA->id,
        'product_id' => $this->product->id,
        'operation_type' => 'TRANSFERENCIA_CANCELADA',
        'input_quantity' => 10,
    ]);
});

it('can receive a transfer with discrepancies', function () {
    $this->actingAs($this->user);

    $transfer = Transfer::create([
        'uuid' => (string) Str::uuid(),
        'transfer_number' => 'TR-DISC',
        'request_date' => now(),
        'source_branch_id' => $this->branchA->id,
        'destination_branch_id' => $this->branchB->id,
        'status' => 'IN_TRANSIT',
        'created_by' => $this->user->id,
        'company_id' => $this->company->id,
    ]);

    $line = $transfer->lines()->create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $this->product->id,
        'requested_quantity' => 10,
        'shipped_quantity' => 10,
    ]);

    $shipment = $transfer->shipments()->create([
        'uuid' => (string) Str::uuid(),
        'shipment_number' => 'SHP-DISC',
        'shipment_date' => now(),
        'status' => 'SHIPPED',
    ]);

    $shipment->lines()->create([
        'uuid' => (string) Str::uuid(),
        'transfer_line_id' => $line->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
    ]);

    $response = $this->post(route('transfers.receipts.store', $transfer), [
        'notes' => 'Lleg 1 daado y 1 faltante',
        'lines' => [
            [
                'id' => $line->id,
                'received_quantity' => 8,
                'damaged_quantity' => 1,
                'missing_quantity' => 1,
            ],
        ],
    ]);

    $response->assertSessionHas('success');

    $this->assertDatabaseHas('transfers', [
        'id' => $transfer->id,
        'status' => 'WITH_DISCREPANCY',
    ]);

    // Verify Kardex entry in Branch B for GOOD items
    $this->assertDatabaseHas('kardex_entries', [
        'branch_id' => $this->branchB->id,
        'product_id' => $this->product->id,
        'operation_type' => 'TRANSFERENCIA_ENTRADA',
        'input_quantity' => 8,
    ]);

    // Verify Kardex entry in Branch B for DAMAGED items (Entry + Exit)
    $this->assertDatabaseHas('kardex_entries', [
        'branch_id' => $this->branchB->id,
        'product_id' => $this->product->id,
        'operation_type' => 'TRANSFERENCIA_ENTRADA_DANADA',
        'input_quantity' => 1,
    ]);

    $this->assertDatabaseHas('kardex_entries', [
        'branch_id' => $this->branchB->id,
        'product_id' => $this->product->id,
        'operation_type' => 'AJUSTE_MERMA_RECEPCION',
        'output_quantity' => 1,
    ]);

    // Verify physical stock in Branch B is only 8
    $this->assertDatabaseHas('inventories', [
        'branch_id' => $this->branchB->id,
        'product_id' => $this->product->id,
        'physical_quantity' => 8,
    ]);
});

it('correctly calculates weighted average cost in destination branch when receiving a transfer', function () {
    $this->actingAs($this->user);

    $unit = Unit::firstOrCreate(['name' => 'Unidad', 'code' => 'UN']);
    $productTest = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Filtro Test',
        'primary_reference' => 'TEST-FILTRO-01',
        'normalized_reference' => 'TESTFILTRO01',
        'normalized_name' => 'FILTRO TEST',
        'unit_id' => $unit->id,
    ]);

    $kardexService = new KardexService;

    // Sede A (Origen): 10 unidades con costo unitario de S/ 20.00 (Total S/ 200.00)
    $kardexService->recordEntry([
        'branch_id' => $this->branchA->id,
        'product_id' => $productTest->id,
        'quantity' => 10,
        'unit_cost' => 20.00,
        'operation_type' => 'COMPRA',
        'reference' => 'COMPRA INICIAL A',
        'user_id' => $this->user->id,
    ]);

    // Sede B (Destino): 5 unidades con costo unitario de S/ 10.00 (Total S/ 50.00)
    $kardexService->recordEntry([
        'branch_id' => $this->branchB->id,
        'product_id' => $productTest->id,
        'quantity' => 5,
        'unit_cost' => 10.00,
        'operation_type' => 'COMPRA',
        'reference' => 'COMPRA INICIAL B',
        'user_id' => $this->user->id,
    ]);

    // Crear solicitud de transferencia de 5 unidades de A a B
    $transfer = Transfer::create([
        'uuid' => (string) Str::uuid(),
        'transfer_number' => 'TR-000099',
        'request_date' => now(),
        'source_branch_id' => $this->branchA->id,
        'destination_branch_id' => $this->branchB->id,
        'status' => 'DRAFT',
        'created_by' => $this->user->id,
        'company_id' => $this->company->id,
    ]);

    $line = $transfer->lines()->create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $productTest->id,
        'requested_quantity' => 5,
    ]);

    // 1. Despachar en Origen (A)
    $shipResponse = $this->post(route('transfers.shipments.store', $transfer));
    $shipResponse->assertSessionHas('success');

    // Comprobar que en Sede A la línea congeló el costo a 20.00
    $line->refresh();
    expect((float) $line->unit_cost)->toEqual(20.00);
    expect((float) $line->shipped_quantity)->toEqual(5.00);

    // Comprobar inventario en Sede A: Físico = 5, Disponible = 5, average_cost = 20.00
    $invA = Inventory::where('branch_id', $this->branchA->id)->where('product_id', $productTest->id)->first();
    expect((float) $invA->physical_quantity)->toEqual(5.00);
    expect((float) $invA->available_quantity)->toEqual(5.00);
    expect((float) $invA->average_cost)->toEqual(20.00);

    // 2. Recibir en Destino (B)
    $receiveResponse = $this->post(route('transfers.receipts.store', $transfer), [
        'lines' => [
            [
                'id' => $line->id,
                'received_quantity' => 5,
                'damaged_quantity' => 0,
                'missing_quantity' => 0,
            ],
        ],
    ]);
    $receiveResponse->assertSessionHas('success');

    // Comprobar Kardex Entrada en Sede B:
    $lastEntryB = KardexEntry::where('branch_id', $this->branchB->id)
        ->where('product_id', $productTest->id)
        ->orderByDesc('sequence_number')
        ->first();

    expect($lastEntryB->operation_type)->toBe('TRANSFERENCIA_ENTRADA');
    expect((float) $lastEntryB->input_quantity)->toEqual(5.00);
    expect((float) $lastEntryB->input_unit_cost)->toEqual(20.00);
    expect((float) $lastEntryB->input_total_cost)->toEqual(100.00);
    expect((float) $lastEntryB->balance_quantity)->toEqual(10.00);
    expect((float) $lastEntryB->balance_unit_cost)->toEqual(15.00);
    expect((float) $lastEntryB->balance_total_cost)->toEqual(150.00);

    // Comprobar Inventario en Sede B: Físico = 10, Disponible = 10, average_cost = 15.00
    $invB = Inventory::where('branch_id', $this->branchB->id)->where('product_id', $productTest->id)->first();
    expect((float) $invB->physical_quantity)->toEqual(10.00);
    expect((float) $invB->available_quantity)->toEqual(10.00);
    expect((float) $invB->average_cost)->toEqual(15.00);
});
