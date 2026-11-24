<?php

use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerReturn;
use App\Models\DailyClosing;
use App\Models\Inventory;
use App\Models\Lot;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\SaleLine;
use App\Models\Unit;
use App\Models\User;
use App\Notifications\DailyClosingDiscrepancyNotification;
use App\Services\DailyClosingService;
use App\Services\SaleConfirmationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    foreach (['view_closings', 'view_sales', 'view_receivables', 'view_returns'] as $perm) {
        Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        $superAdminRole->givePermissionTo($perm);
    }

    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Inversiones Huarcaya',
        'business_name' => 'INVERSIONES HUARCAYA S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20601234567',
        'status' => 'ACTIVE',
    ]);

    $this->branchA = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'SUC-A',
        'name' => 'Sucursal Principal A',
        'type' => 'STORE',
        'status' => 'ACTIVE',
    ]);

    $this->branchB = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'SUC-B',
        'name' => 'Sucursal Secundaria B',
        'type' => 'STORE',
        'status' => 'ACTIVE',
    ]);

    $this->user = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branchA->id,
        'status' => 'ACTIVE',
    ]);
    $this->user->assignRole('Super Admin');

    $this->customer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'legal_name' => 'Constructora Los Andes S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20555444333',
        'status' => 'ACTIVE',
        'created_by' => $this->user->id,
    ]);

    $this->cashMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'CASH',
        'name' => 'Efectivo',
        'is_cash' => true,
        'is_active' => true,
    ]);

    $this->yapeMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'YAPE',
        'name' => 'Yape',
        'is_cash' => false,
        'is_active' => true,
    ]);

    $this->posMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'CARD',
        'name' => 'Tarjeta POS',
        'is_cash' => false,
        'is_active' => true,
    ]);

    $brand = Brand::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Caterpillar',
        'normalized_name' => 'CATERPILLAR',
        'status' => 'ACTIVE',
    ]);

    $category = Category::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Filtros',
        'normalized_name' => 'FILTROS',
        'status' => 'ACTIVE',
    ]);

    $unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'NIU',
        'name' => 'Unidad',
        'symbol' => 'UND',
        'status' => 'ACTIVE',
    ]);

    $this->product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'brand_id' => $brand->id,
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'primary_reference' => 'FIL-100',
        'normalized_reference' => 'FIL100',
        'name' => 'Filtro de Aceite 1R-0716',
        'normalized_name' => 'FILTRODEACEITE1R0716',
        'product_type' => 'STANDARD',
        'status' => 'ACTIVE',
    ]);

    // Seed real stock & FIFO lots in both branches
    foreach ([$this->branchA, $this->branchB] as $branch) {
        Inventory::create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $branch->id,
            'product_id' => $this->product->id,
            'physical_quantity' => 50,
            'reserved_quantity' => 0,
            'available_quantity' => 50,
            'average_cost' => 40.0,
        ]);

        Lot::create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $branch->id,
            'product_id' => $this->product->id,
            'lot_number' => 'LOT-INIT-'.$branch->code,
            'original_quantity' => 50,
            'current_quantity' => 50,
            'unit_cost' => 40.0,
            'status' => 'ACTIVE',
        ]);
    }
});

/**
 * Helper to create and optionally confirm a real Sale through SaleConfirmationService.
 */
