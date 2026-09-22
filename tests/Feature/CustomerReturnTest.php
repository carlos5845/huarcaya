<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerReturn;
use App\Models\InventoryMovement;
use App\Models\InventoryMovementLine;
use App\Models\Lot;
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

test('restores lot and maintains inventory parity upon return confirmation', function () {
    $this->actingAs($this->user);

    // Initial lot had 10 units. Sale sold 2, lot was deducted to 8 units.
    $lot = Lot::where('branch_id', $this->branch->id)->where('product_id', $this->product->id)->first();
    $lot->update(['current_quantity' => 8]);

    // Create and confirm return of 1 unit
    $this->post(route('customer-returns.store'), [
        'sale_id' => $this->sale->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Devolución para verificar lote',
        'lines' => [
            [
                'sale_line_id' => $this->saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 50,
            ],
        ],
    ]);

    $return = CustomerReturn::where('notes', 'Devolución para verificar lote')->first();
    $this->post(route('customer-returns.confirm', $return->id));

    $lot->refresh();
    // Lot should be incremented from 8 to 9 units
    expect((float) $lot->current_quantity)->toEqual(9.0);
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
