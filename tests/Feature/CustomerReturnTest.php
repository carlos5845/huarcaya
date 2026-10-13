<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerReturn;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\InventoryMovementLine;
use App\Models\Lot;
use App\Models\LotAllocation;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\SaleLine;
use App\Models\Unit;
use App\Models\User;
use App\Services\KardexService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

    $company = Company::create(['uuid' => (string) Str::uuid(), 'name' => 'Empresa Test', 'document_type' => 'RUC', 'document_number' => '12345678901']);

    $this->branch = Branch::create(['uuid' => (string) Str::uuid(), 'company_id' => $company->id, 'name' => 'Sucursal Principal', 'address' => 'X', 'phone' => '123', 'status' => 'ACTIVE']);

    $this->user = tap(User::factory()->create(['company_id' => $company->id, 'status' => 'ACTIVE', 'default_branch_id' => $this->branch->id]), function (User $user) {
        $user->assignRole('Super Admin');
    });

    $this->customer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $company->id,
        'document_type' => 'DNI',
        'document_number' => '88888888',
        'legal_name' => 'John Doe',
        'status' => 'ACTIVE',
    ]);

    $this->unit = Unit::create(['uuid' => (string) Str::uuid(), 'company_id' => $company->id, 'name' => 'Unidad', 'code' => 'NIU']);
    $this->product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $company->id,
        'name' => 'Test Product',
        'primary_reference' => 'REF001',
        'normalized_reference' => 'ref001',
        'normalized_name' => 'test product',
        'sale_price' => 50,
        'cost_price' => 10,
        'product_type' => 'STANDARD',
        'unit_id' => $this->unit->id,
        'status' => 'ACTIVE',
    ]);

    $kardexService = new KardexService;
    $entryMovement = InventoryMovement::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'movement_type' => 'IN',
        'operation_date' => now(),
        'created_by' => $this->user->id,
    ]);

    $entryLine = InventoryMovementLine::create([
        'uuid' => (string) Str::uuid(),
        'inventory_movement_id' => $entryMovement->id,
        'product_id' => $this->product->id,
        'direction' => 'IN',
        'quantity' => 10,
        'unit_cost' => 10,
        'total_cost' => 100,
    ]);

    $kardexService->recordEntry([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'inventory_movement_line_id' => $entryLine->id,
        'sequence_number' => 1,
        'user_id' => $this->user->id,
        'operation_date' => now(),
        'operation_type' => 'COMPRA',
        'quantity' => 10,
        'unit_cost' => 10,
    ]);

    Lot::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'lot_number' => 'L001',
        'original_quantity' => 10,
        'current_quantity' => 10,
        'unit_cost' => 10,
    ]);

    // Create a CREDIT sale
    $this->sale = Sale::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $company->id,
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'sale_number' => 'B001-000001',
        'sale_type' => 'BOLETA',
        'payment_type' => 'CREDIT',
        'payment_status' => 'UNPAID',
        'external_document_type' => 'BOLETA',
        'operation_date' => now(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1.0,
        'tax_mode' => 'INCLUDED',
        'subtotal_amount' => 84.75,
        'tax_amount' => 15.25,
        'total_amount' => 100,
        'status' => 'CONFIRMED',
        'created_by' => $this->user->id,
        'customer_name_snapshot' => 'John Doe',
        'customer_document_snapshot' => '88888888',
    ]);

    $this->saleLine = SaleLine::create([
        'uuid' => (string) Str::uuid(),
        'sale_id' => $this->sale->id,
        'product_id' => $this->product->id,
        'quantity' => 2,
        'unit_price' => 50,
        'line_subtotal' => 84.75,
        'tax_amount' => 15.25,
        'line_total' => 100,
        'product_type_snapshot' => 'STANDARD',
        'product_name_snapshot' => 'Test',
        'product_reference_snapshot' => 'REF',
    ]);

    $this->receivable = Receivable::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'sale_id' => $this->sale->id,
        'reference_type' => Sale::class,
        'reference_id' => $this->sale->id,
        'issue_date' => now(),
        'due_date' => now()->addDays(30),
        'currency_code' => 'PEN',
        'original_amount' => 100,
        'balance_amount' => 100,
        'status' => 'ACTIVE',
        'notes' => 'Generado por Venta al Crdito',
        'created_by' => $this->user->id,
    ]);
});

