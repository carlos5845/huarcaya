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
    $this->assertStringContainsString('Amortizado por devolucin', $this->receivable->notes);
});
