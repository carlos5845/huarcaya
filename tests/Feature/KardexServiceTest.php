<?php

use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Company;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use App\Services\KardexService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->company = Company::create(['uuid' => Str::uuid(), 'name' => 'Test Company']);
    $this->branch = Branch::create(['uuid' => Str::uuid(), 'company_id' => $this->company->id, 'name' => 'Test Branch']);
    $this->user = User::factory()->create(['uuid' => Str::uuid(), 'company_id' => $this->company->id]);

    $brand = Brand::create(['uuid' => Str::uuid(), 'company_id' => $this->company->id, 'code' => 'B01', 'name' => 'TEST', 'normalized_name' => 'TEST']);
    $category = Category::create(['uuid' => Str::uuid(), 'company_id' => $this->company->id, 'code' => 'C01', 'name' => 'TEST', 'normalized_name' => 'TEST']);
    $unit = Unit::create(['uuid' => Str::uuid(), 'company_id' => $this->company->id, 'code' => 'U01', 'name' => 'TEST', 'normalized_name' => 'TEST']);

    $this->product = Product::create([
        'uuid' => Str::uuid(),
        'company_id' => $this->company->id,
        'brand_id' => $brand->id,
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'name' => 'Test Product',
        'primary_reference' => 'PRD-001',
        'normalized_reference' => 'PRD001',
        'normalized_name' => 'TEST PRODUCT',
    ]);

    $this->service = new KardexService;
});

it('records an entry and calculates average cost correctly', function () {
    // 1st Entry: 10 units @ 100
    $kardex1 = $this->service->recordEntry([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
        'unit_cost' => 100,
        'operation_type' => 'COMPRA',
        'user_id' => $this->user->id,
    ]);

    expect($kardex1->balance_quantity)->toEqual(10)
        ->and($kardex1->balance_unit_cost)->toEqual(100)
        ->and($kardex1->balance_total_cost)->toEqual(1000);

    $inventory = Inventory::where('product_id', $this->product->id)->first();
    expect($inventory->physical_quantity)->toEqual(10)
        ->and($inventory->average_cost)->toEqual(100);

    // 2nd Entry: 10 units @ 150 (Total should be 20 units @ 125)
    $kardex2 = $this->service->recordEntry([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
        'unit_cost' => 150,
        'operation_type' => 'COMPRA',
        'user_id' => $this->user->id,
    ]);

    expect($kardex2->balance_quantity)->toEqual(20)
        ->and($kardex2->balance_unit_cost)->toEqual(125) // (1000 + 1500) / 20 = 125
        ->and($kardex2->balance_total_cost)->toEqual(2500);

    $inventory->refresh();
    expect($inventory->physical_quantity)->toEqual(20)
        ->and($inventory->average_cost)->toEqual(125);
});

it('prevents negative stock when recording an exit', function () {
    $this->expectException(InvalidArgumentException::class);
    $this->expectExceptionMessage('No existe inventario para este producto en la sucursal indicada');

    $this->service->recordExit([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 5, // Stock is 0
        'operation_type' => 'VENTA',
        'user_id' => $this->user->id,
    ]);
});

it('records an exit maintaining the current average cost', function () {
    // Setup initial stock: 10 @ 100
    $this->service->recordEntry([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 10,
        'unit_cost' => 100,
        'operation_type' => 'INVENTARIO_INICIAL',
        'user_id' => $this->user->id,
    ]);

    // Exit 4 units
    $kardex = $this->service->recordExit([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 4,
        'operation_type' => 'VENTA',
        'user_id' => $this->user->id,
    ]);

    // Expected: 6 units remaining @ 100 = 600
    expect($kardex->output_quantity)->toEqual(4)
        ->and($kardex->output_unit_cost)->toEqual(100)
        ->and($kardex->output_total_cost)->toEqual(400)
        ->and($kardex->balance_quantity)->toEqual(6)
        ->and($kardex->balance_unit_cost)->toEqual(100)
        ->and($kardex->balance_total_cost)->toEqual(600);
});

it('reverses an entry correctly', function () {
    $original = $this->service->recordEntry([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 5,
        'unit_cost' => 200,
        'operation_type' => 'COMPRA',
        'user_id' => $this->user->id,
    ]);

    $reversal = $this->service->reverseMovement($original->id, $this->user->id);

    expect($reversal->operation_type)->toEqual('REVERSO_ENTRADA')
        ->and($reversal->output_quantity)->toEqual(5)
        ->and($reversal->original_entry_id)->toEqual($original->id);

    $original->refresh();
    expect($original->reversed_by_entry_id)->toEqual($reversal->id);

    $inventory = Inventory::where('product_id', $this->product->id)->first();
    expect($inventory->physical_quantity)->toEqual(0);
});

it('prevents reversing an already reversed entry', function () {
    $original = $this->service->recordEntry([
        'branch_id' => $this->branch->id,
        'product_id' => $this->product->id,
        'quantity' => 5,
        'unit_cost' => 200,
        'operation_type' => 'COMPRA',
        'user_id' => $this->user->id,
    ]);

    $this->service->reverseMovement($original->id, $this->user->id);

    $this->expectException(InvalidArgumentException::class);
    $this->expectExceptionMessage('El movimiento ya ha sido revertido previamente');

    $this->service->reverseMovement($original->id, $this->user->id);
});
