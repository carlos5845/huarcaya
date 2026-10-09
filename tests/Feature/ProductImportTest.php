<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\ImportBatch;
use App\Models\Inventory;
use App\Models\KardexEntry;
use App\Models\Lot;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Spatie\SimpleExcel\SimpleExcelWriter;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Inversiones Huarcaya',
        'business_name' => 'INVERSIONES HUARCAYA S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20601234567',
    ]);

    $this->branch = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Principal',
        'code' => 'SUC-01',
        'address' => 'Av. Industrial 100',
        'status' => 'ACTIVE',
    ]);

    $this->unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Unidad',
        'code' => 'UND',
        'symbol' => 'UND',
        'status' => 'ACTIVE',
    ]);

    $this->user = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branch->id,
        'status' => 'ACTIVE',
    ]);
    $this->user->assignRole('Super Admin');
});

test('renderiza vista de importacion con sucursales y lotes recientes', function () {
    $response = $this->actingAs($this->user)->get(route('catalog.import'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('catalog/import/index')
        ->has('branches')
        ->has('defaultBranchId')
        ->has('recentBatches')
    );
});

test('descarga plantilla oficial xlsx de importacion de repuestos', function () {
    $response = $this->actingAs($this->user)->get(route('catalog.import.template'));

    $response->assertOk();
    $response->assertHeader('content-disposition');
});

test('previsualiza y analiza archivo excel detectando repuestos nuevos y existentes', function () {
    // 1. Crear producto existente previamente
    Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => '04465-02220',
        'normalized_reference' => '0446502220',
        'name' => 'Pastillas de Freno Toyota Existentes',
        'normalized_name' => 'pastillas-de-freno-toyota-existentes',
        'unit_id' => $this->unit->id,
        'status' => 'ACTIVE',
    ]);

    // 2. Crear archivo temporal con SimpleExcelWriter
    $tempPath = tempnam(sys_get_temp_dir(), 'test_import_').'.xlsx';
    $writer = SimpleExcelWriter::create($tempPath)->addHeader([
        'referencia_original', 'nombre_repuesto', 'codigo_interno', 'marca', 'categoria',
        'unidad_medida', 'costo_compra', 'precio_venta', 'stock_inicial', 'stock_minimo',
    ]);

    $writer->addRow([
        'referencia_original' => '04465-02220', // Existente
        'nombre_repuesto' => 'Pastillas Toyota Corolla',
        'codigo_interno' => 'PF-04465',
        'marca' => 'Toyota',
        'categoria' => 'Frenos',
        'unidad_medida' => 'Juego',
        'costo_compra' => 85.00,
        'precio_venta' => 130.00,
        'stock_inicial' => 10,
        'stock_minimo' => 2,
    ]);

    $writer->addRow([
        'referencia_original' => '90915-YZZE1', // Nuevo
        'nombre_repuesto' => 'Filtro de Aceite Denso Yaris',
        'codigo_interno' => 'FL-90915',
        'marca' => 'Denso',
        'categoria' => 'Filtros',
        'unidad_medida' => 'Unidad',
        'costo_compra' => 15.00,
        'precio_venta' => 28.00,
        'stock_inicial' => 20,
        'stock_minimo' => 5,
    ]);

    $writer->addRow([
        'referencia_original' => '', // Inválido
        'nombre_repuesto' => 'Sin Referencia',
        'codigo_interno' => '',
        'marca' => '',
        'categoria' => '',
        'unidad_medida' => '',
        'costo_compra' => 0,
        'precio_venta' => 0,
        'stock_inicial' => 0,
        'stock_minimo' => 0,
    ]);
    $writer->close();

    $uploadedFile = new UploadedFile($tempPath, 'repuestos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

    $response = $this->actingAs($this->user)->postJson(route('catalog.import.preview'), [
        'file' => $uploadedFile,
        'branch_id' => $this->branch->id,
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'data' => [
                'total_rows' => 3,
                'valid_new' => 1,
                'valid_existing' => 1,
                'invalid_rows' => 1,
            ],
        ]);

    @unlink($tempPath);
});