function createRealSale(
    object $ctx,
    Branch $branch,
    array $overrides = [],
    bool $confirm = true
): Sale {
    $qty = $overrides['quantity'] ?? 1;
    $unitPrice = $overrides['unit_price'] ?? 100.0;
    $total = round($qty * $unitPrice, 2);
    $subtotal = round($total / 1.18, 2);
    $tax = round($total - $subtotal, 2);
    $paymentType = $overrides['payment_type'] ?? 'CASH';
    $initialPayment = $overrides['initial_payment_amount'] ?? ($paymentType === 'CASH' ? $total : 0.0);

    $sale = Sale::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $ctx->company->id,
        'branch_id' => $branch->id,
        'customer_id' => $ctx->customer->id,
        'sale_number' => 'V-'.strtoupper(Str::random(6)),
        'sale_type' => $overrides['sale_type'] ?? 'BOLETA',
        'external_document_type' => array_key_exists('external_document_type', $overrides)
            ? $overrides['external_document_type']
            : ($overrides['sale_type'] ?? 'BOLETA'),
        'payment_type' => $paymentType,
        'payment_method_id' => $overrides['payment_method_id'] ?? $ctx->cashMethod->id,
        'initial_payment_amount' => $initialPayment,
        'payment_status' => $paymentType === 'CASH' ? 'PAID' : ($initialPayment > 0 ? 'PARTIAL' : 'UNPAID'),
        'operation_date' => $overrides['operation_date'] ?? now(),
        'due_date' => $paymentType === 'CREDIT' ? now()->addDays(15) : null,
        'currency_code' => $overrides['currency_code'] ?? 'PEN',
        'exchange_rate' => $overrides['exchange_rate'] ?? 1.0,
        'subtotal_amount' => $subtotal,
        'tax_amount' => $tax,
        'discount_amount' => 0.0,
        'total_amount' => $total,
        'customer_name_snapshot' => $ctx->customer->legal_name,
        'customer_document_snapshot' => $ctx->customer->document_number,
        'status' => $overrides['status'] ?? 'DRAFT',
        'created_by' => $ctx->user->id,
    ]);

    SaleLine::create([
        'uuid' => (string) Str::uuid(),
        'sale_id' => $sale->id,
        'product_id' => $ctx->product->id,
        'product_type_snapshot' => 'STANDARD',
        'product_reference_snapshot' => $ctx->product->primary_reference,
        'product_name_snapshot' => $ctx->product->name,
        'quantity' => $qty,
        'unit_price' => $unitPrice,
        'unit_cost_base' => 40.0,
        'line_subtotal' => $subtotal,
        'discount_amount' => 0.0,
        'tax_amount' => $tax,
        'line_total' => $total,
    ]);

    if ($confirm) {
        app(SaleConfirmationService::class)->confirm($sale->fresh('lines'), $ctx->user->id);
        $sale->refresh();
    }

    return $sale;
}

test('audit 1: strict multi-branch isolation produces exact expected totals per branch', function () {
    $today = now()->toDateString();

    // Sucursal A: S/ 250 Efectivo + S/ 120 Yape = S/ 370
    createRealSale($this, $this->branchA, ['unit_price' => 250.0, 'payment_method_id' => $this->cashMethod->id]);
    createRealSale($this, $this->branchA, ['unit_price' => 120.0, 'payment_method_id' => $this->yapeMethod->id]);

    // Sucursal B: S/ 500 Efectivo
    createRealSale($this, $this->branchB, ['unit_price' => 500.0, 'payment_method_id' => $this->cashMethod->id]);

    $service = app(DailyClosingService::class);
    $metricsA = $service->getDailyMetrics($this->branchA->id, $today);
    $metricsB = $service->getDailyMetrics($this->branchB->id, $today);

    // Sucursal A assertions
    $cashA = collect($metricsA['payment_methods'])->firstWhere('id', $this->cashMethod->id);
    $yapeA = collect($metricsA['payment_methods'])->firstWhere('id', $this->yapeMethod->id);
    $posA = collect($metricsA['payment_methods'])->firstWhere('id', $this->posMethod->id);

    expect($metricsA['sales']['total_amount'])->toEqual(370.0)
        ->and($metricsA['sales']['count'])->toEqual(2)
        ->and($cashA['expected_amount'])->toEqual(250.0)
        ->and($yapeA['expected_amount'])->toEqual(120.0)
        ->and($posA['expected_amount'])->toEqual(0.0)
        ->and($metricsA['total_expected_cash'])->toEqual(370.0);

    // Sucursal B assertions (cero contaminación desde Sucursal A)
    $cashB = collect($metricsB['payment_methods'])->firstWhere('id', $this->cashMethod->id);
    $yapeB = collect($metricsB['payment_methods'])->firstWhere('id', $this->yapeMethod->id);

    expect($metricsB['sales']['total_amount'])->toEqual(500.0)
        ->and($metricsB['sales']['count'])->toEqual(1)
        ->and($cashB['expected_amount'])->toEqual(500.0)
        ->and($yapeB['expected_amount'])->toEqual(0.0)
        ->and($metricsB['total_expected_cash'])->toEqual(500.0);
});

