<?php

use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\Lot;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
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
    $viewProductsPermission = Permission::firstOrCreate(['name' => 'view_products', 'guard_name' => 'web']);
    $this->sellerRole->givePermissionTo($viewProductsPermission);

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
    $this->sellerUser->branches()->attach($this->branchB->id, ['is_default' => true]);
    $this->sellerUser->default_branch_id = $this->branchB->id;
    $this->sellerUser->save();

    $this->brand = Brand::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Bosch',
        'normalized_name' => 'BOSCH',
        'code' => 'BOS',
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
        'name' => 'Unidad',
        'code' => 'NIU',
        'status' => 'ACTIVE',
    ]);
});

it('creates product with initial prices and initial stock assigned to chosen branch as super admin', function () {
    $this->actingAs($this->adminUser);

    $response = $this->post(route('products.store'), [
        'primary_reference' => 'PAST-BOSCH-001',
        'name' => 'Pastilla de Freno Bosch Delantera',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
        'initial_price' => 120.00,
        'initial_min_price' => 95.00,
        'has_initial_stock' => true,
        'initial_branch_id' => $this->branchA->id,
        'initial_stock' => 15,
        'initial_unit_cost' => 60.00,
    ]);

    $response->assertSessionHasNoErrors();
    $product = Product::where('primary_reference', 'PAST-BOSCH-001')->first();
    expect($product)->not->toBeNull();

    // Verify prices
    expect($product->prices()->count())->toBe(1);
    expect((float) $product->prices()->first()->amount)->toEqual(120.00);

    expect($product->minPrices()->count())->toBe(1);
    expect((float) $product->minPrices()->first()->amount)->toEqual(95.00);

    // Verify stock & lots
    $inventory = Inventory::where('product_id', $product->id)
        ->where('branch_id', $this->branchA->id)
        ->first();
    expect($inventory)->not->toBeNull();
    expect((float) $inventory->physical_quantity)->toEqual(15.00);
    expect((float) $inventory->available_quantity)->toEqual(15.00);

    $lot = Lot::where('product_id', $product->id)
        ->where('branch_id', $this->branchA->id)
        ->first();
    expect($lot)->not->toBeNull();
    expect((float) $lot->current_quantity)->toEqual(15.00);
    expect((float) $lot->unit_cost)->toEqual(60.00);
    expect($lot->status)->toBe('ACTIVE');
});

it('restricts non-admin to their assigned branch when creating initial stock', function () {
    $this->actingAs($this->sellerUser);

    // Seller belongs to branchB, but attempts to set initial_branch_id to branchA
    $response = $this->post(route('products.store'), [
        'primary_reference' => 'DISC-BOSCH-002',
        'name' => 'Disco de Freno Ventilado Bosch',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
        'initial_price' => 250.00,
        'initial_min_price' => 200.00,
        'has_initial_stock' => true,
        'initial_branch_id' => $this->branchA->id, // Unauthorized branch
        'initial_stock' => 8,
        'initial_unit_cost' => 140.00,
    ]);

    $response->assertSessionHasNoErrors();
    $product = Product::where('primary_reference', 'DISC-BOSCH-002')->first();
    expect($product)->not->toBeNull();

    // Must be assigned to branchB (seller default branch), NOT branchA
    $inventoryBranchB = Inventory::where('product_id', $product->id)
        ->where('branch_id', $this->branchB->id)
        ->first();
    expect($inventoryBranchB)->not->toBeNull();
    expect((float) $inventoryBranchB->physical_quantity)->toEqual(8.00);

    $inventoryBranchA = Inventory::where('product_id', $product->id)
        ->where('branch_id', $this->branchA->id)
        ->first();
    expect($inventoryBranchA)->toBeNull();
});