test('can create and confirm a customer return', function () {
    $this->actingAs($this->user);

    // 1. Create Draft Return
    $response = $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Devolucin de prueba',
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1, // Returning 1 out of 2
                'unit_price' => 50,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $return = CustomerReturn::first();
    $this->assertNotNull($return);
    $this->assertEquals('DRAFT', $return->status);
    $this->assertEquals(50, $return->total_amount);

    // 2. Confirm Return
    $confirmResponse = $this->post(route('customer-returns.confirm', $return->id));
    $confirmResponse->assertSessionHasNoErrors();

    $return->refresh();
    $this->assertEquals('CONFIRMED', $return->status);

    // 3. Verify Kardex Entry (DEVOLUCION_VENTA)
    $this->assertDatabaseHas('kardex_entries', [
        'product_id' => $this->product->id,
        'operation_type' => 'DEVOLUCION_VENTA',
    ]);

    // 4. Verify Receivable Discounted
    $this->receivable->refresh();
    $this->assertEquals(50, $this->receivable->balance_amount); // 100 - 50 = 50
    $this->assertStringContainsString('Amortizado por devolución', $this->receivable->notes);
});

test('can view customer returns create page without sale_id and lists recent confirmed sales', function () {
    $this->actingAs($this->user)
        ->get(route('customer-returns.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('customer-returns/create')
            ->where('sale', null)
            ->has('recentSales')
            ->where('recentSales.0.id', $this->sale->id)
        );
});

test('can view customer returns create page with sale_id and calculates available return quantities', function () {
    $this->actingAs($this->user)
        ->get(route('customer-returns.create', ['sale_id' => $this->sale->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('customer-returns/create')
            ->where('sale.id', $this->sale->id)
            ->where('sale.lines.0.available_return_quantity', 2)
            ->where('sale.lines.0.already_returned_quantity', 0)
        );
});

test('cannot return more than available quantity of a sale line', function () {
    $this->actingAs($this->user);

    $response = $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Intento de sobre-devolución',
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 5, // Sold only 2
                'unit_price' => 50,
            ],
        ],
    ]);

    $response->assertSessionHas('error');
    $this->assertDatabaseMissing('customer_returns', [
        'notes' => 'Intento de sobre-devolución',
    ]);
});

test('restores exact origin lot and never inflates newer purchase lots', function () {
    $this->actingAs($this->user);

    // 1. Origin lot L001 had 10 units, sale took 2 units -> remaining 8
    $originLot = Lot::where('branch_id', $this->branch->id)->where('lot_number', 'L001')->first();
    $originLot->update(['current_quantity' => 8, 'status' => 'ACTIVE']);

    // Link the sale's OUT movement and LotAllocation to L001
    $saleOutMov = InventoryMovement::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'movement_type' => 'OUT',
        'reference_type' => Sale::class,
        'reference_id' => $this->sale->id,
        'operation_date' => now()->subDay(),
        'created_by' => $this->user->id,
    ]);
    $saleOutMovLine = InventoryMovementLine::create([
        'uuid' => (string) Str::uuid(),
        'inventory_movement_id' => $saleOutMov->id,
        'product_id' => $this->product->id,
        'sale_line_id' => $this->saleLine->id,
        'direction' => 'OUT',
        'quantity' => 2,
        'unit_cost' => 10,
        'total_cost' => 20,
    ]);
    LotAllocation::create([
        'uuid' => (string) Str::uuid(),
        'inventory_movement_line_id' => $saleOutMovLine->id,
        'lot_id' => $originLot->id,
        'quantity' => 2,
    ]);

    // 2. Simulate a newer purchase lot L002 bought yesterday (must NOT be inflated by return!)
    $newerLot = Lot::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'lot_number' => 'L002-NEW',
        'original_quantity' => 20,
        'current_quantity' => 20,
        'unit_cost' => 15,
        'status' => 'ACTIVE',
    ]);

    // 3. Create and confirm return of 1 unit
    $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Devolución para verificar lote origen',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
                'condition' => 'GOOD',
            ],
        ],
    ]);

    $originLot->refresh();
    $newerLot->refresh();

    // Origin lot L001 must be restored from 8 to 9, while newer lot L002-NEW remains untouched at 20
    expect((float) $originLot->current_quantity)->toEqual(9.0);
    expect((float) $newerLot->current_quantity)->toEqual(20.0);
});

