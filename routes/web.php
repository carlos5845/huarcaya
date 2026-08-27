<?php

use App\Http\Controllers\Auth\CheckUserController;
use App\Http\Controllers\Auth\OtpPasswordResetController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductImportController;
use App\Http\Controllers\ProductSettingsController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserSessionController;
use App\Http\Controllers\UserSetupController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
    $company_id = auth()->user()->company_id;

    $stats = [
        'customers_count' => \App\Models\Customer::where('company_id', $company_id)->count(),
        'products_count' => \App\Models\Product::where('company_id', $company_id)->count(),
        'sales_count' => \App\Models\Sale::where('company_id', $company_id)->count(),
        'purchases_count' => \App\Models\Purchase::where('company_id', $company_id)->count(),
        'recent_sales' => \App\Models\Sale::where('company_id', $company_id)->with('customer')->orderBy('created_at', 'desc')->take(5)->get(),
        'recent_purchases' => \App\Models\Purchase::where('company_id', $company_id)->with('supplier')->orderBy('created_at', 'desc')->take(5)->get(),
    ];

        $salesChart = \App\Models\Sale::where('company_id', $company_id)
            ->selectRaw("to_char(created_at, 'YYYY-MM') as month, sum(total_amount) as total")
            ->where('created_at', '>=', now()->subMonths(6))
            ->groupByRaw("to_char(created_at, 'YYYY-MM')")
            ->orderByRaw("to_char(created_at, 'YYYY-MM')")
            ->get();

    return Inertia::render('dashboard', [
        'stats' => $stats,
        'salesChart' => $salesChart
    ]);
})->name('dashboard');

    // Ruta necesaria para la confirmación de contraseña (Fortify views=false)
    Route::get('/user/confirm-password', function () {
        return Inertia::render('auth/confirm-password');
    })->name('password.confirm');

    // Configuración forzada en primer login
    Route::post('/user/setup-profile', [UserSetupController::class, 'store'])->name('user.setup-profile');

    // Branch Management
    Route::middleware(['role_or_permission:Super Admin|view_branches'])->group(function () {
        Route::resource('branches', BranchController::class)->except(['create', 'show', 'edit']);
    });

    // User & Role Management
    Route::middleware(['role_or_permission:Super Admin|view_users'])->group(function () {
        Route::resource('users', UserController::class)->except(['create', 'show', 'edit']);
        Route::post('roles', [RoleController::class, 'store'])->name('roles.store');
        Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
        Route::get('users/{user}/sessions', [UserSessionController::class, 'index'])->name('users.sessions');
        Route::delete('users/{user}/sessions/{session}', [UserSessionController::class, 'destroy'])->name('users.sessions.destroy');
    });

    // Modules (Access controlled by Frontend and specific permissions if needed)
        // Catalog Base Parameters
        Route::resource('brands', BrandController::class)->except(['create', 'show', 'edit']);
        Route::resource('categories', CategoryController::class)->except(['create', 'show', 'edit']);
        Route::resource('units', UnitController::class)->except(['create', 'show', 'edit']);

        Route::resource('customers', \App\Http\Controllers\CustomerController::class)->except(['create', 'show', 'edit']);
        Route::resource('suppliers', \App\Http\Controllers\SupplierController::class)->except(['create', 'show', 'edit']);

        Route::post('purchases/{purchase}/confirm', [\App\Http\Controllers\PurchaseController::class, 'confirm'])->name('purchases.confirm');
        Route::resource('purchases', \App\Http\Controllers\PurchaseController::class);

        Route::post('sales/{sale}/confirm', [\App\Http\Controllers\SaleController::class, 'confirm'])->name('sales.confirm');
        Route::resource('sales', \App\Http\Controllers\SaleController::class);

        // Products Catalog
        Route::get('products/search', [ProductController::class, 'search'])->name('products.search');
        Route::post('products/check-similarity', [ProductController::class, 'checkSimilarity'])->name('products.check-similarity');
        Route::resource('products', ProductController::class);

        Route::get('catalog/import', [ProductImportController::class, 'index'])->name('catalog.import');
        Route::get('catalog/import/template', [ProductImportController::class, 'downloadTemplate'])->name('catalog.import.template');
        Route::post('catalog/import', [ProductImportController::class, 'store'])->name('catalog.import.store');

        Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
        Route::get('kardex', [\App\Http\Controllers\KardexController::class, 'index'])->name('kardex.index');

        Route::post('inventory/adjustments/{adjustment}/confirm', [\App\Http\Controllers\InventoryAdjustmentController::class, 'confirm'])->name('inventory.adjustments.confirm');
        Route::resource('inventory/adjustments', \App\Http\Controllers\InventoryAdjustmentController::class)->names('inventory.adjustments');

        // Product Settings
        Route::post('products/{product}/prices', [ProductSettingsController::class, 'storePrice'])->name('products.prices.store');
        Route::delete('products/{product}/prices/{price}', [ProductSettingsController::class, 'destroyPrice'])->name('products.prices.destroy');

        Route::post('products/{product}/min-prices', [ProductSettingsController::class, 'storeMinPrice'])->name('products.min-prices.store');
        Route::delete('products/{product}/min-prices/{price}', [ProductSettingsController::class, 'destroyMinPrice'])->name('products.min-prices.destroy');

        Route::post('products/{product}/min-stocks', [ProductSettingsController::class, 'storeMinStock'])->name('products.min-stocks.store');
        Route::delete('products/{product}/min-stocks/{stock}', [ProductSettingsController::class, 'destroyMinStock'])->name('products.min-stocks.destroy');

        Route::post('products/{product}/kit-components', [ProductSettingsController::class, 'syncKitComponents'])->name('products.kit-components.sync');
});

require __DIR__.'/settings.php';

Route::post('/auth/check-dni', CheckUserController::class);
Route::post('/auth/forgot-password-question', [OtpPasswordResetController::class, 'requestQuestion']);
Route::post('/auth/reset-password-otp', [OtpPasswordResetController::class, 'resetPassword']);

Route::middleware('guest')->group(function () {
    Route::inertia('/login', 'auth/login')->name('login');
    Route::inertia('/forgot-password', 'auth/forgot-password')->name('password.request');
    Route::inertia('/two-factor-challenge', 'auth/two-factor-challenge')->name('two-factor.login');
});
