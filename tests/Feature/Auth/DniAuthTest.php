<?php

use App\Models\User;
use App\Models\Company;
use App\Models\Branch;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->companyId = DB::table('companies')->insertGetId([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'name' => 'Test Company',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->branchId = DB::table('branches')->insertGetId([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'company_id' => $this->companyId,
        'code' => 'BR-001',
        'name' => 'Main Branch',
        'type' => 'STORE',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    
    $this->user = User::create([
        'uuid' => \Illuminate\Support\Str::uuid(),
        'name' => 'Test User',
        'dni' => '12345678',
        'password' => Hash::make('password123'),
        'company_id' => $this->companyId,
        'default_branch_id' => $this->branchId,
        'status' => 'ACTIVE',
    ]);
});

it('can check dni and return user info', function () {
    $response = $this->postJson('/auth/check-dni', [
        'dni' => '12345678'
    ]);

    $response->assertStatus(200)
             ->assertJson([
                 'name' => $this->user->name,
                 'dni' => '12345678',
                 'branch' => 'Main Branch',
             ]);
});

it('fails to check invalid dni', function () {
    $response = $this->postJson('/auth/check-dni', [
        'dni' => '87654321'
    ]);

    $response->assertStatus(404);
});

it('can request otp for password reset', function () {
    $response = $this->postJson('/auth/forgot-password-otp', [
        'dni' => '12345678'
    ]);

    $response->assertStatus(200);

    $this->assertDatabaseHas('otp_codes', [
        'dni' => '12345678',
        'is_used' => false,
    ]);
});

it('can reset password with valid otp', function () {
    $otpCode = '123456';
    
    DB::table('otp_codes')->insert([
        'dni' => '12345678',
        'code' => Hash::make($otpCode),
        'expires_at' => now()->addMinutes(10),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->postJson('/auth/reset-password-otp', [
        'dni' => '12345678',
        'code' => $otpCode,
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
    ]);

    $response->assertStatus(200);

    $this->assertDatabaseHas('otp_codes', [
        'dni' => '12345678',
        'is_used' => true,
    ]);

    $this->assertTrue(Hash::check('newpassword123', $this->user->fresh()->password));
});
