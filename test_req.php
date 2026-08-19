<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$request = Illuminate\Http\Request::create('/units', 'POST', ['name' => 'unidad', 'code' => 'unidad', 'status' => 'ACTIVE']);
$request->setLaravelSession(app('session')->driver());
Auth::login(App\Models\User::first());

try {
    $controller = new App\Http\Controllers\UnitController();
    $controller->store($request);
} catch (\Illuminate\Validation\ValidationException $e) {
    echo "Validation errors:\n";
    print_r($e->errors());
}
