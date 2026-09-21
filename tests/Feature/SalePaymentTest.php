<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\InventoryMovementLine;
use App\Models\Lot;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
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

    $this->company = $company;
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

    $this->paymentMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $company->id,
        'code' => 'CASH',
        'name' => 'Efectivo',
        'is_cash' => true,
        'is_active' => true,
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
});

test('cash sale creates full payment and receivable automatically', function () {
    $this->actingAs($this->user);

    $response = $this->post('/sales', [
        'customer_id' => $this->customer->id,
        'sale_type' => 'BOLETA',
        'payment_type' => 'CASH',
        'payment_method_id' => $this->paymentMethod->id,
        'operation_date' => now()->format('Y-m-d'),
        'tax_mode' => 'INCLUDED',
        'currency_code' => 'PEN',
        'lines' => [
            [
                'product_id' => $this->product->id,
                'quantity' => 2,
                'unit_price' => 50,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $sale = Sale::first();
    $this->assertNotNull($sale);
    $this->assertEquals('CASH', $sale->payment_type);
    $this->assertEquals($this->paymentMethod->id, $sale->payment_method_id);
    $this->assertEquals(100, $sale->total_amount);

    $confirmResponse = $this->post("/sales/{$sale->id}/confirm");
    $confirmResponse->assertSessionHasNoErrors();

    $this->assertDatabaseHas('receivables', [
        'sale_id' => $sale->id,
        'original_amount' => 100,
        'balance_amount' => 0,
        'status' => 'PAID',
    ]);

    $this->assertDatabaseHas('payments', [
        'customer_id' => $this->customer->id,
        'total_amount' => 100,
        'status' => 'CONFIRMED',
    ]);

    $payment = Payment::first();
    $this->assertDatabaseHas('payment_method_lines', [
        'payment_id' => $payment->id,
        'payment_method_id' => $this->paymentMethod->id,
        'amount' => 100,
    ]);

    $this->assertDatabaseHas('payment_allocations', [
        'payment_id' => $payment->id,
        'allocated_amount' => 100,
    ]);
});
