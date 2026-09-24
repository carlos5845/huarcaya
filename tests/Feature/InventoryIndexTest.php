<?php

use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductMinStock;
use App\Models\ProductPrice;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Repuestos Huarcaya SAC',
        'document_number' => '20123456789',
        'status' => 'ACTIVE',
    ]);

    $this->adminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $this->sellerRole = Role::firstOrCreate(['name' => 'Vendedor', 'guard_name' => 'web']);
    $viewInventoryPermission = Permission::firstOrCreate(['name' => 'view_inventory', 'guard_name' => 'web']);
    $this->sellerRole->givePermissionTo($viewInventoryPermission);

    $this->adminUser = User::factory()->create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'dni' => '11111111',
    ]);
    $this->adminUser->assignRole('Super Admin');

    $this->sellerUser = User::factory()->create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'dni' => '22222222',
    ]);
    $this->sellerUser->assignRole('Vendedor');

    $this->branchA = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sede Central La Victoria',
        'status' => 'ACTIVE',
    ]);

    $this->branchB = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sede Los Olivos',
        'status' => 'ACTIVE',
    ]);

    $this->adminUser->branches()->attach($this->branchA->id, ['is_default' => true]);
    $this->adminUser->branches()->attach($this->branchB->id, ['is_default' => false]);
    $this->sellerUser->branches()->attach($this->branchA->id, ['is_default' => true]);
    $this->sellerUser->update(['default_branch_id' => $this->branchA->id]);

    $this->brand = Brand::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Toyota',
        'normalized_name' => 'TOYOTA',
        'code' => 'TOY',
        'status' => 'ACTIVE',
    ]);

    $this->category = Category::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Frenos',
        'normalized_name' => 'FRENOS',
        'status' => 'ACTIVE',
    ]);

    $this->unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'UND',
        'name' => 'Unidad',
        'symbol' => 'u',
        'status' => 'ACTIVE',
    ]);
});

test('inventory index renders properly with kpi cards and product enrichments', function () {
    // Product 1: Stock 10, MinStock 2 (OPTIMAL)
    $product1 = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'TOY-001',
        'normalized_reference' => 'TOY001',
        'name' => 'Pastillas de Freno Delanteras',
        'normalized_name' => 'PASTILLASDEFRENODELANTERAS',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $product1->id,
        'physical_quantity' => 10,
        'available_quantity' => 10,
        'average_cost' => 50.00,
        'status' => 'ACTIVE',
    ]);

    ProductMinStock::create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $product1->id,
        'branch_id' => $this->branchA->id,
        'minimum_quantity' => 2,
        'effective_from' => now(),
        'status' => 'ACTIVE',
    ]);

    ProductPrice::create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $product1->id,
        'branch_id' => $this->branchA->id,
        'currency' => 'PEN',
        'amount' => 80.00,
        'effective_from' => now(),
        'status' => 'ACTIVE',
    ]);

    // Product 2: Stock 1, MinStock 5 (LOW_STOCK)
    $product2 = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'TOY-002',
        'normalized_reference' => 'TOY002',
        'name' => 'Disco de Freno',
        'normalized_name' => 'DISCODEFRENO',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $product2->id,
        'physical_quantity' => 1,
        'available_quantity' => 1,
        'average_cost' => 100.00,
        'status' => 'ACTIVE',
    ]);

    ProductMinStock::create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $product2->id,
        'branch_id' => $this->branchA->id,
        'minimum_quantity' => 5,
        'effective_from' => now(),
        'status' => 'ACTIVE',
    ]);

    // Product 3: Sin stock en esta sede (OUT_OF_STOCK)
    $product3 = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'TOY-003',
        'normalized_reference' => 'TOY003',
        'name' => 'Filtro de Aire',
        'normalized_name' => 'FILTRODEAIRE',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
    ]);

    $response = $this->actingAs($this->adminUser)
        ->get(route('inventory.index', ['branch_id' => $this->branchA->id]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('catalog/inventory/index')
            ->has('kpis', fn (Assert $kpis) => $kpis
                ->where('total_skus', 3) // 3 productos en catálogo
                ->where('total_physical', 11)
                ->where('total_available', 11)
                ->where('total_reserved', 0)
                ->where('total_inventory_value', 600) // (10*50) + (1*100) = 600
                ->where('critical_count', 2) // 1 low stock + 1 out of stock
                ->where('low_stock_count', 1)
                ->where('out_of_stock_count', 1)
            )
            ->has('products.data', 3)
            // Primero productos con mayor stock, al final los de 0 stock
            ->where('products.data.0.stock_status', 'OPTIMAL') // Stock 10
            ->where('products.data.1.stock_status', 'LOW_STOCK') // Stock 1
            ->where('products.data.2.stock_status', 'OUT_OF_STOCK') // Stock 0
        );
});