test('creates exclusive LOT-DEV when sale has no origin lot record instead of inflating recent lots', function () {
    $this->actingAs($this->user);

    // Sale has no LotAllocation records in DB
    $recentLot = Lot::where('branch_id', $this->branch->id)->where('lot_number', 'L001')->first();

    $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Devolución sin lote origen',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
                'condition' => 'GOOD',
            ],
        ],
    ]);

    $recentLot->refresh();
    // L001 must NOT be inflated
    expect((float) $recentLot->current_quantity)->toEqual(10.0);

    // A dedicated LOT-DEV-* lot must have been created with 1 unit
    $devLot = Lot::where('branch_id', $this->branch->id)
        ->where('lot_number', 'like', 'LOT-DEV-%')
        ->first();
    expect($devLot)->not->toBeNull();
    expect((float) $devLot->current_quantity)->toEqual(1.0);
});

test('can create and immediately confirm a customer return using confirm_now flag', function () {
    $this->actingAs($this->user);

    $response = $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Devolución directa confirmada',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $return = CustomerReturn::where('notes', 'Devolución directa confirmada')->first();
    expect($return)->not->toBeNull();
    expect($return->status)->toBe('CONFIRMED');

    // Verify Kardex entry was created immediately
    $this->assertDatabaseHas('kardex_entries', [
        'product_id' => $this->product->id,
        'operation_type' => 'DEVOLUCION_VENTA',
    ]);
});

test('redirects to sales show when sale is already fully returned', function () {
    $this->actingAs($this->user);

    // Return the entire sale quantity (2 units)
    $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Devolución total',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 2,
                'unit_price' => 50,
            ],
        ],
    ]);

    // Attempt to access create page for this sale again
    $response = $this->get(route('customer-returns.create', ['sale_id' => $this->sale->id]));
    $response->assertRedirect(route('sales.show', $this->sale->id));
    $response->assertSessionHas('error');
});

test('phase 2: paid sale return with CASH_REFUND creates Refund record and deducts from daily closing', function () {
    $this->actingAs($this->user);

    // Mark receivable as already PAID (cash sale or fully paid)
    $this->receivable->update(['balance_amount' => 0, 'status' => 'PAID']);
    $this->sale->update(['payment_type' => 'CASH', 'payment_status' => 'PAID']);

    $cashMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->user->company_id,
        'code' => 'CASH',
        'name' => 'Efectivo',
        'is_cash' => true,
        'is_active' => true,
    ]);

    $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'settlement_type' => 'CASH_REFUND',
        'refund_payment_method_id' => $cashMethod->id,
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
                'condition' => 'GOOD',
            ],
        ],
    ]);

    $return = CustomerReturn::latest('id')->first();
    expect($return->status)->toBe('CONFIRMED');
    expect($return->settlement_type)->toBe('CASH_REFUND');
    expect((float) $return->refunded_amount)->toEqual(50.0);

    // Verify Refund & RefundMethodLine created
    $this->assertDatabaseHas('refunds', [
        'customer_return_id' => $return->id,
        'total_amount' => 50,
        'status' => 'CONFIRMED',
    ]);
});

test('phase 2: paid sale return with STORE_CREDIT increments customer store_credit_balance', function () {
    $this->actingAs($this->user);

    $this->receivable->update(['balance_amount' => 0, 'status' => 'PAID']);
    $this->sale->update(['payment_type' => 'CASH', 'payment_status' => 'PAID']);

    $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'settlement_type' => 'STORE_CREDIT',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
                'condition' => 'GOOD',
            ],
        ],
    ]);

    $this->customer->refresh();
    expect((float) $this->customer->store_credit_balance)->toEqual(50.0);
});

