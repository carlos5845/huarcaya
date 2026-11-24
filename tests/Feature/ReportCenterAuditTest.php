<?php

use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Company;
use App\Models\Conflict;
use App\Models\Customer;
use App\Models\DailyClosing;
use App\Models\DailyClosingVersion;
use App\Models\Inventory;
use App\Models\InventoryExit;
use App\Models\KardexEntry;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\PaymentMethodLine;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\SyncOperation;
use App\Models\Transfer;
use App\Models\Unit;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Empresa Reportes Test',
        'business_name' => 'EMPRESA REPORTES TEST S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20609998881',
        'status' => 'ACTIVE',
    ]);

    $this->branchA = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Norte',
        'code' => 'SUC-N',
        'status' => 'ACTIVE',
    ]);

    $this->branchB = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Sur',
        'code' => 'SUC-S',
        'status' => 'ACTIVE',
    ]);

    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $viewReportsPerm = Permission::firstOrCreate(['name' => 'view_reports', 'guard_name' => 'web']);
    $managerRole = Role::firstOrCreate(['name' => 'Gerente Reportes', 'guard_name' => 'web']);
    $managerRole->givePermissionTo($viewReportsPerm);

    $this->admin = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branchA->id,
        'must_change_password' => false,
    ]);
    $this->admin->assignRole($superAdminRole);

    $this->branchAUser = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branchA->id,
        'must_change_password' => false,
    ]);
    $this->branchAUser->assignRole($managerRole);
    $this->branchAUser->branches()->attach($this->branchA->id);

    $this->multiBranchUser = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branchA->id,
        'must_change_password' => false,
    ]);
    $this->multiBranchUser->assignRole($managerRole);
    $this->multiBranchUser->branches()->attach([$this->branchA->id, $this->branchB->id]);

    $this->brand = Brand::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'BOSCH',
        'normalized_name' => 'bosch',
        'status' => 'ACTIVE',
    ]);

    $this->category = Category::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'FILTROS',
        'normalized_name' => 'filtros',
        'status' => 'ACTIVE',
    ]);

    $this->unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'NIU',
        'name' => 'Unidad',
        'symbol' => 'UND',
        'allows_decimals' => false,
        'status' => 'ACTIVE',
    ]);

    $this->productA = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'internal_code' => 'FLT-001',
        'primary_reference' => 'REF-A1',
        'normalized_reference' => 'ref-a1',
        'name' => 'FILTRO DE ACEITE MOTOR',
        'normalized_name' => 'filtro de aceite motor',
        'product_type' => 'STANDARD',
        'status' => 'ACTIVE',
    ]);

    $this->productB = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'internal_code' => 'BUJ-002',
        'primary_reference' => 'REF-B2',
        'normalized_reference' => 'ref-b2',
        'name' => 'BUJIA IRIDIUM',
        'normalized_name' => 'bujia iridium',
        'product_type' => 'STANDARD',
        'status' => 'ACTIVE',
    ]);

    $this->customerA = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'document_type' => 'RUC',
        'document_number' => '20551122334',
        'legal_name' => 'TRANSPORTES ANDINOS S.A.C.',
        'status' => 'ACTIVE',
    ]);

    $this->supplierA = Supplier::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'document_type' => 'RUC',
        'document_number' => '20445566778',
        'legal_name' => 'IMPORTADORA REPUESTOS PERU S.A.C.',
        'status' => 'ACTIVE',
    ]);

    $this->paymentMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Efectivo',
        'code' => 'CASH',
        'is_cash' => true,
        'is_active' => true,
    ]);
});