test('inventory index filters by stock_status low_stock', function () {
    $product1 = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'TOY-001',
        'normalized_reference' => 'TOY001',
        'name' => 'Pastillas de Freno Delanteras',
        'normalized_name' => 'PASTILLASDEFRENODELANTERAS',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $product1->id,
        'physical_quantity' => 10,
        'available_quantity' => 10,
        'average_cost' => 50.00,
        'status' => 'ACTIVE',
    ]);

    ProductMinStock::create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $product1->id,
        'branch_id' => $this->branchA->id,
        'minimum_quantity' => 2,
        'effective_from' => now(),
        'status' => 'ACTIVE',
    ]);

    $product2 = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'TOY-002',
        'normalized_reference' => 'TOY002',
        'name' => 'Disco de Freno',
        'normalized_name' => 'DISCODEFRENO',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $product2->id,
        'physical_quantity' => 1,
        'available_quantity' => 1,
        'average_cost' => 100.00,
        'status' => 'ACTIVE',
    ]);

    ProductMinStock::create([
        'uuid' => (string) Str::uuid(),
        'product_id' => $product2->id,
        'branch_id' => $this->branchA->id,
        'minimum_quantity' => 5,
        'effective_from' => now(),
        'status' => 'ACTIVE',
    ]);

    $response = $this->actingAs($this->adminUser)
        ->get(route('inventory.index', [
            'branch_id' => $this->branchA->id,
            'stock_status' => 'low_stock',
        ]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.primary_reference', 'TOY-002')
            ->where('products.data.0.stock_status', 'LOW_STOCK')
        );
});

test('regular user sees all catalog products for their branch with stocked items first', function () {
    // Product with stock
    $productWithStock = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'WITH-STOCK-01',
        'normalized_reference' => 'WITHSTOCK01',
        'name' => 'Repuesto Con Stock',
        'normalized_name' => 'REPUESTOCONSTOCK',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $productWithStock->id,
        'physical_quantity' => 15,
        'available_quantity' => 15,
        'average_cost' => 30.00,
        'status' => 'ACTIVE',
    ]);

    // Product without inventory in branchA
    $productWithoutStock = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'NO-STOCK-01',
        'normalized_reference' => 'NOSTOCK01',
        'name' => 'Repuesto Sin Stock',
        'normalized_name' => 'REPUESTOSINSTOCK',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
    ]);

    $response = $this->actingAs($this->sellerUser)
        ->get(route('inventory.index'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('catalog/inventory/index')
            ->has('products.data', 2)
            // Stocked item is first
            ->where('products.data.0.primary_reference', 'WITH-STOCK-01')
            ->where('products.data.0.physical_quantity', 15)
            // 0-stock item is visible and second
            ->where('products.data.1.primary_reference', 'NO-STOCK-01')
            ->where('products.data.1.physical_quantity', 0)
            ->where('products.data.1.stock_status', 'OUT_OF_STOCK')
        );
});

test('inventory index filters by stock_status out_of_stock and in_stock', function () {
    $productWithStock = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'STOCK-GT0',
        'normalized_reference' => 'STOCKGT0',
        'name' => 'Producto con Existencia',
        'normalized_name' => 'PRODUCTOCONEXISTENCIA',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $productWithStock->id,
        'physical_quantity' => 5,
        'available_quantity' => 5,
        'average_cost' => 20.00,
        'status' => 'ACTIVE',
    ]);

    $productZeroStock = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'STOCK-ZERO',
        'normalized_reference' => 'STOCKZERO',
        'name' => 'Producto Cero Existencia',
        'normalized_name' => 'PRODUCTOCEROEXISTENCIA',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
    ]);

    // Test in_stock filter
    $responseInStock = $this->actingAs($this->adminUser)
        ->get(route('inventory.index', [
            'branch_id' => $this->branchA->id,
            'stock_status' => 'in_stock',
        ]));

    $responseInStock->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.primary_reference', 'STOCK-GT0')
        );

    // Test out_of_stock filter
    $responseOutOfStock = $this->actingAs($this->adminUser)
        ->get(route('inventory.index', [
            'branch_id' => $this->branchA->id,
            'stock_status' => 'out_of_stock',
        ]));

    $responseOutOfStock->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.primary_reference', 'STOCK-ZERO')
        );
});
