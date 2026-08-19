<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Str;

$brands = \App\Models\Brand::all();
foreach ($brands as $b) {
    try {
        $b->update(['normalized_name' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $b->name))]);
    } catch (\Exception $e) {
        echo "Error on Brand {$b->id}: " . $e->getMessage() . "\n";
    }
}
echo "Brands done\n";

$categories = \App\Models\Category::all();
foreach ($categories as $c) {
    try {
        $c->update(['normalized_name' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $c->name))]);
    } catch (\Exception $e) {
        echo "Error on Category {$c->id}: " . $e->getMessage() . "\n";
    }
}
echo "Categories done\n";

$products = \App\Models\Product::all();
foreach ($products as $p) {
    try {
        $p->update([
            'normalized_name' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $p->name)),
            'normalized_reference' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $p->primary_reference))
        ]);
    } catch (\Exception $e) {
        echo "Error on Product {$p->id}: " . $e->getMessage() . "\n";
    }
}
echo "Products done\n";