test('sales, purchases, payments and receivables use real columns, accurate KPIs and case-insensitive search', function () {
    $today = now()->format('Y-m-d');

    $saleA = Sale::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branchA->id,
        'customer_id' => $this->customerA->id,
        'sale_number' => 'B001-000101',
        'sale_type' => 'BOLETA',
        'payment_type' => 'CREDIT',
        'payment_status' => 'PARTIAL',
        'operation_date' => now(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'subtotal_amount' => 254.24,
        'discount_amount' => 0,
        'tax_amount' => 45.76,
        'total_amount' => 300.00,
        'status' => 'CONFIRMED',
        'customer_name_snapshot' => 'TRANSPORTES ANDINOS S.A.C.',
        'created_by' => $this->admin->id,
    ]);

    Sale::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branchB->id,
        'customer_id' => $this->customerA->id,
        'sale_number' => 'B002-000202',
        'sale_type' => 'BOLETA',
        'payment_type' => 'CASH',
        'payment_status' => 'PAID',
        'operation_date' => now(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'subtotal_amount' => 84.75,
        'discount_amount' => 0,
        'tax_amount' => 15.25,
        'total_amount' => 100.00,
        'status' => 'CONFIRMED',
        'customer_name_snapshot' => 'TRANSPORTES ANDINOS S.A.C.',
        'created_by' => $this->admin->id,
    ]);

    Purchase::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branchA->id,
        'supplier_id' => $this->supplierA->id,
        'purchase_number' => 'CMP-000001',
        'supplier_document_type' => 'FACTURA',
        'supplier_document_series' => 'F001',
        'supplier_document_number' => '00001234',
        'document_date' => $today,
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'subtotal_amount' => 423.73,
        'tax_amount' => 76.27,
        'total_amount' => 500.00,
        'status' => 'CONFIRMED',
        'created_by' => $this->admin->id,
    ]);

    $paymentA = Payment::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'customer_id' => $this->customerA->id,
        'payment_number' => 'PAG-000001',
        'operation_date' => now(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'total_amount' => 120.00,
        'status' => 'CONFIRMED',
        'created_by' => $this->admin->id,
    ]);

    PaymentMethodLine::create([
        'uuid' => (string) Str::uuid(),
        'payment_id' => $paymentA->id,
        'payment_method_id' => $this->paymentMethod->id,
        'amount' => 120.00,
    ]);

    Payment::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'customer_id' => $this->customerA->id,
        'payment_number' => 'PAG-000002',
        'operation_date' => now(),
        'currency_code' => 'PEN',
        'exchange_rate' => 1,
        'total_amount' => 999.00,
        'status' => 'CANCELLED',
        'created_by' => $this->admin->id,
    ]);

    Receivable::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'customer_id' => $this->customerA->id,
        'sale_id' => $saleA->id,
        'issue_date' => now(),
        'due_date' => now()->addDays(15)->toDateString(),
        'currency_code' => 'PEN',
        'original_amount' => 300.00,
        'balance_amount' => 180.00,
        'status' => 'ACTIVE',
        'created_by' => $this->admin->id,
    ]);

    // Receivable outside date range should be excluded when filtering by issue_date
    Receivable::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'customer_id' => $this->customerA->id,
        'sale_id' => $saleA->id,
        'issue_date' => now()->subMonths(3),
        'due_date' => now()->subMonths(2)->toDateString(),
        'currency_code' => 'PEN',
        'original_amount' => 500.00,
        'balance_amount' => 500.00,
        'status' => 'ACTIVE',
        'created_by' => $this->admin->id,
    ]);

    $service = app(ReportService::class);
    $filtersA = [
        'company_id' => $this->company->id,
        'branch_id' => (string) $this->branchA->id,
        'date_from' => $today,
        'date_to' => $today,
    ];

    // 1. Sales: branch A only + lowercase search by customer.legal_name
    $sales = $service->getReportData('sales', [$this->branchA->id, $this->branchB->id], [...$filtersA, 'search' => 'andinos']);
    expect($sales['rows']->total())->toBe(1)
        ->and($sales['rows']->items()[0]['customer'])->toBe('TRANSPORTES ANDINOS S.A.C.')
        ->and($sales['kpis'][1]['value'])->toBe('S/ 300.00');

    // 2. Purchases: lowercase search by supplier.legal_name and RUC
    $purchases = $service->getReportData('purchases', [$this->branchA->id, $this->branchB->id], [...$filtersA, 'search' => 'importadora']);
    expect($purchases['rows']->total())->toBe(1)
        ->and($purchases['rows']->items()[0]['supplier'])->toBe('IMPORTADORA REPUESTOS PERU S.A.C.')
        ->and($purchases['kpis'][1]['value'])->toBe('S/ 500.00');

    // 3. Payments: CONFIRMED counted, CANCELLED excluded, customer.legal_name resolved
    $payments = $service->getReportData('payments', [$this->branchA->id, $this->branchB->id], [...$filtersA, 'search' => 'transportes']);
    expect($payments['kpis'][0]['value'])->toBe('1')
        ->and($payments['kpis'][1]['value'])->toBe('S/ 120.00')
        ->and($payments['rows']->items()[0]['customer'])->toBe('TRANSPORTES ANDINOS S.A.C.');

    // 4. Receivables: filtered by issue_date, computes original/paid/balance and resolves sale_number + legal_name
    $receivables = $service->getReportData('receivables', [$this->branchA->id, $this->branchB->id], [...$filtersA, 'search' => 'b001']);
    expect($receivables['rows']->total())->toBe(1)
        ->and($receivables['kpis'][0]['value'])->toBe('S/ 180.00')
        ->and($receivables['kpis'][2]['value'])->toBe('1')
        ->and($receivables['rows']->items()[0]['receivable_number'])->toBe('B001-000101')
        ->and($receivables['rows']->items()[0]['customer'])->toBe('TRANSPORTES ANDINOS S.A.C.')
        ->and($receivables['rows']->items()[0]['original'])->toEqual(300.0)
        ->and($receivables['rows']->items()[0]['paid'])->toEqual(120.0)
        ->and($receivables['rows']->items()[0]['balance'])->toEqual(180.0);
});

