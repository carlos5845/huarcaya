<?php

use App\Models\Company;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

    // According to app-sidebar, it checks for 'view_customers' permission or Super Admin.
    // Super Admin handles everything typically.
    $company = Company::create(['uuid' => (string) Str::uuid(), 'name' => 'Empresa Test', 'document_type' => 'RUC', 'document_number' => '12345678901']);

    $this->company = $company;
    $this->user = tap(User::factory()->create(['company_id' => $company->id, 'status' => 'ACTIVE']), function (User $user) {
        $user->assignRole('Super Admin');
    });
});

test('can list customers', function () {
    Customer::factory()->count(3)->create(['company_id' => $this->company->id]);

    $this->actingAs($this->user)
        ->get('/customers')
        ->assertStatus(200);
});

test('can create a customer', function () {
    $data = [
        'document_type' => 'DNI',
        'document_number' => '12345678',
        'legal_name' => 'John Doe',
        'status' => 'ACTIVE',
    ];

    $this->actingAs($this->user)
        ->post('/customers', $data)
        ->assertRedirect();

    $this->assertDatabaseHas('customers', [
        'document_number' => '12345678',
        'legal_name' => 'John Doe',
    ]);
});

test('can update a customer', function () {
    $customer = Customer::factory()->create(['company_id' => $this->company->id]);

    $data = [
        'document_type' => 'DNI',
        'document_number' => '87654321',
        'legal_name' => 'Jane Doe updated',
        'status' => 'ACTIVE',
    ];

    $this->actingAs($this->user)
        ->put("/customers/{$customer->id}", $data)
        ->assertRedirect();

    $this->assertDatabaseHas('customers', [
        'id' => $customer->id,
        'document_number' => '87654321',
        'legal_name' => 'Jane Doe updated',
    ]);
});

test('can deactivate a customer', function () {
    $customer = Customer::factory()->create([
        'company_id' => $this->company->id,
        'status' => 'ACTIVE',
    ]);

    $this->actingAs($this->user)
        ->delete("/customers/{$customer->id}")
        ->assertRedirect();

    $this->assertDatabaseHas('customers', [
        'id' => $customer->id,
        'status' => 'INACTIVE',
    ]);
});
