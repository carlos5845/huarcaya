<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\KardexEntry;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Inversiones Huarcaya Test',
        'document_type' => 'RUC',
        'document_number' => '20601234567',
    ]);

    $this->unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'NIU',
        'name' => 'Unidad',
        'status' => 'ACTIVE',
    ]);

    $this->branch = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sede Central',
        'sunat_establishment_code' => '0001',
        'address' => 'Av. Principal 123',
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
        'document_type' => 'RUC',
        'document_number' => '20123456789',
        'legal_name' => 'Transportes & Logística S.A.C.',
        'status' => 'ACTIVE',
    ]);

    $this->paymentMethod = PaymentMethod::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'CASH',
        'name' => 'Efectivo',
        'is_cash' => true,
        'is_active' => true,
    ]);

    // Producto 1: Con stock físico
    $this->productInStock = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'unit_id' => $this->unit->id,
        'sku' => 'FIL-001',
        'primary_reference' => 'LF-16015',
        'normalized_reference' => 'LF16015',
        'name' => 'Filtro de Aceite Donaldson',
        'normalized_name' => 'FILTRO DE ACEITE DONALDSON',
        'status' => 'ACTIVE',
    ]);
    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'product_id' => $this->productInStock->id,
        'available_quantity' => 10,
        'physical_quantity' => 10,
    ]);

    // Producto 2: Sin stock físico (Bajo Pedido)
    $this->productZeroStock = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'unit_id' => $this->unit->id,
        'sku' => 'TUR-999',
        'primary_reference' => 'TB-2500',
        'normalized_reference' => 'TB2500',
        'name' => 'Turbocargador Garrett Especial',
        'normalized_name' => 'TURBOCARGADOR GARRETT ESPECIAL',
        'status' => 'ACTIVE',
    ]);
});

test('puede emitir una cotizacion con correlativo por serie y repuestos con o sin stock', function () {
    $response = $this->actingAs($this->user)->post(route('quotations.store'), [
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'operation_date' => now()->toDateString(),
        'validity_days' => 15,
        'currency_code' => 'PEN',
        'tax_mode' => 'INCLUDED',
        'payment_terms' => 'Contado contra entrega',
        'delivery_time' => 'Inmediata',
        'notes' => 'Cotización de prueba para mantenimiento de flota',
        'lines' => [
            [
                'product_id' => $this->productInStock->id,
                'quantity' => 2,
                'unit_price' => 100.00,
                'discount_amount' => 10.00,
            ],
            [
                'product_id' => $this->productZeroStock->id,
                'quantity' => 1,
                'unit_price' => 1500.00,
                'discount_amount' => 0,
                'delivery_time_line' => '5 a 7 días hábiles',
            ],
        ],
    ]);

    $quotation = Quotation::with('lines')->first();
    expect($quotation)->not->toBeNull();
    $response->assertRedirect(route('quotations.show', $quotation->id));

    // Correlativo estructurado COT-001-000001
    expect($quotation->series)->toBe('COT-001')
        ->and($quotation->correlative)->toBe('000001')
        ->and($quotation->quotation_number)->toBe('COT-001-000001')
        ->and($quotation->status)->toBe('PENDING')
        ->and($quotation->validity_days)->toBe(15)
        ->and($quotation->valid_until_date->toDateString())->toBe(now()->addDays(15)->toDateString());

    // Verificar las líneas y flag de pedido especial
    expect($quotation->lines)->toHaveCount(2);

    $lineInStock = $quotation->lines->firstWhere('product_id', $this->productInStock->id);
    expect($lineInStock->is_special_order)->toBeFalse();

    $lineZeroStock = $quotation->lines->firstWhere('product_id', $this->productZeroStock->id);
    expect($lineZeroStock->is_special_order)->toBeTrue()
        ->and($lineZeroStock->delivery_time_line)->toBe('5 a 7 días hábiles');
});

test('la emision de cotizacion no descuenta stock fisico ni genera kardex', function () {
    $stockBefore = Inventory::where('branch_id', $this->branch->id)
        ->where('product_id', $this->productInStock->id)
        ->value('available_quantity');
    $kardexCountBefore = KardexEntry::count();

    $this->actingAs($this->user)->post(route('quotations.store'), [
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'operation_date' => now()->toDateString(),
        'validity_days' => 15,
        'currency_code' => 'PEN',
        'tax_mode' => 'INCLUDED',
        'lines' => [
            [
                'product_id' => $this->productInStock->id,
                'quantity' => 5,
                'unit_price' => 80.00,
            ],
        ],
    ]);

    $stockAfter = Inventory::where('branch_id', $this->branch->id)
        ->where('product_id', $this->productInStock->id)
        ->value('available_quantity');
    $kardexCountAfter = KardexEntry::count();

    expect($stockAfter)->toEqual($stockBefore)
        ->and($kardexCountAfter)->toEqual($kardexCountBefore);
});

test('puede previsualizar la hoja a4 con cuentas bancarias', function () {
    $quotation = Quotation::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branch->id,
        'customer_id' => $this->customer->id,
        'series' => 'COT-001',
        'correlative' => '000001',
        'quotation_number' => 'COT-001-000001',
        'operation_date' => now(),
        'valid_until_date' => now()->addDays(15),
        'validity_days' => 15,
        'currency_code' => 'PEN',
        'exchange_rate' => 1.0,
        'subtotal_amount' => 100,
        'discount_amount' => 0,
        'tax_amount' => 18,
        'total_amount' => 118,
        'tax_mode' => 'INCLUDED',
        'status' => 'PENDING',
        'customer_name_snapshot' => $this->customer->legal_name,
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)->get(route('quotations.print.a4', $quotation->id));
    $response->assertOk()
        ->assertViewIs('quotations.print.a4')
        ->assertSee('COT-001-000001')
        ->assertSee('Precios y disponibilidad física de stock sujetos a cambio');
});

test('buscar producto por referencia primaria o codigo funciona correctamente', function () {
    $response = $this->actingAs($this->user)->getJson(route('products.search', ['q' => 'LF-16015']));
    expect($response->status())->toBe(200)
        ->and(count($response->json()))->toBe(1)
        ->and($response->json()[0]['primary_reference'])->toBe('LF-16015');
});
