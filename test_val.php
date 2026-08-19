<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$e = \Illuminate\Validation\ValidationException::withMessages(['name' => 'Ya existe.']);
echo json_encode($e->errors());
