<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $companies = Company::all();

        $methods = [
            ['code' => 'CASH', 'name' => 'Efectivo', 'is_cash' => true],
            ['code' => 'YAPE', 'name' => 'Yape', 'is_cash' => false],
            ['code' => 'PLIN', 'name' => 'Plin', 'is_cash' => false],
            ['code' => 'TRANSFER', 'name' => 'Transferencia Bancaria', 'is_cash' => false],
            ['code' => 'CARD', 'name' => 'Tarjeta (POS)', 'is_cash' => false],
        ];

        foreach ($companies as $company) {
            foreach ($methods as $method) {
                PaymentMethod::firstOrCreate([
                    'company_id' => $company->id,
                    'code' => $method['code'],
                ], [
                    'uuid' => (string) Str::uuid(),
                    'name' => $method['name'],
                    'is_cash' => $method['is_cash'],
                    'is_active' => true,
                ]);
            }
        }
    }
}