test('audit 2: draft and cancelled sales never pollute daily closing expected cash', function () {
    $today = now()->toDateString();

    // Venta DRAFT (no confirmada) por S/ 999 en Efectivo
    createRealSale($this, $this->branchA, [
        'unit_price' => 999.0,
        'payment_method_id' => $this->cashMethod->id,
        'status' => 'DRAFT',
    ], confirm: false);

    // Venta CANCELLED por S/ 400 en Efectivo
    createRealSale($this, $this->branchA, [
        'unit_price' => 400.0,
        'payment_method_id' => $this->cashMethod->id,
        'status' => 'CANCELLED',
    ], confirm: false);

    $metrics = app(DailyClosingService::class)->getDailyMetrics($this->branchA->id, $today);
    $cashA = collect($metrics['payment_methods'])->firstWhere('id', $this->cashMethod->id);

    expect($metrics['sales']['count'])->toEqual(0)
        ->and($metrics['sales']['total_amount'])->toEqual(0.0)
        ->and($cashA['expected_amount'])->toEqual(0.0)
        ->and($metrics['total_expected_cash'])->toEqual(0.0);
});

test('audit 3: credit sale with initial payment, receivable installment, and cancelled installment matches real cash', function () {
    $today = now()->toDateString();

    // Venta a crédito de S/ 1,000 con adelanto inicial de S/ 300 en Efectivo
    $sale = createRealSale($this, $this->branchA, [
        'unit_price' => 1000.0,
        'payment_type' => 'CREDIT',
        'initial_payment_amount' => 300.0,
        'payment_method_id' => $this->cashMethod->id,
    ]);

    $receivable = Receivable::where('sale_id', $sale->id)->firstOrFail();

    // Abono real de S/ 200 en Yape
    $this->actingAs($this->user)->post(route('receivables.payments.store', $receivable->id), [
        'amount' => 200.0,
        'payment_method_id' => $this->yapeMethod->id,
        'operation_date' => $today,
        'notes' => 'Primer abono Yape',
    ])->assertRedirect();

    // Segundo abono de S/ 100 en Yape que luego será ANULADO
    $this->actingAs($this->user)->post(route('receivables.payments.store', $receivable->id), [
        'amount' => 100.0,
        'payment_method_id' => $this->yapeMethod->id,
        'operation_date' => $today,
        'notes' => 'Abono duplicado a anular',
    ])->assertRedirect();

    $paymentToCancel = Payment::where('notes', 'Abono duplicado a anular')->firstOrFail();

    $this->actingAs($this->user)->post(
        route('receivables.payments.cancel', [$receivable->id, $paymentToCancel->id]),
        ['reason' => 'Error de digitación']
    )->assertRedirect();

    $metrics = app(DailyClosingService::class)->getDailyMetrics($this->branchA->id, $today);
    $cash = collect($metrics['payment_methods'])->firstWhere('id', $this->cashMethod->id);
    $yape = collect($metrics['payment_methods'])->firstWhere('id', $this->yapeMethod->id);

    expect($metrics['sales']['total_amount'])->toEqual(1000.0)
        ->and($metrics['sales']['credit_amount'])->toEqual(1000.0)
        ->and($metrics['sales']['cash_amount'])->toEqual(0.0)
        ->and($cash['expected_amount'])->toEqual(300.0)
        ->and($yape['expected_amount'])->toEqual(200.0)
        ->and($metrics['total_expected_cash'])->toEqual(500.0);
});

