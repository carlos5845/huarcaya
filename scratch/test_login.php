<?php

use Illuminate\Http\Request;

$request = Request::create('/login', 'POST', ['dni' => '12345678', 'password' => 'password']);
$response = app()->handle($request);
dump($response->getStatusCode(), $response->headers->get('Location'), session()->all());
