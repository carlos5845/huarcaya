<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\User;
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

    $this->paymentMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $company->id,
        'name' => 'Efectivo',
        'code' => 'CASH',
        'is_cash' => true,
        'is_active' => true,
    ]);

    $this->sale = Sale::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $company->id,
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'sale_number' => 'B001-000001',
        'sale_type' => 'BOLETA',
        'payment_type' => 'CREDIT',
        'payment_status' => 'UNPAID',
        'operation_date' => now(),
        'currency_code' => 'PEN',
        'subtotal_amount' => 84.75,
        'tax_amount' => 15.25,
        'total_amount' => 100,
        'customer_name_snapshot' => 'John Doe',
        'customer_document_snapshot' => '88888888',
        'status' => 'CONFIRMED',
        'created_by' => $this->user->id,
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
        'created_by' => $this->user->id,
    ]);
});

test('can register a payment and then cancel it, restoring receivable balance', function () {
    $this->actingAs($this->user);

    // 1. Register a payment of 40 PEN
    $response = $this->post(route('receivables.payments.store', $this->receivable->id), [
        'amount' => 40,
        'payment_method_id' => $this->paymentMethod->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Abono parcial',
    ]);

    $response->assertSessionHasNoErrors();
    $this->receivable->refresh();
    expect((float) $this->receivable->balance_amount)->toEqual(60.0);
    expect($this->receivable->status)->toBe('ACTIVE');

    $payment = Payment::first();
    expect($payment)->not->toBeNull();
    expect((float) $payment->total_amount)->toEqual(40.0);
    expect($payment->status)->toBe('CONFIRMED');

    // 2. Cancel the payment
    $cancelResponse = $this->post(route('receivables.payments.cancel', [
        'receivable' => $this->receivable->id,
        'payment' => $payment->id,
    ]), [
        'reason' => 'Error de digitación en monto',
    ]);

    $cancelResponse->assertSessionHasNoErrors();

    // 3. Verify Payment is cancelled and Receivable balance is restored
    $payment->refresh();
    expect($payment->status)->toBe('CANCELLED');
    expect($payment->cancelled_at)->not->toBeNull();
    expect($payment->notes)->toContain('Anulado por usuario');

    $this->receivable->refresh();
    expect((float) $this->receivable->balance_amount)->toEqual(100.0);
    expect($this->receivable->status)->toBe('ACTIVE');

    $this->sale->refresh();
    expect($this->sale->payment_status)->toBe('UNPAID');
});