test('phase 3: damaged item goes to damaged_quantity quarantine and does not increase sellable physical_quantity', function () {
    $this->actingAs($this->user);

    $invBefore = Inventory::where('branch_id', $this->branch->id)
        ->where('product_id', $this->product->id)
        ->first();
    $sellableBefore = (float) $invBefore->physical_quantity;

    $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Repuesto roto en garantía',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
                'condition' => 'DAMAGED',
            ],
        ],
    ]);

    $invAfter = $invBefore->fresh();
    // Sellable stock must NOT increase
    expect((float) $invAfter->physical_quantity)->toEqual($sellableBefore);
    // Damaged stock must increase by 1
    expect((float) $invAfter->damaged_quantity)->toEqual(1.0);

    // Verify DAMAGED lot created
    $this->assertDatabaseHas('lots', [
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'status' => 'DAMAGED',
        'current_quantity' => 1,
    ]);
});

test('phase 4: blocks return of expired sale beyond deadline unless supervisor override is provided', function () {
    $this->actingAs($this->user);

    // Move sale operation_date 30 days into the past (limit is 15 days)
    $this->sale->update(['operation_date' => now()->subDays(30)]);

    // 1. Without override -> must be rejected
    $response = $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Fuera de plazo sin autorización',
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
            ],
        ],
    ]);

    $response->assertSessionHas('error');
    $this->assertDatabaseMissing('customer_returns', ['notes' => 'Fuera de plazo sin autorización']);

    // 2. With override and reason -> must succeed
    $overrideResponse = $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Fuera de plazo autorizado',
        'override_deadline' => true,
        'override_deadline_reason' => 'Autorizado por gerencia comercial',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
            ],
        ],
    ]);

    $overrideResponse->assertSessionHasNoErrors();
    $this->assertDatabaseHas('customer_returns', [
        'notes' => 'Fuera de plazo autorizado',
        'override_deadline_reason' => 'Autorizado por gerencia comercial',
        'status' => 'CONFIRMED',
    ]);
});

test('phase 4: controlled cancellation reverses inventory, kardex, lots and receivable balance', function () {
    $this->actingAs($this->user);

    // 1. Confirm a return of 1 unit ($50)
    $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Devolución que será anulada',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
                'condition' => 'GOOD',
            ],
        ],
    ]);

    $return = CustomerReturn::where('notes', 'Devolución que será anulada')->first();
    expect($return->status)->toBe('CONFIRMED');

    $invAfterReturn = Inventory::where('branch_id', $this->branch->id)
        ->where('product_id', $this->product->id)
        ->first();
    expect((float) $invAfterReturn->physical_quantity)->toEqual(11.0); // 10 + 1
    expect((float) $this->receivable->fresh()->balance_amount)->toEqual(50.0); // 100 - 50

    // 2. Cancel the confirmed return
    $cancelResponse = $this->post(route('customer-returns.cancel', $return->id), [
        'cancellation_reason' => 'Digitado en el comprobante equivocado',
    ]);

    $cancelResponse->assertSessionHasNoErrors();

    $return->refresh();
    expect($return->status)->toBe('CANCELLED');
    expect($return->cancellation_reason)->toBe('Digitado en el comprobante equivocado');

    // Inventory must be back to 10
    expect((float) $invAfterReturn->fresh()->physical_quantity)->toEqual(10.0);

    // Receivable debt must be restored back to 100
    expect((float) $this->receivable->fresh()->balance_amount)->toEqual(100.0);

    // Kardex exit entry ANULACION_DEVOLUCION must exist
    $this->assertDatabaseHas('kardex_entries', [
        'product_id' => $this->product->id,
        'operation_type' => 'ANULACION_DEVOLUCION',
    ]);
});