test('audit 4: customer return cash refund deducts from cash, store credit does not, and cancelling refund restores cash', function () {
    $today = now()->toDateString();

    // Venta confirmada de 3 unidades a S/ 100 c/u = S/ 300 en Efectivo
    $sale = createRealSale($this, $this->branchA, [
        'quantity' => 3,
        'unit_price' => 100.0,
        'payment_method_id' => $this->cashMethod->id,
    ]);
    $saleLine = $sale->lines()->firstOrFail();

    // Devolución #1: 1 unidad (S/ 100) con CASH_REFUND en Efectivo
    $this->actingAs($this->user)->post(route('customer-returns.store'), [
        'sale_id' => $sale->id,
        'operation_date' => $today,
        'return_type' => 'PARTIAL',
        'settlement_type' => 'CASH_REFUND',
        'refund_payment_method_id' => $this->cashMethod->id,
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 100.0,
                'condition' => 'GOOD',
            ],
        ],
    ])->assertRedirect();

    // Devolución #2: 1 unidad (S/ 100) con STORE_CREDIT (no sale efectivo de caja)
    $this->actingAs($this->user)->post(route('customer-returns.store'), [
        'sale_id' => $sale->id,
        'operation_date' => $today,
        'return_type' => 'PARTIAL',
        'settlement_type' => 'STORE_CREDIT',
        'confirm_now' => true,
        'lines' => [
            [
                'sale_line_id' => $saleLine->id,
                'product_id' => $this->product->id,
                'quantity' => 1,
                'unit_price' => 100.0,
                'condition' => 'GOOD',
            ],
        ],
    ])->assertRedirect();

    $service = app(DailyClosingService::class);
    $metricsAfterReturns = $service->getDailyMetrics($this->branchA->id, $today);
    $cashAfterReturns = collect($metricsAfterReturns['payment_methods'])->firstWhere('id', $this->cashMethod->id);

    // Esperado: 300 cobrados - 100 reembolso efectivo = 200 (los 100 de STORE_CREDIT no salen de caja)
    expect($cashAfterReturns['gross_amount'])->toEqual(300.0)
        ->and($cashAfterReturns['refunded_amount'])->toEqual(100.0)
        ->and($cashAfterReturns['expected_amount'])->toEqual(200.0)
        ->and($metricsAfterReturns['total_refunds_amount'])->toEqual(100.0)
        ->and($metricsAfterReturns['total_expected_cash'])->toEqual(200.0);

    // Anular la devolución #1 (CASH_REFUND) -> el Refund se cancela y el esperado vuelve a S/ 300
    $cashReturn = CustomerReturn::where('settlement_type', 'CASH_REFUND')->firstOrFail();
    $this->actingAs($this->user)->post(route('customer-returns.cancel', $cashReturn->id), [
        'cancellation_reason' => 'Cliente decidió quedarse con el repuesto',
    ])->assertRedirect();

    $metricsAfterCancel = $service->getDailyMetrics($this->branchA->id, $today);
    $cashAfterCancel = collect($metricsAfterCancel['payment_methods'])->firstWhere('id', $this->cashMethod->id);

    expect($cashAfterCancel['refunded_amount'])->toEqual(0.0)
        ->and($cashAfterCancel['expected_amount'])->toEqual(300.0)
        ->and($metricsAfterCancel['total_expected_cash'])->toEqual(300.0);
});