test('ejecuta importacion creando producto, precio, lote y asiento en kardex', function () {
    $tempPath = tempnam(sys_get_temp_dir(), 'test_import_exec_').'.xlsx';
    $writer = SimpleExcelWriter::create($tempPath)->addHeader([
        'referencia_original', 'nombre_repuesto', 'codigo_interno', 'marca', 'categoria',
        'unidad_medida', 'costo_compra', 'precio_venta', 'stock_inicial', 'stock_minimo', 'descripcion',
    ]);

    $writer->addRow([
        'referencia_original' => '334431',
        'nombre_repuesto' => 'Amortiguador KYB Excel-G',
        'codigo_interno' => 'AM-334431',
        'marca' => 'KYB',
        'categoria' => 'Suspension',
        'unidad_medida' => 'Unidad',
        'costo_compra' => 160.00,
        'precio_venta' => 240.00,
        'stock_inicial' => 8,
        'stock_minimo' => 2,
        'descripcion' => 'Amortiguador delantero derecho',
    ]);
    $writer->close();

    $uploadedFile = new UploadedFile($tempPath, 'amortiguador.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

    $response = $this->actingAs($this->user)->postJson(route('catalog.import.store'), [
        'file' => $uploadedFile,
        'branch_id' => $this->branch->id,
        'duplicate_strategy' => 'UPDATE_AND_ADD_STOCK',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'result' => [
                'total' => 1,
                'created' => 1,
                'updated' => 0,
                'failed' => 0,
                'status' => 'COMPLETED',
            ],
        ]);

    // Verificar que el producto fue creado
    $product = Product::where('primary_reference', '334431')->first();
    expect($product)->not->toBeNull();
    expect($product->name)->toBe('Amortiguador KYB Excel-G');
    expect($product->brand->name)->toBe('KYB');
    expect($product->category->name)->toBe('Suspension');

    // Verificar precio de venta creado en product_prices
    $price = ProductPrice::where('product_id', $product->id)->where('price_type', 'PUBLIC')->first();
    expect($price)->not->toBeNull();
    expect((float) $price->amount)->toEqual(240.00);

    // Verificar inventario
    $inventory = Inventory::where('product_id', $product->id)->where('branch_id', $this->branch->id)->first();
    expect($inventory)->not->toBeNull();
    expect((float) $inventory->physical_quantity)->toEqual(8.0);
    expect((float) $inventory->average_cost)->toEqual(160.00);

    // Verificar lote registrado
    $lot = Lot::where('product_id', $product->id)->where('branch_id', $this->branch->id)->first();
    expect($lot)->not->toBeNull();
    expect((float) $lot->current_quantity)->toEqual(8.0);

    // Verificar asiento en Kardex
    $kardex = KardexEntry::where('product_id', $product->id)->where('branch_id', $this->branch->id)->first();
    expect($kardex)->not->toBeNull();
    expect($kardex->operation_type)->toBe('INVENTARIO_INICIAL');
    expect((float) $kardex->input_quantity)->toEqual(8.0);
    expect((float) $kardex->balance_quantity)->toEqual(8.0);

    // Verificar que se guardó en import_batches
    $batch = ImportBatch::latest('id')->first();
    expect($batch)->not->toBeNull();
    expect($batch->status)->toBe('COMPLETED');
    expect($batch->total_rows)->toBe(1);
    expect($batch->processed_rows)->toBe(1);

    @unlink($tempPath);
});

test('descarga archivo de errores cuando un lote tiene filas fallidas', function () {
    $tempPath = tempnam(sys_get_temp_dir(), 'test_import_err_').'.xlsx';
    $writer = SimpleExcelWriter::create($tempPath)->addHeader([
        'referencia_original', 'nombre_repuesto', 'costo_compra', 'precio_venta', 'stock_inicial',
    ]);

    $writer->addRow([
        'referencia_original' => '', // Inválido
        'nombre_repuesto' => 'Filtro Sin Referencia',
        'costo_compra' => 10,
        'precio_venta' => 20,
        'stock_inicial' => 5,
    ]);
    $writer->close();

    $uploadedFile = new UploadedFile($tempPath, 'con_error.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

    $this->actingAs($this->user)->postJson(route('catalog.import.store'), [
        'file' => $uploadedFile,
        'branch_id' => $this->branch->id,
        'duplicate_strategy' => 'UPDATE_AND_ADD_STOCK',
    ]);

    $batch = ImportBatch::latest('id')->first();
    expect($batch->failed_rows)->toBe(1);

    $response = $this->actingAs($this->user)->get(route('catalog.import.errors', $batch->id));
    $response->assertOk();
    $response->assertHeader('content-disposition');

    @unlink($tempPath);
});

test('estrategia ONLY_NEW omite productos existentes sin alterar su inventario', function () {
    // 1. Crear producto existente con inventario previo
    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'EXIST-01',
        'normalized_reference' => 'EXIST01',
        'name' => 'Producto Previo',
        'normalized_name' => 'producto-previo',
        'unit_id' => $this->unit->id,
        'status' => 'ACTIVE',
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'product_id' => $product->id,
        'physical_quantity' => 15,
        'available_quantity' => 15,
        'average_cost' => 50,
        'status' => 'ACTIVE',
    ]);

    $tempPath = tempnam(sys_get_temp_dir(), 'test_only_new_').'.xlsx';
    $writer = SimpleExcelWriter::create($tempPath)->addHeader([
        'referencia_original', 'nombre_repuesto', 'costo_compra', 'precio_venta', 'stock_inicial',
    ]);
    $writer->addRow([
        'referencia_original' => 'EXIST-01',
        'nombre_repuesto' => 'Intento Cambio Nombre',
        'costo_compra' => 99,
        'precio_venta' => 199,
        'stock_inicial' => 10,
    ]);
    $writer->close();

    $uploadedFile = new UploadedFile($tempPath, 'only_new.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

    $response = $this->actingAs($this->user)->postJson(route('catalog.import.store'), [
        'file' => $uploadedFile,
        'branch_id' => $this->branch->id,
        'duplicate_strategy' => 'ONLY_NEW',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'result' => [
                'total' => 1,
                'created' => 0,
                'skipped' => 1,
                'updated' => 0,
            ],
        ]);

    $product->refresh();
    expect($product->name)->toBe('Producto Previo');

    $inv = Inventory::where('product_id', $product->id)->where('branch_id', $this->branch->id)->first();
    expect((float) $inv->physical_quantity)->toEqual(15.0);

    @unlink($tempPath);
});

test('estrategia OVERWRITE_STOCK ajusta inventario a la cantidad exacta del Excel', function () {
    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'ADJ-01',
        'normalized_reference' => 'ADJ01',
        'name' => 'Producto Para Ajuste',
        'normalized_name' => 'producto-para-ajuste',
        'unit_id' => $this->unit->id,
        'status' => 'ACTIVE',
    ]);

    // Tenía 20 unidades
    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branch->id,
        'product_id' => $product->id,
        'physical_quantity' => 20,
        'available_quantity' => 20,
        'average_cost' => 30,
        'status' => 'ACTIVE',
    ]);

    $tempPath = tempnam(sys_get_temp_dir(), 'test_overwrite_').'.xlsx';
    $writer = SimpleExcelWriter::create($tempPath)->addHeader([
        'referencia_original', 'nombre_repuesto', 'costo_compra', 'precio_venta', 'stock_inicial',
    ]);
    // El Excel dice que ahora hay 25 unidades (+5 de ajuste)
    $writer->addRow([
        'referencia_original' => 'ADJ-01',
        'nombre_repuesto' => 'Producto Para Ajuste Actualizado',
        'costo_compra' => 30,
        'precio_venta' => 50,
        'stock_inicial' => 25,
    ]);
    $writer->close();

    $uploadedFile = new UploadedFile($tempPath, 'overwrite.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

    $response = $this->actingAs($this->user)->postJson(route('catalog.import.store'), [
        'file' => $uploadedFile,
        'branch_id' => $this->branch->id,
        'duplicate_strategy' => 'OVERWRITE_STOCK',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'result' => [
                'total' => 1,
                'created' => 0,
                'updated' => 1,
                'status' => 'COMPLETED',
            ],
        ]);

    $inv = Inventory::where('product_id', $product->id)->where('branch_id', $this->branch->id)->first();
    expect((float) $inv->physical_quantity)->toEqual(25.0);

    // Verificar que se registró el ajuste positivo de 5 en Kardex
    $kardex = KardexEntry::where('product_id', $product->id)
        ->where('branch_id', $this->branch->id)
        ->latest('id')
        ->first();
    expect($kardex)->not->toBeNull();
    expect($kardex->operation_type)->toBe('AJUSTE_POSITIVO');
    expect((float) $kardex->input_quantity)->toEqual(5.0);
    expect((float) $kardex->balance_quantity)->toEqual(25.0);

    @unlink($tempPath);
});
