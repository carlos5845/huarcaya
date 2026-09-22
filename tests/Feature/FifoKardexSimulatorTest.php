<?php

use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\KardexEntry;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use App\Services\FifoKardexSimulatorService;
use App\Services\KardexService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

    $this->company = Company::create([
        'uuid' => Str::uuid(),
        'name' => 'EMPRESA HUARCAYA S.A.C.',
        'document_number' => '20601234567',
    ]);
    $this->branch = Branch::create([
        'uuid' => Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sede Central',
    ]);
    $this->user = User::factory()->create([
        'uuid' => Str::uuid(),
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branch->id,
    ]);
    $this->user->assignRole('Super Admin');

    $brand = Brand::create(['uuid' => Str::uuid(), 'company_id' => $this->company->id, 'code' => 'B01', 'name' => 'GENERIC', 'normalized_name' => 'GENERIC']);
    $category = Category::create(['uuid' => Str::uuid(), 'company_id' => $this->company->id, 'code' => 'C01', 'name' => 'FILTROS', 'normalized_name' => 'FILTROS']);
    $unit = Unit::create(['uuid' => Str::uuid(), 'company_id' => $this->company->id, 'code' => 'NIU', 'name' => 'UNIDAD', 'normalized_name' => 'UNIDAD']);

    $this->product = Product::create([
        'uuid' => Str::uuid(),
        'company_id' => $this->company->id,
        'brand_id' => $brand->id,
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'name' => 'Filtro de Aceite PH-4967',
        'primary_reference' => 'PH4967',
        'normalized_reference' => 'PH4967',
        'normalized_name' => 'FILTRO DE ACEITE PH-4967',
    ]);

    $this->kardexService = new KardexService;
    $this->fifoSimulator = new FifoKardexSimulatorService;
});

it('reconciles physical quantity equality and simulates FIFO cost divergence under inflation', function () {
    // 1. Entrada 1: 10 unidades a S/ 10.00
    $this->kardexService->recordEntry([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
        'unit_cost' => 10,
        'operation_type' => 'COMPRA',
        'reference' => 'F001-01',
        'user_id' => $this->user->id,
    ]);

    // 2. Entrada 2 (Inflación): 10 unidades a S/ 20.00
    $this->kardexService->recordEntry([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
        'unit_cost' => 20,
        'operation_type' => 'COMPRA',
        'reference' => 'F001-02',
        'user_id' => $this->user->id,
    ]);

    // 3. Salida: 15 unidades
    $this->kardexService->recordExit([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 15,
        'operation_type' => 'VENTA',
        'reference' => 'B001-01',
        'user_id' => $this->user->id,
    ]);

    // 4. Entrada 3: 5 unidades a S/ 30.00
    $this->kardexService->recordEntry([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 5,
        'unit_cost' => 30,
        'operation_type' => 'COMPRA',
        'reference' => 'F001-03',
        'user_id' => $this->user->id,
    ]);

    // Consultar registros cronológicos
    $entries = KardexEntry::where('product_id', $this->product->id)
        ->orderBy('sequence_number', 'asc')
        ->get();

    expect($entries)->toHaveCount(4);

    // Estado en Base de Datos (Promedio Ponderado)
    $lastEntryDb = $entries->last();
    expect((float) $lastEntryDb->balance_quantity)->toEqual(10.0)
        ->and((float) $lastEntryDb->balance_unit_cost)->toEqual(22.5) // (75 + 150) / 10 = 22.5
        ->and((float) $lastEntryDb->balance_total_cost)->toEqual(225.0);

    // Ejecutar simulación PEPS en memoria
    $simulated = $this->fifoSimulator->simulate($entries);

    // 1. RECONCILIACIÓN FÍSICA: Cantidad física debe ser IDÉNTICA (Delta = 0)
    $lastSimulated = $simulated->last();
    expect((float) $lastSimulated->fifo_balance_quantity)->toEqual((float) $lastEntryDb->balance_quantity)
        ->and((float) $lastSimulated->fifo_balance_quantity)->toEqual(10.0);

    // 2. DIVERGENCIA CONTABLE BAJO INFLACIÓN:
    // Salida de 15 unidades bajo PEPS debió consumir: 10 @ S/10 (100) + 5 @ S/20 (100) = S/ 200 total (C.U = 13.3333)
    $saleEntry = $simulated[2];
    expect((float) $saleEntry->fifo_output_quantity)->toEqual(15.0)
        ->and((float) $saleEntry->fifo_output_total_cost)->toEqual(200.0)
        ->and(round((float) $saleEntry->fifo_output_unit_cost, 4))->toEqual(13.3333);

    // Saldo final bajo PEPS: 5 unidades restantes de Capa 2 @ S/20 (100) + 5 unidades de Capa 3 @ S/30 (150) = S/ 250 total (C.U = 25.00)
    expect((float) $lastSimulated->fifo_balance_total_cost)->toEqual(250.0)
        ->and((float) $lastSimulated->fifo_balance_unit_cost)->toEqual(25.0);

    // En inflación, el inventario final PEPS (250) es mayor que el Promedio Ponderado (225)
    expect($lastSimulated->fifo_balance_total_cost)->toBeGreaterThan($lastEntryDb->balance_total_cost);

    // 3. INMUNIDAD DE BASE DE DATOS: Ninguna fila de base de datos fue alterada
    $freshDbLastEntry = KardexEntry::find($lastEntryDb->id);
    expect((float) $freshDbLastEntry->balance_total_cost)->toEqual(225.0);

    $inventory = Inventory::where('product_id', $this->product->id)->first();
    expect((float) $inventory->average_cost)->toEqual(22.5);
});

it('renders kardex index with peps simulation query parameter', function () {
    $this->actingAs($this->user)
        ->get(route('kardex.index', ['method' => 'PEPS']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('inventory/kardex/index')
            ->has('entries')
            ->where('filters.method', 'PEPS')
        );
});

it('exports kardex in official SUNAT Formato 13.1 excel', function () {
    // Registrar un movimiento
    $this->kardexService->recordEntry([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
        'unit_cost' => 15.50,
        'operation_type' => 'COMPRA',
        'reference' => 'F001-99',
        'user_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('kardex.export.excel', ['method' => 'PEPS']));

    $response->assertOk();
    $disposition = $response->headers->get('content-disposition');
    expect($disposition)->toContain('attachment')
        ->and($disposition)->toContain('formato_13_1_kardex_PEPS_');
});

it('exports official SUNAT PLE 13.1 text file with correct nomenclature and pipe format', function () {
    // Registrar un movimiento
    $this->kardexService->recordEntry([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
        'unit_cost' => 20.00,
        'operation_type' => 'COMPRA',
        'reference' => 'F001-100',
        'user_id' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('kardex.export.ple', ['method' => 'PEPS']));

    $response->assertOk();
    $disposition = $response->headers->get('content-disposition');
    expect($disposition)->toContain('attachment')
        ->and($disposition)->toContain('LE20601234567');

    // Inspeccionar contenido del archivo descargado
    $content = $response->streamedContent();
    expect($content)->toContain('|')
        ->and($content)->toContain('PH4967')
        ->and($content)->toContain('F001100');
});
