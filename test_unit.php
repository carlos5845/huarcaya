<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$companyId = 1;
$normalizedName = 'UNIDAD';

$exists = \App\Models\Unit::where('company_id', $companyId)->whereRaw('UPPER(REPLACE(name, " ", "")) = ?', [$normalizedName])->exists();
echo "Exists: " . ($exists ? 'true' : 'false') . "\n";
