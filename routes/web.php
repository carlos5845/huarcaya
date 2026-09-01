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
    Route::get('/init', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        if ($user->hasRole('Super Admin') || $user->hasPermissionTo('view_dashboard')) {
            return redirect('/dashboard');
        }
        if ($user->hasPermissionTo('view_inventory') || $user->hasPermissionTo('view_inventory_general')) {
            return redirect('/inventory');
        }
        if ($user->hasPermissionTo('view_sales')) {
            return redirect('/sales');
        }
        if ($user->hasPermissionTo('view_purchases')) {
            return redirect('/purchases');
        }
        if ($user->hasPermissionTo('view_products')) {
            return redirect('/products');
        }
        return redirect('/user/profile');
    })->name('init');
    Route::middleware(['role_or_permission:Super Admin|view_dashboard'])->group(function () {
        Route::get('dashboard', function (\Illuminate\Http\Request $request) {
    $company_id = auth()->user()->company_id;
    $now = now();
    $startOfMonth = $now->copy()->startOfMonth();
    $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
    $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

    // KPI Stats
    $stats = [
        'revenue_this_month' => \App\Models\Sale::where('company_id', $company_id)->where('status', 'CONFIRMED')->where('created_at', '>=', $startOfMonth)->sum('total_amount'),
        'revenue_last_month' => \App\Models\Sale::where('company_id', $company_id)->where('status', 'CONFIRMED')->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->sum('total_amount'),
        'expenses_this_month' => \App\Models\Purchase::where('company_id', $company_id)->where('status', 'CONFIRMED')->where('created_at', '>=', $startOfMonth)->sum('total_amount'),
        'expenses_last_month' => \App\Models\Purchase::where('company_id', $company_id)->where('status', 'CONFIRMED')->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->sum('total_amount'),
        'sales_count_this_month' => \App\Models\Sale::where('company_id', $company_id)->where('created_at', '>=', $startOfMonth)->count(),
        'sales_count_last_month' => \App\Models\Sale::where('company_id', $company_id)->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->count(),
        'products_count' => \App\Models\Product::where('company_id', $company_id)->count(),
        'recent_sales' => \App\Models\Sale::where('company_id', $company_id)->with(['customer', 'lines', 'creator'])->orderBy('created_at', 'desc')->take(5)->get(),
    ];

    // Sales by User Logic with Filters
    $branchId = $request->query('branch_id', 'all');
    $month = $request->query('month');
    $date = $request->query('date');

    $query = \App\Models\User::where('users.company_id', $company_id);

    if ($branchId && $branchId !== 'all') {
        $query->whereExists(function ($q) use ($branchId) {
            $q->select(\Illuminate\Support\Facades\DB::raw(1))
              ->from('user_branches')
              ->whereColumn('user_branches.user_id', 'users.id')
              ->where('user_branches.branch_id', $branchId);
        });
    }

    $salesByUser = $query->leftJoin('sales', function($join) use ($branchId, $date, $month) {
            $join->on('users.id', '=', 'sales.created_by')
                 ->where('sales.status', 'CONFIRMED');
            
            if ($branchId && $branchId !== 'all') {
                $join->where('sales.branch_id', $branchId);
            }

            if ($date) {
                $join->whereDate('sales.created_at', $date);
            } elseif ($month) {
                $year = substr($month, 0, 4);
                $m = substr($month, 5, 2);
                $join->whereYear('sales.created_at', $year)->whereMonth('sales.created_at', $m);
            }
        })
        ->select('users.name', 
            \Illuminate\Support\Facades\DB::raw('COALESCE(SUM(sales.total_amount), 0) as total_amount'), 
            \Illuminate\Support\Facades\DB::raw('COUNT(sales.id) as total_sales')
        )
        ->groupBy('users.id', 'users.name')
        ->orderByDesc('total_amount')
        ->get();

    $branches = \App\Models\Branch::where('company_id', $company_id)->select('id', 'name')->get();

    return Inertia::render('dashboard', [
        'stats' => $stats,
        'salesByUser' => $salesByUser,
        'branches' => $branches,
        'filters' => [
            'branch_id' => $branchId,
            'month' => $month,
            'date' => $date
        ]
    ]);
    })->name('dashboard');
    });

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
        Route::middleware(['role_or_permission:Super Admin|view_products'])->group(function () {
        Route::resource('brands', BrandController::class)->except(['create', 'show', 'edit']);
        Route::resource('categories', CategoryController::class)->except(['create', 'show', 'edit']);
        Route::resource('units', UnitController::class)->except(['create', 'show', 'edit']);
    });

        Route::middleware(['role_or_permission:Super Admin|view_customers'])->group(function () {
        Route::resource('customers', \App\Http\Controllers\CustomerController::class)->except(['create', 'show', 'edit']);
    });
        Route::middleware(['role_or_permission:Super Admin|view_suppliers'])->group(function () {
        Route::resource('suppliers', \App\Http\Controllers\SupplierController::class)->except(['create', 'show', 'edit']);
    });

        Route::middleware(['role_or_permission:Super Admin|view_purchases'])->group(function () {
        Route::post('purchases/{purchase}/confirm', [\App\Http\Controllers\PurchaseController::class, 'confirm'])->name('purchases.confirm');
        Route::resource('purchases', \App\Http\Controllers\PurchaseController::class);
    });

        Route::middleware(['role_or_permission:Super Admin|view_sales'])->group(function () {
        Route::post('sales/{sale}/confirm', [\App\Http\Controllers\SaleController::class, 'confirm'])->name('sales.confirm');
        Route::resource('sales', \App\Http\Controllers\SaleController::class);
    });

        // Products Catalog
        Route::middleware(['role_or_permission:Super Admin|view_products'])->group(function () {
        Route::get('products/search', [ProductController::class, 'search'])->name('products.search');
        Route::post('products/check-similarity', [ProductController::class, 'checkSimilarity'])->name('products.check-similarity');
        Route::resource('products', ProductController::class);
    });

        Route::middleware(['role_or_permission:Super Admin|view_import'])->group(function () {
        Route::get('catalog/import', [ProductImportController::class, 'index'])->name('catalog.import');
        Route::get('catalog/import/template', [ProductImportController::class, 'downloadTemplate'])->name('catalog.import.template');
        Route::post('catalog/import', [ProductImportController::class, 'store'])->name('catalog.import.store');
    });

        Route::middleware(['role_or_permission:Super Admin|view_inventory|view_inventory_general'])->group(function () {
        Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
    });
        Route::middleware(['role_or_permission:Super Admin|view_kardex'])->group(function () {
        Route::get('kardex', [\App\Http\Controllers\KardexController::class, 'index'])->name('kardex.index');
    });

        Route::middleware(['role_or_permission:Super Admin|view_inventory|view_inventory_general'])->group(function () {
        Route::post('inventory/adjustments/{adjustment}/confirm', [\App\Http\Controllers\InventoryAdjustmentController::class, 'confirm'])->name('inventory.adjustments.confirm');
        Route::resource('inventory/adjustments', \App\Http\Controllers\InventoryAdjustmentController::class)->names('inventory.adjustments');
    });

        Route::middleware(['role_or_permission:Super Admin|view_products'])->group(function () {
        // Product Settings
        Route::post('products/{product}/prices', [ProductSettingsController::class, 'storePrice'])->name('products.prices.store');
        Route::delete('products/{product}/prices/{price}', [ProductSettingsController::class, 'destroyPrice'])->name('products.prices.destroy');

        Route::post('products/{product}/min-prices', [ProductSettingsController::class, 'storeMinPrice'])->name('products.min-prices.store');
        Route::delete('products/{product}/min-prices/{price}', [ProductSettingsController::class, 'destroyMinPrice'])->name('products.min-prices.destroy');

        Route::post('products/{product}/min-stocks', [ProductSettingsController::class, 'storeMinStock'])->name('products.min-stocks.store');
        Route::delete('products/{product}/min-stocks/{stock}', [ProductSettingsController::class, 'destroyMinStock'])->name('products.min-stocks.destroy');

        Route::post('products/{product}/kit-components', [ProductSettingsController::class, 'syncKitComponents'])->name('products.kit-components.sync');
    });
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
