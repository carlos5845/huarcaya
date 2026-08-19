<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$info = Illuminate\Support\Facades\DB::select("PRAGMA table_info('products')");
foreach ($info as $col) {
    if ($col->name === 'internal_code') {
        echo json_encode($col);
    }
}
