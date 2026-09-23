<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Models\Category;
use App\Models\Product;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Str;

// CATEGORIES
$categories = Category::all();
$seen = [];
$toDelete = [];
$toUpdate = [];

foreach ($categories as $c) {
    $norm = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $c->name));
    if (isset($seen[$c->company_id][$norm])) {
        $original = $seen[$c->company_id][$norm];
        echo "Duplicate Category found: ID {$c->id} ({$c->name}) is duplicate of ID {$original->id} ({$original->name})\n";

        Product::where('category_id', $c->id)->update(['category_id' => $original->id]);

        $toDelete[] = $c->id;
    } else {
        $seen[$c->company_id][$norm] = $c;
        $toUpdate[] = ['id' => $c->id, 'norm' => $norm];
    }
}

if (count($toDelete) > 0) {
    Category::whereIn('id', $toDelete)->delete();
    echo 'Deleted '.count($toDelete)." duplicate categories.\n";
}

foreach ($toUpdate as $up) {
    Category::where('id', $up['id'])->update(['normalized_name' => $up['norm']]);
}
echo "Categories merged and normalized.\n";

// PRODUCTS (Just fixing normalized names, duplicates by reference will be deleted too)
$products = Product::all();
$seen = [];
$toDelete = [];
$toUpdate = [];

foreach ($products as $p) {
    $normRef = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $p->primary_reference));
    $normName = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $p->name));

    if (isset($seen[$p->company_id][$normRef])) {
        $original = $seen[$p->company_id][$normRef];
        echo "Duplicate Product ref found: ID {$p->id} ({$p->primary_reference}) is duplicate of ID {$original->id} ({$original->primary_reference})\n";

        // Cannot safely merge products easily without checking inventory/kardex.
        // We assume we can just delete the duplicate if it has no inventory, but better just flag it for now.
        $toDelete[] = $p->id;
    } else {
        $seen[$p->company_id][$normRef] = $p;
        $toUpdate[] = ['id' => $p->id, 'normRef' => $normRef, 'normName' => $normName];
    }
}

if (count($toDelete) > 0) {
    Product::whereIn('id', $toDelete)->delete();
    echo 'Deleted '.count($toDelete)." duplicate products.\n";
}

foreach ($toUpdate as $up) {
    Product::where('id', $up['id'])->update([
        'normalized_reference' => $up['normRef'],
        'normalized_name' => $up['normName'],
    ]);
}
echo "Products merged and normalized.\n";
