<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

$models = [
    \App\Models\Brand::class,
    \App\Models\Category::class,
    \App\Models\Product::class,
];

foreach ($models as $modelClass) {
    $items = $modelClass::all();
    foreach ($items as $item) {
        $nn = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $item->name));
        if ($item->normalized_name !== $nn) {
            try {
                $item->normalized_name = $nn;
                $item->save();
                echo class_basename($modelClass) . " ID {$item->id} normalized_name updated to {$nn}\n";
            } catch (\Exception $e) {
                echo class_basename($modelClass) . " ID {$item->id} FAILED: " . $e->getMessage() . "\n";
                // Handle duplicate
                $item->normalized_name = $nn . '_' . $item->id;
                $item->name = $item->name . ' (Duplicado)';
                $item->save();
                echo class_basename($modelClass) . " ID {$item->id} normalized_name updated to {$item->normalized_name}\n";
            }
        }
    }
}