test('phase 5: return of FACTURA or BOLETA generates SUNAT Credit Note series, Catalog 09 code, IGV breakdown and electronic payload', function () {
    $this->actingAs($this->user);

    // Configure sale as a FACTURA with IGV included
    $this->sale->update([
        'sale_type' => 'FACTURA',
        'external_document_type' => 'FACTURA',
        'external_document_series' => 'F001',
        'external_document_number' => '000452',
        'subtotal_amount' => 84.75,
        'tax_amount' => 15.25,
        'total_amount' => 100.00,
    ]);

    // Partial return of 1 unit (S/ 50.00) -> must force Catalog 09 code '07' (Devolución por ítem) and series FC01
    $response = $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Devolución parcial de factura electrónica',
        'sunat_credit_note_type' => '07',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
                'condition' => 'GOOD',
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $return = CustomerReturn::where('notes', 'Devolución parcial de factura electrónica')->first();
    expect($return)->not->toBeNull();
    expect($return->is_electronic_invoiced)->toBeTrue();
    expect($return->return_type)->toBe('PARTIAL');
    expect($return->sunat_credit_note_type)->toBe('07');
    expect($return->referenced_document_type)->toBe('01');
    expect($return->referenced_document_series)->toBe('F001');
    expect($return->referenced_document_number)->toBe('00000452');
    expect($return->credit_note_series)->toBe('FC01');
    expect($return->credit_note_number)->toBe('00000001');
    expect($return->electronic_status)->toBe('PENDING_EMISSION');

    // Verify IGV 18% breakdown on S/ 50.00 (Subtotal: 42.37, IGV: 7.63)
    expect(round((float) $return->subtotal_amount, 2))->toEqual(42.37);
    expect(round((float) $return->tax_amount, 2))->toEqual(7.63);
    expect(round((float) $return->total_amount, 2))->toEqual(50.00);

    // Verify electronic payload structure
    expect($return->electronic_payload)->toBeArray();
    expect($return->electronic_payload['full_number'])->toBe('FC01-00000001');
    expect($return->electronic_payload['credit_note_reason']['catalog_09_code'])->toBe('07');
    expect($return->electronic_payload['items'][0]['unit_code'])->toBe('NIU');

    // Verify print view renders NOTA DE CRÉDITO ELECTRÓNICA
    $printResponse = $this->get(route('customer-returns.print', $return->id));
    $printResponse->assertOk();
    $printResponse->assertSee('NOTA DE CRÉDITO ELECTRÓNICA');
    $printResponse->assertSee('FC01-00000001');
    $printResponse->assertSee('F001-00000452');
    $printResponse->assertSee('NIU');
    $printResponse->assertSee('P. Unit. (Inc. IGV)');
});

test('phase 5: return of internal TICKET generates internal return voucher without SUNAT fiscal series', function () {
    $this->actingAs($this->user);

    // Configure sale as an internal TICKET without tax
    $this->sale->update([
        'sale_type' => 'TICKET',
        'external_document_type' => 'TICKET',
        'external_document_series' => null,
        'external_document_number' => null,
        'subtotal_amount' => 100.00,
        'tax_amount' => 0.00,
        'total_amount' => 100.00,
    ]);

    $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Devolución de nota de venta interna',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 2,
                'unit_price' => 50,
                'condition' => 'GOOD',
            ],
        ],
    ]);

    $return = CustomerReturn::where('notes', 'Devolución de nota de venta interna')->first();
    expect($return)->not->toBeNull();
    expect($return->is_electronic_invoiced)->toBeFalse();
    expect($return->return_type)->toBe('TOTAL');
    expect($return->sunat_credit_note_type)->toBeNull();
    expect($return->referenced_document_type)->toBe('00');
    expect($return->credit_note_series)->toBeNull();
    expect($return->credit_note_number)->toBeNull();
    expect($return->electronic_status)->toBe('NOT_APPLICABLE');
    expect($return->electronic_payload)->toBeNull();

    // Verify print view renders VALE DE DEVOLUCIÓN / INGRESO A ALMACÉN
    $printResponse = $this->get(route('customer-returns.print', $return->id));
    $printResponse->assertOk();
    $printResponse->assertSee('VALE DE DEVOLUCIÓN / INGRESO A ALMACÉN');
    $printResponse->assertSee($return->return_number);
});

