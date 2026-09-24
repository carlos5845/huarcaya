<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Product;
use App\Models\Transfer;
use App\Models\TransferLine;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'view_transfers', 'guard_name' => 'web']);
    $superAdminRole->givePermissionTo('view_transfers');

    $company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Inversiones Huarcaya',
        'business_name' => 'INVERSIONES HUARCAYA S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20601234567',
        'address' => 'Av. Automotriz 123',
    ]);
    $this->user = User::factory()->create(['company_id' => $company->id, 'status' => 'ACTIVE']);
    $this->user->assignRole('Super Admin');

    $this->branchA = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $company->id,
        'name' => 'Sede Central',
        'address' => 'Av. Principal 100',
        'phone' => '999888777',
        'status' => 'ACTIVE',
    ]);

    $this->branchB = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $company->id,
        'name' => 'Sede Chimbote',
        'address' => 'Jr. Progreso 500',
        'phone' => '999111222',
        'status' => 'ACTIVE',
    ]);

    $unit = Unit::create(['uuid' => (string) Str::uuid(), 'company_id' => $company->id, 'name' => 'Pieza', 'code' => 'PZA']);

    $this->product = Product::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $company->id,
        'name' => 'Filtro de Aceite',
        'normalized_name' => 'filtro de aceite',
        'primary_reference' => 'FLT-001',
        'normalized_reference' => 'flt-001',
        'internal_code' => 'SKU-FLT-1',
        'unit_id' => $unit->id,
    ]);

    $this->transfer = Transfer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $company->id,
        'source_branch_id' => $this->branchA->id,
        'destination_branch_id' => $this->branchB->id,
        'transfer_number' => 'TR-000001',
        'request_date' => now(),
        'status' => 'DRAFT',
        'notes' => 'Traslado urgente',
        'created_by' => $this->user->id,
    ]);

    TransferLine::create([
        'uuid' => (string) Str::uuid(),
        'transfer_id' => $this->transfer->id,
        'product_id' => $this->product->id,
        'requested_quantity' => 15,
        'shipped_quantity' => 15,
    ]);
});

it('can render internal transfer note in A4 format', function () {
    $this->actingAs($this->user);

    $response = $this->get(route('transfers.print.internal', ['transfer' => $this->transfer->id, 'format' => 'a4']));

    $response->assertOk();
    $response->assertSee('NOTA DE TRASLADO INTERNO');
    $response->assertSee('TR-000001');
    $response->assertSee('Sede Central');
    $response->assertSee('Sede Chimbote');
    $response->assertSee('Filtro de Aceite');
    $response->assertSee('Entregado por (Origen)');
});

it('can render internal transfer ticket in 80mm format', function () {
    $this->actingAs($this->user);

    $response = $this->get(route('transfers.print.internal', ['transfer' => $this->transfer->id, 'format' => 'ticket']));

    $response->assertOk();
    $response->assertSee('TICKET DE TRASLADO INTERNO');
    $response->assertSee('TR-000001');
    $response->assertSee('Filtro de Aceite');
    $response->assertSee('TOTAL UNIDADES');
});

it('can render warehouse picking list', function () {
    $this->actingAs($this->user);

    $response = $this->get(route('transfers.print.picking', ['transfer' => $this->transfer->id]));

    $response->assertOk();
    $response->assertSee('HOJA DE PICKING');
    $response->assertSee('TR-000001');
    $response->assertSee('Filtro de Aceite');
    $response->assertSee('Preparado por (Almacenero)');
});

it('can render SUNAT electronic remittance guide format', function () {
    $this->actingAs($this->user);

    $response = $this->get(route('transfers.print.guide', ['transfer' => $this->transfer->id]));

    $response->assertOk();
    $response->assertSee('GUÍA DE REMISIÓN ELECTRÓNICA');
    $response->assertSee('04 - TRASLADO ENTRE ESTABLECIMIENTOS DE LA MISMA EMPRESA');
    $response->assertSee('T001-');
    $response->assertSee('Filtro de Aceite');
});
