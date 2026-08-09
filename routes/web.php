<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\CheckUserController;
use App\Http\Controllers\Auth\OtpPasswordResetController;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::middleware(['role:Super Admin'])->group(function () {
        Route::resource('branches', \App\Http\Controllers\BranchController::class)->except(['create', 'show', 'edit']);
        Route::resource('users', \App\Http\Controllers\UserController::class)->except(['create', 'show', 'edit']);
        Route::get('users/{user}/sessions', [\App\Http\Controllers\UserSessionController::class, 'index'])->name('users.sessions');
        Route::delete('users/{user}/sessions/{session}', [\App\Http\Controllers\UserSessionController::class, 'destroy'])->name('users.sessions.destroy');
    });
});

require __DIR__.'/settings.php';

Route::post('/auth/check-dni', CheckUserController::class);
Route::post('/auth/forgot-password-otp', [OtpPasswordResetController::class, 'requestOtp']);
Route::post('/auth/reset-password-otp', [OtpPasswordResetController::class, 'resetPassword']);

Route::middleware('guest')->group(function () {
    Route::inertia('/login', 'auth/login')->name('login');
});
