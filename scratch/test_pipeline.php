<?php

$request = \Illuminate\Http\Request::create('/login', 'POST', ['dni' => '12345678', 'password' => 'password']);
// We need to bind the request to the container and set up the session for testing
app()->instance('request', $request);
$request->setLaravelSession(app('session')->driver());
$request->session()->start();

$controller = app(\Laravel\Fortify\Http\Controllers\AuthenticatedSessionController::class);

try {
    $pipeline = app(\Illuminate\Routing\Pipeline::class)
        ->send($request)
        ->through(array_filter(config('fortify.pipelines.login')))
        ->then(function ($request) {
            return response('Login Passed Pipeline');
        });
    dump($pipeline->getContent());
} catch (\Illuminate\Validation\ValidationException $e) {
    dump('Validation Failed:', $e->errors());
} catch (\Exception $e) {
    dump('Exception:', $e->getMessage());
}
