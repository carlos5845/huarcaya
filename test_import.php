<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$company = Company::first();

$ref = 'TEST-' . rand(1000, 9999);
$name = 'Test Product ' . rand(1000, 9999);
$normalizedRef = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $ref));

try {
    $product = Product::create([
        'uuid' => Str::uuid(),
        'company_id' => $company->id,
        'primary_reference' => $ref,
        'normalized_reference' => $normalizedRef,
        'name' => trim($name),
        'normalized_name' => Str::slug(trim($name)),
        'unit_id' => App\Models\Unit::firstOrCreate(['name' => 'Unidad', 'company_id' => $company->id], ['uuid' => Str::uuid(), 'code' => 'UNI', 'symbol' => 'UNI', 'status' => 'ACTIVE'])->id,
        'status' => 'ACTIVE',
    ]);
    echo "Product created successfully! ID: " . $product->id . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
