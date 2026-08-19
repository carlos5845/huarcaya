<?php

use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Company;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Spatie\SimpleExcel\SimpleExcelWriter;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Company Test',
        'document_number' => '20123456789',
        'status' => 'ACTIVE',
    ]);

    $this->user = User::factory()->create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'dni' => '12345678',
    ]);

    // Assign role
    $role = Role::create(['name' => 'Super Admin', 'guard_name' => 'web']);
    $this->user->assignRole('Super Admin');

    // Create Branch
    $this->branch = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Principal',
        'status' => 'ACTIVE',
    ]);

    $this->user->branches()->attach($this->branch->id, ['is_default' => true]);
});

it('can complete the full product flow from brand creation to excel import', function () {
    $this->actingAs($this->user);

    // 1. Crear marca
    $response = $this->post(route('brands.store'), [
        'name' => 'Marca Test',
        'code' => 'MT',
        'status' => 'ACTIVE',
    ]);
    $response->assertSessionHasNoErrors();
    $brand = Brand::where('name', 'Marca Test')->first();
    expect($brand)->not->toBeNull();

    // 2. Crear categoría
    $response = $this->post(route('categories.store'), [
        'name' => 'Categoria Test',
        'code' => 'CT',
        'status' => 'ACTIVE',
    ]);
    $response->assertSessionHasNoErrors();
    $category = Category::where('name', 'Categoria Test')->first();
    expect($category)->not->toBeNull();

    // 3. Crear unidad
    $response = $this->post(route('units.store'), [
        'name' => 'Unidad Test',
        'code' => 'UT',
        'symbol' => 'UT',
        'allows_decimals' => false,
        'quantity_scale' => 0,
        'status' => 'ACTIVE',
    ]);
    $response->assertSessionHasNoErrors();
    $unit = Unit::where('name', 'Unidad Test')->first();
    expect($unit)->not->toBeNull();

    // 4 & 5. Crear producto y Agregar referencias (aliases)
    $response = $this->post(route('products.store'), [
        'internal_code' => 'INT-001',
        'primary_reference' => 'REF-001',
        'name' => 'Producto Test',
        'description' => 'Test',
        'brand_id' => $brand->id,
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'product_type' => 'SIMPLE',
        'requires_lot_tracking' => false,
        'fifo_enabled' => true,
        'status' => 'ACTIVE',
        'aliases' => [
            ['alias' => 'ALIAS-01'],
        ],
    ]);
    $response->assertSessionHasNoErrors();
    $product = Product::where('primary_reference', 'REF-001')->first();
    expect($product)->not->toBeNull();
    expect($product->aliases)->toHaveCount(1);

    // 6. Definir precio
    $response = $this->post(route('products.prices.store', $product->id), [
        'branch_id' => $this->branch->id,
        'amount' => 100.50,
        'currency' => 'PEN',
    ]);
    $response->assertSessionHasNoErrors();

    // 7. Definir precio mínimo
    $response = $this->post(route('products.min-prices.store', $product->id), [
        'branch_id' => $this->branch->id,
        'amount' => 90.00,
        'currency' => 'PEN',
    ]);
    $response->assertSessionHasNoErrors();

    // 8. Definir stock mínimo
    $response = $this->post(route('products.min-stocks.store', $product->id), [
        'branch_id' => $this->branch->id,
        'quantity' => 10,
    ]);
    $response->assertSessionHasNoErrors();

    // 11 & 12. Importar/validar Excel & Confirmar carga
    Storage::fake('local');
    $filePath = storage_path('app/test_import.xlsx');

    $writer = SimpleExcelWriter::create($filePath)->addHeader([
        'referencia_original',
        'nombre_repuesto',
        'marca',
        'categoria',
        'unidad_medida',
        'precio_base',
        'stock_inicial',
    ]);

    // Add existing product to update inventory (Steps 9 & 13)
    $writer->addRow([
        'referencia_original' => 'REF-001',
        'nombre_repuesto' => 'Producto Test Modificado',
        'marca' => 'Marca Test',
        'categoria' => 'Categoria Test',
        'unidad_medida' => 'Unidad Test',
        'precio_base' => '80.00',
        'stock_inicial' => '50',
    ]);

    // Add new product via import
    $writer->addRow([
        'referencia_original' => 'REF-NEW',
        'nombre_repuesto' => 'Producto Importado',
        'marca' => 'Nueva Marca',
        'categoria' => 'Nueva Cat',
        'unidad_medida' => 'NUnidad',
        'precio_base' => '12.50',
        'stock_inicial' => '100',
    ]);
    $writer->close();

    $file = new UploadedFile($filePath, 'test_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

    $response = $this->post(route('catalog.import.store'), [
        'file' => $file,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertSessionHas('success');

    // 13. Ver stock de esa sucursal
    $product->refresh();
    $inventory = $product->inventories()->where('branch_id', $this->branch->id)->first();

    expect($inventory)->not->toBeNull();
    expect((float) $inventory->physical_quantity)->toBe(50.0);

    // Check new product was created
    $newProduct = Product::where('primary_reference', 'REF-NEW')->first();
    expect($newProduct)->not->toBeNull();

    $newInventory = $newProduct->inventories()->where('branch_id', $this->branch->id)->first();
    expect($newInventory)->not->toBeNull();
    expect((float) $newInventory->physical_quantity)->toBe(100.0);
});