it('allows quick stock adjustment positive and negative in product show', function () {
    $this->actingAs($this->adminUser);

    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'FILT-BOSCH-003',
        'normalized_reference' => 'FILTBOSCH003',
        'name' => 'Filtro de Aceite Bosch',
        'normalized_name' => 'FILTRO DE ACEITE BOSCH',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
        'created_by' => $this->adminUser->id,
    ]);

    // 1. Positive adjustment (+10 units)
    $response = $this->post(route('products.quick-adjust-stock', $product->id), [
        'branch_id' => $this->branchA->id,
        'type' => 'POSITIVE',
        'quantity' => 10,
        'unit_cost' => 25.00,
        'reason' => 'SOBRANTE_FISICO',
    ]);

    $response->assertSessionHas('success');
    $inventory = Inventory::where('product_id', $product->id)
        ->where('branch_id', $this->branchA->id)
        ->first();
    expect((float) $inventory->available_quantity)->toEqual(10.00);

    $lot = Lot::where('product_id', $product->id)
        ->where('branch_id', $this->branchA->id)
        ->first();
    expect($lot)->not->toBeNull();
    expect((float) $lot->current_quantity)->toEqual(10.00);

    // 2. Negative adjustment (-3 units)
    $response2 = $this->post(route('products.quick-adjust-stock', $product->id), [
        'branch_id' => $this->branchA->id,
        'type' => 'NEGATIVE',
        'quantity' => 3,
        'reason' => 'MERMA_DETERIORO',
    ]);

    $response2->assertSessionHas('success');
    $inventory->refresh();
    expect((float) $inventory->available_quantity)->toEqual(7.00);

    $lot->refresh();
    expect((float) $lot->current_quantity)->toEqual(7.00);
});

it('prevents non-admin from quick adjusting stock in an unauthorized branch', function () {
    $this->actingAs($this->sellerUser);

    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'BUJ-BOSCH-004',
        'normalized_reference' => 'BUJBOSCH004',
        'name' => 'Bujía de Iridio Bosch',
        'normalized_name' => 'BUJIA DE IRIDIO BOSCH',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
        'created_by' => $this->sellerUser->id,
    ]);

    // Seller belongs to branchB, tries to adjust branchA
    $response = $this->post(route('products.quick-adjust-stock', $product->id), [
        'branch_id' => $this->branchA->id,
        'type' => 'POSITIVE',
        'quantity' => 5,
        'unit_cost' => 15.00,
        'reason' => 'CONTEO_FISICO',
    ]);

    $response->assertSessionHas('error');

    $inventory = Inventory::where('product_id', $product->id)
        ->where('branch_id', $this->branchA->id)
        ->first();
    expect($inventory)->toBeNull();
});

it('displays all operational branch inventories to non-admin users in product show', function () {
    $this->actingAs($this->sellerUser);

    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'ROT-BOSCH-005',
        'normalized_reference' => 'ROTBOSCH005',
        'name' => 'Rótula de Dirección Bosch',
        'normalized_name' => 'ROTULA DE DIRECCION BOSCH',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
        'created_by' => $this->sellerUser->id,
    ]);

    // Inventory in branchA (Sede Central) and branchB (Sede Los Olivos)
    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchA->id,
        'product_id' => $product->id,
        'physical_quantity' => 12.00,
        'available_quantity' => 10.00,
        'average_cost' => 45.00,
    ]);

    Inventory::create([
        'uuid' => (string) Str::uuid(),
        'branch_id' => $this->branchB->id,
        'product_id' => $product->id,
        'physical_quantity' => 4.00,
        'available_quantity' => 4.00,
        'average_cost' => 45.00,
    ]);

    $response = $this->get(route('products.show', $product->id));
    $response->assertOk();

    // Verify props contain all branches and userBranchId
    $branchesProp = $response->viewData('page')['props']['branches'];
    expect(count($branchesProp))->toBeGreaterThanOrEqual(2);

    $userBranchIdProp = $response->viewData('page')['props']['userBranchId'];
    expect($userBranchIdProp)->toEqual($this->branchB->id);

    $productProp = $response->viewData('page')['props']['product'];
    expect(count($productProp['inventories']))->toBe(2);
});

it('allows non-admin to quick adjust stock for their currently assigned branch', function () {
    $this->actingAs($this->sellerUser);

    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'TERM-BOSCH-006',
        'normalized_reference' => 'TERMBOSCH006',
        'name' => 'Terminal de Dirección Bosch',
        'normalized_name' => 'TERMINAL DE DIRECCION BOSCH',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
        'created_by' => $this->sellerUser->id,
    ]);

    // Seller belongs to branchB and adjusts branchB
    $response = $this->post(route('products.quick-adjust-stock', $product->id), [
        'branch_id' => $this->branchB->id,
        'type' => 'POSITIVE',
        'quantity' => 6,
        'unit_cost' => 30.00,
        'reason' => 'CONTEO_FISICO',
    ]);

    $response->assertSessionHas('success');

    $inventory = Inventory::where('product_id', $product->id)
        ->where('branch_id', $this->branchB->id)
        ->first();
    expect($inventory)->not->toBeNull();
    expect((float) $inventory->available_quantity)->toEqual(6.00);
});