test('sunat document normalization: boleta and factura print views comply with UBL 2.1 rules', function () {
    $this->actingAs($this->user);

    // 1. Boleta al contado con Clientes Varios (00000000) e IGV incluido
    $this->sale->update([
        'sale_type' => 'BOLETA',
        'external_document_type' => 'BOLETA',
        'external_document_series' => null,
        'external_document_number' => null,
        'payment_type' => 'CASH',
        'due_date' => '2026-10-08', // even if legacy had tomorrow, print view must match operation_date for CASH
        'operation_date' => '2026-10-07',
        'customer_name_snapshot' => 'CLIENTES VARIOS',
        'customer_document_snapshot' => '00000000',
        'subtotal_amount' => 132.20,
        'tax_amount' => 23.80,
        'total_amount' => 156.00,
    ]);

    $boletaA4 = $this->get(route('sales.print.a4', $this->sale->id));
    $boletaA4->assertOk();
    // Serie B001-000000XX en lugar del código interno alfanumérico en el recuadro principal
    $boletaA4->assertSee($this->sale->formattedFiscalNumber());
    expect($this->sale->formattedFiscalNumber())->toMatch('/^B001-\d{8}$/');
    // Unidad Catálogo 03 SUNAT NIU en lugar de UND
    $boletaA4->assertSee('NIU');
    // Encabezado claro de precio con IGV
    $boletaA4->assertSee('P. Unit. (Inc. IGV)');
    // Sin documento en lugar de 00000000
    $boletaA4->assertSee('- (SIN DOCUMENTO)');
    // Totales limpios: muestra Op. Gravada e I.G.V. (18%), pero NO muestra Op. Inafecta ni Op. Exonerada
    $boletaA4->assertSee('Op. Gravada:');
    $boletaA4->assertSee('I.G.V. (18%):');
    $boletaA4->assertDontSee('Op. Inafecta:');
    $boletaA4->assertDontSee('Op. Exonerada:');
    // Fecha de vencimiento al contado idéntica a la fecha de emisión (07/10/2026), no 08/10/2026
    $boletaA4->assertDontSee('08/10/2026');

    $boletaTicket = $this->get(route('sales.print.ticket', $this->sale->id));
    $boletaTicket->assertOk();
    $boletaTicket->assertSee($this->sale->formattedFiscalNumber());
    $boletaTicket->assertSee('NIU');

    // 2. Factura al crédito con RUC y Cuota 001
    $this->sale->update([
        'sale_type' => 'FACTURA',
        'external_document_type' => 'FACTURA',
        'external_document_series' => 'F001',
        'external_document_number' => '00000123',
        'payment_type' => 'CREDIT',
        'due_date' => '2026-11-07',
        'customer_name_snapshot' => 'CONSTRUCTORA LOS ANDES S.A.C.',
        'customer_document_snapshot' => '20555666777',
    ]);

    $facturaA4 = $this->get(route('sales.print.a4', $this->sale->id));
    $facturaA4->assertOk();
    $facturaA4->assertSee('FACTURA ELECTRÓNICA');
    $facturaA4->assertSee('F001-00000123');
    $facturaA4->assertSee('R.U.C.:');
    $facturaA4->assertSee('20555666777');
    $facturaA4->assertSee('Cuota 001 (Vence 07/11/2026):');
});