test('consolidated inventory KPIs respect search and branch filter', function () {
    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $this->productA->id,
        'physical_quantity' => 10,
        'reserved_quantity' => 0,
        'available_quantity' => 10,
        'average_cost' => 25.00,
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchB->id,
        'product_id' => $this->productB->id,
        'physical_quantity' => 50,
        'reserved_quantity' => 0,
        'available_quantity' => 50,
        'average_cost' => 100.00,
    ]);

    $service = app(ReportService::class);

    $filtered = $service->getReportData('consolidated_inventory', [$this->branchA->id, $this->branchB->id], [
        'company_id' => $this->company->id,
        'search' => 'filtro',
    ]);

    expect($filtered['rows']->total())->toBe(1)
        ->and($filtered['kpis'][0]['value'])->toBe('1')
        ->and($filtered['kpis'][1]['value'])->toBe('10.00')
        ->and($filtered['kpis'][2]['value'])->toBe('S/ 250.00');
});

test('transfers, offline operations and conflicts enforce branch filtering and real status KPIs', function () {
    $today = now()->format('Y-m-d');

    Transfer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'source_branch_id' => $this->branchA->id,
        'destination_branch_id' => $this->branchB->id,
        'transfer_number' => 'TR-0001',
        'request_date' => now(),
        'status' => 'CANCELLED',
        'created_by' => $this->admin->id,
    ]);

    Transfer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'source_branch_id' => $this->branchA->id,
        'destination_branch_id' => $this->branchB->id,
        'transfer_number' => 'TR-0002',
        'request_date' => now(),
        'status' => 'IN_TRANSIT',
        'created_by' => $this->admin->id,
    ]);

    // PWA browser offline operations (device_id = null, branch_id inside payload)
    $opA = SyncOperation::create([
        'uuid' => (string) Str::uuid(),
        'device_id' => null,
        'user_id' => $this->admin->id,
        'entity_type' => 'Sale',
        'entity_uuid' => (string) Str::uuid(),
        'operation_type' => 'CREATE',
        'payload' => ['branch_id' => $this->branchA->id],
        'status' => 'SUCCESS',
        'client_timestamp' => now(),
    ]);

    $opB = SyncOperation::create([
        'uuid' => (string) Str::uuid(),
        'device_id' => null,
        'user_id' => $this->admin->id,
        'entity_type' => 'Sale',
        'entity_uuid' => (string) Str::uuid(),
        'operation_type' => 'CREATE',
        'payload' => ['branch_id' => $this->branchB->id],
        'status' => 'CONFLICT',
        'error_message' => 'Stock insuficiente en Sur',
        'client_timestamp' => now(),
    ]);

    Conflict::create([
        'uuid' => (string) Str::uuid(),
        'entity_type' => 'Sale',
        'entity_uuid' => $opA->entity_uuid,
        'conflict_type' => 'INSUFFICIENT_STOCK',
        'client_state' => ['branch_id' => $this->branchA->id],
        'status' => 'RESOLVED',
        'sync_operation_id' => $opA->id,
        'resolution_notes' => 'Ajustado manualmente en Norte',
        'resolved_by' => $this->admin->id,
        'resolved_at' => now(),
    ]);

    Conflict::create([
        'uuid' => (string) Str::uuid(),
        'entity_type' => 'Sale',
        'entity_uuid' => $opB->entity_uuid,
        'conflict_type' => 'INSUFFICIENT_STOCK',
        'client_state' => ['branch_id' => $this->branchB->id],
        'status' => 'PENDING',
        'sync_operation_id' => $opB->id,
    ]);

    $service = app(ReportService::class);
    $filtersA = [
        'company_id' => $this->company->id,
        'branch_id' => (string) $this->branchA->id,
        'date_from' => $today,
        'date_to' => $today,
    ];

    // Transfers: CANCELLED must NOT be counted as pending
    $transfers = $service->getReportData('transfers', [$this->branchA->id, $this->branchB->id], $filtersA);
    expect($transfers['kpis'][0]['value'])->toBe('2')
        ->and($transfers['kpis'][2]['value'])->toBe('1');

    // Offline operations: only Branch A (PWA device_id=null) and SUCCESS counted
    $offline = $service->getReportData('offline_operations', [$this->branchA->id, $this->branchB->id], $filtersA);
    expect($offline['rows']->total())->toBe(1)
        ->and($offline['kpis'][1]['value'])->toBe('1')
        ->and($offline['rows']->items()[0]['branch'])->toBe('Sucursal Norte');

    // Conflicts: strictly Branch A only, RESOLVED counted, resolution_notes displayed
    $conflicts = $service->getReportData('conflicts', [$this->branchA->id, $this->branchB->id], $filtersA);
    expect($conflicts['rows']->total())->toBe(1)
        ->and($conflicts['kpis'][1]['value'])->toBe('1')
        ->and($conflicts['kpis'][2]['value'])->toBe('0')
        ->and($conflicts['rows']->items()[0]['branch'])->toBe('Sucursal Norte')
        ->and($conflicts['rows']->items()[0]['reason'])->toBe('Ajustado manualmente en Norte');
});