it('allows admin to set min stock alert threshold for any branch', function () {
    $this->actingAs($this->adminUser);

    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'ALT-BOSCH-007',
        'normalized_reference' => 'ALTBOSCH007',
        'name' => 'Alternador Bosch',
        'normalized_name' => 'ALTERNADOR BOSCH',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
        'created_by' => $this->adminUser->id,
    ]);

    $response = $this->post(route('products.min-stocks.store', $product->id), [
        'branch_id' => $this->branchA->id,
        'quantity' => 15,
    ]);

    $response->assertSessionHas('success');
    $minStock = $product->minStocks()->where('branch_id', $this->branchA->id)->first();
    expect($minStock)->not->toBeNull();
    expect((float) $minStock->minimum_quantity)->toEqual(15.00);
});

it('prevents non-admin from configuring min stock alert for another branch', function () {
    $this->actingAs($this->sellerUser);

    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'ALT-BOSCH-008',
        'normalized_reference' => 'ALTBOSCH008',
        'name' => 'Alternador 2 Bosch',
        'normalized_name' => 'ALTERNADOR 2 BOSCH',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
        'created_by' => $this->sellerUser->id,
    ]);

    // Seller belongs to branchB, tries to set alert for branchA
    $response = $this->post(route('products.min-stocks.store', $product->id), [
        'branch_id' => $this->branchA->id,
        'quantity' => 10,
    ]);

    $response->assertSessionHas('error');
    $minStock = $product->minStocks()->where('branch_id', $this->branchA->id)->first();
    expect($minStock)->toBeNull();
});

it('allows non-admin to configure min stock alert for their assigned branch', function () {
    $this->actingAs($this->sellerUser);

    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'ALT-BOSCH-009',
        'normalized_reference' => 'ALTBOSCH009',
        'name' => 'Alternador 3 Bosch',
        'normalized_name' => 'ALTERNADOR 3 BOSCH',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
        'created_by' => $this->sellerUser->id,
    ]);

    // Seller belongs to branchB, sets alert for branchB
    $response = $this->post(route('products.min-stocks.store', $product->id), [
        'branch_id' => $this->branchB->id,
        'quantity' => 8,
    ]);

    $response->assertSessionHas('success');
    $minStock = $product->minStocks()->where('branch_id', $this->branchB->id)->first();
    expect($minStock)->not->toBeNull();
    expect((float) $minStock->minimum_quantity)->toEqual(8.00);
});

it('prevents non-admin from registering prices for unauthorized branches', function () {
    $this->actingAs($this->sellerUser);

    $product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'primary_reference' => 'ALT-BOSCH-010',
        'normalized_reference' => 'ALTBOSCH010',
        'name' => 'Alternador 4 Bosch',
        'normalized_name' => 'ALTERNADOR 4 BOSCH',
        'brand_id' => $this->brand->id,
        'category_id' => $this->category->id,
        'unit_id' => $this->unit->id,
        'product_type' => 'SIMPLE',
        'status' => 'ACTIVE',
        'created_by' => $this->sellerUser->id,
    ]);

    // Seller tries to set price for branchA
    $response = $this->post(route('products.prices.store', $product->id), [
        'branch_id' => $this->branchA->id,
        'amount' => 450.00,
    ]);

    $response->assertSessionHas('error');
    expect($product->prices()->where('branch_id', $this->branchA->id)->first())->toBeNull();

    // Seller sets price for their assigned branchB
    $response2 = $this->post(route('products.prices.store', $product->id), [
        'branch_id' => $this->branchB->id,
        'amount' => 450.00,
    ]);

    $response2->assertSessionHas('success');
    expect($product->prices()->where('branch_id', $this->branchB->id)->first())->not->toBeNull();
});