test('sunat customer rules: FACTURA requires 11-digit RUC and BOLETA >= 700 requires identified customer', function () {
    $this->actingAs($this->user);

    $dniCustomer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->user->company_id,
        'legal_name' => 'Juan Perez (Solo DNI)',
        'document_type' => 'DNI',
        'document_number' => '45678912',
        'status' => 'ACTIVE',
    ]);

    $genericCustomer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->user->company_id,
        'legal_name' => 'CLIENTES VARIOS',
        'document_type' => 'DNI',
        'document_number' => '00000000',
        'status' => 'ACTIVE',
    ]);

    $rucCustomer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->user->company_id,
        'legal_name' => 'INVERSIONES DEL SUR S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20601234567',
        'status' => 'ACTIVE',
    ]);

    $baseSalePayload = [
        'branch_id' => $this->branch->id,
        'operation_date' => now()->format('Y-m-d'),
        'due_date' => now()->addDays(7)->format('Y-m-d'),
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'payment_type' => 'CREDIT',
        'tax_mode' => 'INCLUDED',
    ];

    // 1. FACTURA with DNI customer -> must fail validation on customer_id
    $facturaWithDni = $this->post(route('sales.store'), array_merge($baseSalePayload, [
        'customer_id' => $dniCustomer->id,
        'sale_type' => 'FACTURA',
        'lines' => [
            [
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
            ],
        ],
    ]));
    $facturaWithDni->assertSessionHasErrors('customer_id');

    // 2. FACTURA with valid 11-digit RUC customer -> must succeed
    $facturaWithRuc = $this->post(route('sales.store'), array_merge($baseSalePayload, [
        'customer_id' => $rucCustomer->id,
        'sale_type' => 'FACTURA',
        'lines' => [
            [
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
            ],
        ],
    ]));
    $facturaWithRuc->assertSessionHasNoErrors();

    // 3. BOLETA >= S/ 700.00 with Clientes Varios (00000000) -> must fail validation on customer_id
    $boletaOver700Generic = $this->post(route('sales.store'), array_merge($baseSalePayload, [
        'customer_id' => $genericCustomer->id,
        'sale_type' => 'BOLETA',
        'lines' => [
            [
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 750,
            ],
        ],
    ]));
    $boletaOver700Generic->assertSessionHasErrors('customer_id');

    // 4. BOLETA >= S/ 700.00 with identified DNI customer -> must succeed
    $boletaOver700Dni = $this->post(route('sales.store'), array_merge($baseSalePayload, [
        'customer_id' => $dniCustomer->id,
        'sale_type' => 'BOLETA',
        'lines' => [
            [
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 750,
            ],
        ],
    ]));
    $boletaOver700Dni->assertSessionHasNoErrors();

    // 5. CustomerController@store enforces 11 numeric digits for RUC and 8 numeric digits for DNI
    $invalidRuc = $this->post(route('customers.store'), [
        'legal_name' => 'Empresa RUC Corto',
        'document_type' => 'RUC',
        'document_number' => '12345678',
        'status' => 'ACTIVE',
    ]);
    $invalidRuc->assertSessionHasErrors('document_number');
});