test('branch authorization, pagination query string and ALL branch print/export work cleanly', function () {
    $today = now()->format('Y-m-d');

    // Non-superadmin restricted to Branch A gets 403 for Branch B on index, export, print
    $this->actingAs($this->branchAUser)
        ->get("/reports?type=sales&branch_id={$this->branchB->id}")
        ->assertForbidden();

    $this->actingAs($this->branchAUser)
        ->get("/reports/export/sales?branch_id={$this->branchB->id}")
        ->assertForbidden();

    $this->actingAs($this->branchAUser)
        ->get("/reports/print/sales?branch_id={$this->branchB->id}")
        ->assertForbidden();

    // Multi-branch non-superadmin gets can_select_branch = true
    $this->actingAs($this->multiBranchUser)
        ->get('/reports?type=sales')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('can_select_branch', true)
            ->has('branches', 2)
        );

    // branch_id=ALL must never crash PostgreSQL on print or export
    $this->actingAs($this->admin)
        ->get("/reports/print/receivables?branch_id=ALL&date_from={$today}&date_to={$today}")
        ->assertOk();

    $this->actingAs($this->admin)
        ->get("/reports/export/sales?branch_id=ALL&date_from={$today}&date_to={$today}")
        ->assertOk();

    // Daily closing + kardex + inventory_exits smoke checks
    $closing = DailyClosing::create([
        'branch_id' => $this->branchA->id,
        'closing_date' => $today,
        'status' => 'CLOSED',
        'opened_at' => now()->startOfDay(),
        'closed_at' => now(),
        'opened_by' => $this->admin->id,
        'closed_by' => $this->admin->id,
    ]);
    DailyClosingVersion::create([
        'daily_closing_id' => $closing->id,
        'version_number' => 1,
        'snapshot_data' => [],
        'total_expected' => 250.00,
        'total_counted' => 250.00,
        'total_difference' => 0.00,
        'created_by' => $this->admin->id,
    ]);

    InventoryExit::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'exit_number' => 'SAL-0001',
        'operation_date' => now(),
        'exit_type' => 'MERMA',
        'status' => 'CONFIRMED',
        'notes' => 'Producto dañado',
        'created_by' => $this->admin->id,
    ]);

    KardexEntry::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $this->productA->id,
        'sequence_number' => 1,
        'user_id' => $this->admin->id,
        'operation_date' => now(),
        'operation_type' => 'COMPRA',
        'reference' => 'CMP-001',
        'input_quantity' => 5,
        'input_unit_cost' => 20,
        'input_total_cost' => 100,
        'output_quantity' => 0,
        'output_unit_cost' => 0,
        'output_total_cost' => 0,
        'balance_quantity' => 5,
        'balance_unit_cost' => 20,
        'balance_total_cost' => 100,
    ]);

    $this->actingAs($this->admin)
        ->get("/reports?type=daily_closings&branch_id={$this->branchA->id}&date_from={$today}&date_to={$today}&search=norte")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('report.kpis.0.value', '1')->where('report.kpis.1.value', 'S/ 250.00'));

    $this->actingAs($this->admin)
        ->get("/reports?type=inventory_exits&branch_id={$this->branchA->id}&date_from={$today}&date_to={$today}&search=dañado")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('report.rows.total', 1));

    $this->actingAs($this->admin)
        ->get("/reports?type=kardex&branch_id={$this->branchA->id}&date_from={$today}&date_to={$today}&search=filtro")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('report.rows.total', 1));
});
