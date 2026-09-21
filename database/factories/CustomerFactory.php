<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'company_id' => 1,
            'document_type' => $this->faker->randomElement(['DNI', 'RUC']),
            'document_number' => $this->faker->numerify('########'),
            'legal_name' => $this->faker->name,
            'trade_name' => $this->faker->company,
            'phone' => $this->faker->phoneNumber,
            'email' => $this->faker->unique()->safeEmail,
            'address' => $this->faker->address,
            'status' => 'ACTIVE',
        ];
    }
}