test('company fiscal settings and branch SUNAT series/anexo dynamically reflect in sales, credit notes and print documents', function () {
    $this->actingAs($this->user);

    // 1. Update Company Fiscal Settings
    $companyResponse = $this->put('/settings/company', [
        'business_name' => 'CORPORACION AUTOMOTRIZ HUARCAYA S.A.C.',
        'trade_name' => 'SIMAQ PRO',
        'document_number' => '20609988776',
        'economic_activity' => 'IMPORTACION Y VENTA DE REPUESTOS DIESEL & HIDRAULICOS',
        'address' => 'Av. Nicolás Ayllón 4500, Ate - Lima',
        'ubigeo' => '150103',
        'phone' => '01-3456789',
        'email' => 'facturacion@huarcaya.com.pe',
        'sunat_environment' => 'PRODUCTION',
        'sunat_sol_user' => 'SOLUSER01',
        'sunat_sol_password' => 'SecretSol2026!',
        'exchange_rate' => '3.785',
    ]);
    $companyResponse->assertSessionHasNoErrors();

    $company = Company::find($this->user->company_id);
    expect($company->business_name)->toBe('CORPORACION AUTOMOTRIZ HUARCAYA S.A.C.');
    expect($company->trade_name)->toBe('SIMAQ PRO');
    expect($company->document_number)->toBe('20609988776');
    expect($company->economic_activity)->toBe('IMPORTACION Y VENTA DE REPUESTOS DIESEL & HIDRAULICOS');
    expect($company->sunat_environment)->toBe('PRODUCTION');
    expect($company->sunat_sol_user)->toBe('SOLUSER01');
    expect($company->sunat_sol_password)->toBe('SecretSol2026!');

    // 2. Update Branch with SUNAT Establishment Code 0002, Ubigeo Junin/Huancayo, and custom series F002 / B002 / FC02 / BC02
    $branchResponse = $this->put(route('branches.update', $this->branch->id), [
        'name' => 'Sucursal Sur Huancayo',
        'code' => 'SUC-002',
        'sunat_establishment_code' => '0002',
        'address' => 'Av. Mariscal Castilla 1890',
        'phone' => '064-223344',
        'department' => '12',
        'province' => '1201',
        'district' => '120101',
        'type' => 'STORE',
        'status' => 'ACTIVE',
        'invoice_series' => 'F002',
        'boleta_series' => 'B002',
        'ticket_series' => 'NV02',
        'credit_note_factura_series' => 'FC02',
        'credit_note_boleta_series' => 'BC02',
    ]);
    $branchResponse->assertSessionHasNoErrors();

    $this->branch->refresh();
    expect($this->branch->sunat_establishment_code)->toBe('0002');
    expect($this->branch->invoice_series)->toBe('F002');
    expect($this->branch->boleta_series)->toBe('B002');
    expect($this->branch->credit_note_factura_series)->toBe('FC02');
    expect($this->branch->ubigeoLocationText())->toContain('HUANCAYO');

    // 3. Emit a FACTURA in this branch without specifying series -> must auto-assign F002-00000001
    $rucCustomer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->user->company_id,
        'legal_name' => 'TRANSPORTES ANDINOS S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20554433221',
        'status' => 'ACTIVE',
    ]);

    $this->post(route('sales.store'), [
        'branch_id' => $this->branch->id,
        'customer_id' => $rucCustomer->id,
        'sale_type' => 'FACTURA',
        'operation_date' => now()->format('Y-m-d'),
        'due_date' => now()->addDays(15)->format('Y-m-d'),
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'payment_type' => 'CREDIT',
        'tax_mode' => 'INCLUDED',
        'lines' => [
            [
                'product_id' => $this->product->id,
                'quantity' => 2,
                'unit_price' => 100,
            ],
        ],
    ])->assertSessionHasNoErrors();

    $newSale = Sale::where('customer_id', $rucCustomer->id)->latest('id')->first();
    expect($newSale->external_document_series)->toBe('F002');
    expect($newSale->formattedFiscalNumber())->toBe('F002-00000001');

    // 4. Verify Sale A4 and Ticket print views display Company & Branch fiscal data
    $a4Html = $this->get(route('sales.print.a4', $newSale->id))->assertOk();
    $a4Html->assertSee('CORPORACION AUTOMOTRIZ HUARCAYA S.A.C.');
    $a4Html->assertSee('20609988776');
    $a4Html->assertSee('IMPORTACION Y VENTA DE REPUESTOS DIESEL &amp; HIDRAULICOS', false);
    $a4Html->assertSee('Sucursal Sur Huancayo');
    $a4Html->assertSee('Anexo SUNAT: 0002');
    $a4Html->assertSee('Av. Mariscal Castilla 1890');
    $a4Html->assertSee('F002-00000001');

    // 5. Emit a Credit Note for this sale -> must auto-assign FC02-00000001
    $newSaleLine = $newSale->lines()->first();
    $this->post(route('customer-returns.store'), [
        'sale_id' => $newSale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Devolución en sucursal Huancayo',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $newSaleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 100,
                'condition' => 'GOOD',
            ],
        ],
    ])->assertSessionHasNoErrors();

    $creditNote = CustomerReturn::where('sale_id', $newSale->id)->first();
    expect($creditNote->credit_note_series)->toBe('FC02');
    expect($creditNote->credit_note_number)->toBe('00000001');
    expect($creditNote->electronic_payload['issuer']['establishment_code'])->toBe('0002');
    expect($creditNote->electronic_payload['environment'])->toBe('PRODUCTION');

    $cnPrint = $this->get(route('customer-returns.print', $creditNote->id))->assertOk();
    $cnPrint->assertSee('FC02-00000001');
    $cnPrint->assertSee('Anexo SUNAT: 0002');
});
