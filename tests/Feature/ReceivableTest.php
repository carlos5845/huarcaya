<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
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
        'code' => 'CASH',
        'name' => 'Efectivo',
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
        'external_document_type' => 'BOLETA',
        'operation_date' => now(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1.0,
        'tax_mode' => 'INCLUDED',
        'subtotal_amount' => 847.46, 'tax_amount' => 152.54, 'total_amount' => 1000, 'customer_name_snapshot' => 'John Doe', 'customer_document_snapshot' => '88888888',
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
        'original_amount' => 1000,
        'balance_amount' => 1000,
        'status' => 'ACTIVE',
        'notes' => 'Generado por Venta al Crdito',
        'created_by' => $this->user->id,
    ]);
});

test('can register partial payment on a receivable', function () {
    $this->actingAs($this->user);

    $response = $this->post(route('receivables.payments.store', $this->receivable->id), [
        'amount' => 400,
        'payment_method_id' => $this->paymentMethod->id,
        'operation_date' => now()->format('Y-m-d'),
        'notes' => 'Pago parcial 1',
    ]);

    $response->assertSessionHasNoErrors();

    // Check receivable balance
    $this->receivable->refresh();
    $this->assertEquals(600, $this->receivable->balance_amount);
    $this->assertEquals('ACTIVE', $this->receivable->status);

    // Check payment creation
    $this->assertDatabaseHas('payments', [
        'customer_id' => $this->customer->id,
        'total_amount' => 400,
    ]);

    // Check allocations
    $this->assertDatabaseHas('payment_allocations', [
        'receivable_id' => $this->receivable->id,
        'allocated_amount' => 400,
    ]);

    // Check sale payment status
    $this->sale->refresh();
    $this->assertEquals('PARTIAL', $this->sale->payment_status);
});

test('full payment closes receivable', function () {
    $this->actingAs($this->user);

    $response = $this->post(route('receivables.payments.store', $this->receivable->id), [
        'amount' => 1000,
        'payment_method_id' => $this->paymentMethod->id,
        'operation_date' => now()->format('Y-m-d'),
    ]);

    $response->assertSessionHasNoErrors();

    // Check receivable balance
    $this->receivable->refresh();
    $this->assertEquals(0, $this->receivable->balance_amount);
    $this->assertEquals('PAID', $this->receivable->status);

    // Check sale payment status
    $this->sale->refresh();
    $this->assertEquals('PAID', $this->sale->payment_status);
});

test('cannot overpay receivable', function () {
    $this->actingAs($this->user);

    $response = $this->post(route('receivables.payments.store', $this->receivable->id), [
        'amount' => 1500, // Balance is 1000
        'payment_method_id' => $this->paymentMethod->id,
        'operation_date' => now()->format('Y-m-d'),
    ]);

    $response->assertSessionHasErrors(['amount']);
});

test('receivables index returns metrics and customers summary', function () {
    $this->actingAs($this->user);

    $response = $this->get(route('receivables.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('receivables/index')
        ->has('metrics')
        ->where('metrics.total_active_debt_pen', 1000)
        ->where('metrics.overdue_count', 0)
        ->has('customers_summary')
        ->where('customers_summary.0.total_debt_pen', 1000)
    );
});

test('receivables index correctly filters overdue debts', function () {
    $this->actingAs($this->user);

    // Make the receivable overdue
    $this->receivable->update(['due_date' => now()->subDays(5)]);

    $response = $this->get(route('receivables.index', ['status' => 'OVERDUE']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('receivables/index')
        ->where('metrics.overdue_count', 1)
        ->where('metrics.total_overdue_debt_pen', 1000)
        ->has('receivables.data', 1)
        ->where('receivables.data.0.is_overdue', true)
        ->where('receivables.data.0.days_overdue', 5)
    );
});