test('audit 5: multicurrency PEN+USD normalization, payment_type cash vs credit (including Yape/POS), and by_document breakdown', function () {
    $today = now()->toDateString();

    // 1. BOLETA Al Contado (payment_type = CASH) pagada con YAPE por S/ 120 (PEN)
    createRealSale($this, $this->branchA, [
        'sale_type' => 'BOLETA',
        'external_document_type' => 'BOLETA',
        'payment_type' => 'CASH',
        'payment_method_id' => $this->yapeMethod->id,
        'currency_code' => 'PEN',
        'exchange_rate' => 1.0,
        'unit_price' => 120.0,
    ]);

    // 2. FACTURA Al Contado (payment_type = CASH) pagada con EFECTIVO por $100 USD (TC 3.80 = S/ 380)
    // Con external_document_type = null para verificar COALESCE(NULLIF(external_document_type, ''), sale_type)
    createRealSale($this, $this->branchA, [
        'sale_type' => 'FACTURA',
        'external_document_type' => null,
        'payment_type' => 'CASH',
        'payment_method_id' => $this->cashMethod->id,
        'currency_code' => 'USD',
        'exchange_rate' => 3.80,
        'unit_price' => 100.0,
    ]);

    // 3. TICKET (Nota de Venta / Otros) Al Crédito (payment_type = CREDIT) por S/ 500 PEN con adelanto S/ 150 en POS
    createRealSale($this, $this->branchA, [
        'sale_type' => 'TICKET',
        'external_document_type' => '',
        'payment_type' => 'CREDIT',
        'payment_method_id' => $this->posMethod->id,
        'initial_payment_amount' => 150.0,
        'currency_code' => 'PEN',
        'exchange_rate' => 1.0,
        'unit_price' => 500.0,
    ]);

    $metrics = app(DailyClosingService::class)->getDailyMetrics($this->branchA->id, $today);

    // Validar condición de pago: Al Contado (Yape S/ 120 + Efectivo USD S/ 380 = S/ 500) vs Al Crédito (S/ 500)
    expect($metrics['sales']['count'])->toEqual(3)
        ->and($metrics['sales']['total_amount'])->toEqual(1000.0)
        ->and($metrics['sales']['cash_amount'])->toEqual(500.0)
        ->and($metrics['sales']['credit_amount'])->toEqual(500.0)
        ->and($metrics['sales']['cash_amount'] + $metrics['sales']['credit_amount'])->toEqual($metrics['sales']['total_amount']);

    // Validar explícitamente contadores y montos por tipo de documento (by_document)
    $byDoc = $metrics['sales']['by_document'];
    expect($byDoc['FACTURA']['count'])->toEqual(1)
        ->and($byDoc['FACTURA']['total'])->toEqual(380.0)
        ->and($byDoc['BOLETA']['count'])->toEqual(1)
        ->and($byDoc['BOLETA']['total'])->toEqual(120.0)
        ->and($byDoc['NOTA_VENTA']['count'])->toEqual(1)
        ->and($byDoc['NOTA_VENTA']['total'])->toEqual(500.0)
        ->and($byDoc['FACTURA']['count'] + $byDoc['BOLETA']['count'] + $byDoc['NOTA_VENTA']['count'])->toEqual($metrics['sales']['count'])
        ->and(round($byDoc['FACTURA']['total'] + $byDoc['BOLETA']['total'] + $byDoc['NOTA_VENTA']['total'], 2))->toEqual($metrics['sales']['total_amount']);

    // Validar arqueo normalizado a Soles por método de pago
    $cash = collect($metrics['payment_methods'])->firstWhere('id', $this->cashMethod->id);
    $yape = collect($metrics['payment_methods'])->firstWhere('id', $this->yapeMethod->id);
    $pos = collect($metrics['payment_methods'])->firstWhere('id', $this->posMethod->id);

    expect($cash['expected_amount'])->toEqual(380.0)
        ->and($yape['expected_amount'])->toEqual(120.0)
        ->and($pos['expected_amount'])->toEqual(150.0)
        ->and($metrics['total_expected_cash'])->toEqual(650.0);
});

test('audit 6: closing confirmation preserves all active payment methods even if omitted in payload and dispatches discrepancy notification', function () {
    Notification::fake();

    $today = now()->toDateString();

    // Sucursal A: S/ 200 Efectivo + S/ 100 Yape = S/ 300 esperado
    createRealSale($this, $this->branchA, ['unit_price' => 200.0, 'payment_method_id' => $this->cashMethod->id]);
    createRealSale($this, $this->branchA, ['unit_price' => 100.0, 'payment_method_id' => $this->yapeMethod->id]);

    // El payload omite intencionalmente Yape y reporta S/ 184.50 en Efectivo (faltante de -15.50 en Efectivo y -100 en Yape = -115.50)
    $response = $this->actingAs($this->user)->post(route('closings.store'), [
        'branch_id' => $this->branchA->id,
        'closing_date' => $today,
        'action' => 'confirm',
        'notes' => 'Cierre auditado con faltante',
        'counts' => [
            [
                'payment_method_id' => $this->cashMethod->id,
                'counted_amount' => 184.50,
            ],
        ],
    ]);

    $response->assertRedirect();

    $closing = DailyClosing::where('branch_id', $this->branchA->id)
        ->whereDate('closing_date', $today)
        ->with('latestVersion.cashCounts')
        ->firstOrFail();

    expect($closing->status)->toBe('CLOSED')
        ->and((float) $closing->latestVersion->total_expected)->toEqual(300.0)
        ->and((float) $closing->latestVersion->total_counted)->toEqual(184.50)
        ->and((float) $closing->difference)->toEqual(-115.50)
        ->and($closing->latestVersion->cashCounts)->toHaveCount(3);

    // Verificar que la notificación de descuadre SÍ se disparó al corregir $closing->difference
    Notification::assertSentTo(
        [$this->user],
        DailyClosingDiscrepancyNotification::class
    );
});
