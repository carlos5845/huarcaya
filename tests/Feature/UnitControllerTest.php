<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Permission::firstOrCreate(['name' => 'view_products', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Empresa Test',
        'document_type' => 'RUC',
        'document_number' => '12345678901',
    ]);

    $this->branch = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Central',
        'address' => 'Av. Central 123',
        'phone' => '999888777',
        'status' => 'ACTIVE',
    ]);

    $this->user = User::factory()->create([
        'company_id' => $this->company->id,
        'status' => 'ACTIVE',
        'default_branch_id' => $this->branch->id,
    ]);
    $this->user->assignRole('Super Admin');
});

test('usuario autenticado puede ver el listado de unidades', function () {
    Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'UND',
        'name' => 'Unidad',
        'status' => 'ACTIVE',
    ]);

    $response = $this->actingAs($this->user)->get(route('units.index'));
    $response->assertOk();
});

test('usuario autenticado puede crear una nueva unidad de medida', function () {
    $response = $this->actingAs($this->user)->post(route('units.store'), [
        'code' => 'KGM',
        'name' => 'Kilogramo',
        'status' => 'ACTIVE',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $this->assertDatabaseHas('units', [
        'company_id' => $this->company->id,
        'code' => 'KGM',
        'name' => 'Kilogramo',
        'status' => 'ACTIVE',
    ]);
});

test('no permite registrar unidad duplicada con espacios o mayusculas distintas', function () {
    Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'MTR',
        'name' => 'Metro Lineal',
        'status' => 'ACTIVE',
    ]);

    $response = $this->actingAs($this->user)->post(route('units.store'), [
        'code' => 'MT2',
        'name' => 'metro lineal',
        'status' => 'ACTIVE',
    ]);

    $response->assertSessionHasErrors(['name']);
});

test('usuario puede actualizar una unidad de medida', function () {
    $unit = Unit::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'code' => 'LT',
        'name' => 'Litro',
        'status' => 'ACTIVE',
    ]);

    $response = $this->actingAs($this->user)->put(route('units.update', $unit), [
        'code' => 'LTR',
        'name' => 'Litros',
        'status' => 'ACTIVE',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $this->assertDatabaseHas('units', [
        'id' => $unit->id,
        'code' => 'LTR',
        'name' => 'Litros',
    ]);
});
