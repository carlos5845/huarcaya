<?php

use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Auth\CheckUserController;
use App\Http\Controllers\Auth\OtpPasswordResetController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerReturnController;
use App\Http\Controllers\InventoryAdjustmentController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\KardexController;
use App\Http\Controllers\KardexReportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductImportController;
use App\Http\Controllers\ProductSettingsController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ReceivableController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\TransferPrintController;
use App\Http\Controllers\TransferReceiptController;
use App\Http\Controllers\TransferShipmentController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserSessionController;
use App\Http\Controllers\UserSetupController;
use App\Models\Branch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('/init', function (Request $request) {
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
        if ($user->hasPermissionTo('view_transfers')) {
            return redirect('/transfers');
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
        Route::get('dashboard', function (Request $request) {
            $company_id = auth()->user()->company_id;
            $now = now();
            $startOfMonth = $now->copy()->startOfMonth();
            $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
            $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

            // KPI Stats
            $stats = [
                'revenue_this_month' => Sale::where('company_id', $company_id)->where('status', 'CONFIRMED')->where('created_at', '>=', $startOfMonth)->sum('total_amount'),
                'revenue_last_month' => Sale::where('company_id', $company_id)->where('status', 'CONFIRMED')->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->sum('total_amount'),
                'expenses_this_month' => Purchase::where('company_id', $company_id)->where('status', 'CONFIRMED')->where('created_at', '>=', $startOfMonth)->sum('total_amount'),
                'expenses_last_month' => Purchase::where('company_id', $company_id)->where('status', 'CONFIRMED')->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->sum('total_amount'),
                'sales_count_this_month' => Sale::where('company_id', $company_id)->where('created_at', '>=', $startOfMonth)->count(),
                'sales_count_last_month' => Sale::where('company_id', $company_id)->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->count(),
                'products_count' => Product::where('company_id', $company_id)->count(),
                'recent_sales' => Sale::where('company_id', $company_id)->with(['customer', 'lines', 'creator'])->orderBy('created_at', 'desc')->take(5)->get(),
            ];

            // Sales by User Logic with Filters
            $branchId = $request->query('branch_id', 'all');
            $month = $request->query('month');
            $date = $request->query('date');

            $query = User::where('users.company_id', $company_id);

            if ($branchId && $branchId !== 'all') {
                $query->whereExists(function ($q) use ($branchId) {
                    $q->select(DB::raw(1))
                        ->from('user_branches')
                        ->whereColumn('user_branches.user_id', 'users.id')
                        ->where('user_branches.branch_id', $branchId);

                });
            }

            $salesByUser = $query->leftJoin('sales', function ($join) use ($branchId, $date, $month) {
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
                    DB::raw('COALESCE(SUM(sales.total_amount), 0) as total_amount'),
                    DB::raw('COUNT(sales.id) as total_sales')
                )
                ->groupBy('users.id', 'users.name')
                ->orderByDesc('total_amount')
                ->get();

            $branches = Branch::where('company_id', $company_id)->select('id', 'name')->get();

            return Inertia::render('dashboard', [
                'stats' => $stats,
                'salesByUser' => $salesByUser,
                'branches' => $branches,
                'filters' => [
                    'branch_id' => $branchId,
                    'month' => $month,
                    'date' => $date,
                ],
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
        Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);

    });
    Route::middleware(['role_or_permission:Super Admin|view_suppliers'])->group(function () {
        Route::resource('suppliers', SupplierController::class)->except(['create', 'show', 'edit']);

    });

    Route::middleware(['role_or_permission:Super Admin|view_purchases'])->group(function () {
        Route::post('purchases/{purchase}/confirm', [PurchaseController::class, 'confirm'])->name('purchases.confirm');
        Route::resource('purchases', PurchaseController::class);

    });

    Route::middleware(['role_or_permission:Super Admin|view_sales'])->group(function () {
        Route::post('sales/{sale}/confirm', [SaleController::class, 'confirm'])->name('sales.confirm');
        Route::resource('sales', SaleController::class);

        Route::post('customer-returns/{customer_return}/confirm', [CustomerReturnController::class, 'confirm'])->name('customer-returns.confirm');
        Route::resource('customer-returns', CustomerReturnController::class);

        Route::get('receivables', [ReceivableController::class, 'index'])->name('receivables.index');
        Route::get('receivables/{receivable}', [ReceivableController::class, 'show'])->name('receivables.show');
        Route::post('receivables/{receivable}/payments', [ReceivableController::class, 'storePayment'])->name('receivables.payments.store');
        Route::post('receivables/{receivable}/payments/{payment}/cancel', [ReceivableController::class, 'cancelPayment'])->name('receivables.payments.cancel');

    });

    Route::middleware(['role_or_permission:Super Admin|view_transfers'])->group(function () {
        Route::get('transfers/{transfer}/print/internal', [TransferPrintController::class, 'internal'])->name('transfers.print.internal');
        Route::get('transfers/{transfer}/print/picking', [TransferPrintController::class, 'picking'])->name('transfers.print.picking');
        Route::get('transfers/{transfer}/print/guide', [TransferPrintController::class, 'guide'])->name('transfers.print.guide');
        Route::post('transfers/{transfer}/shipments', [TransferShipmentController::class, 'store'])->name('transfers.shipments.store');
        Route::post('transfers/{transfer}/receipts', [TransferReceiptController::class, 'store'])->name('transfers.receipts.store');
        Route::post('transfers/{transfer}/cancel', [TransferController::class, 'cancel'])->name('transfers.cancel');
        Route::resource('transfers', TransferController::class)->except(['edit', 'update', 'destroy']);

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
        Route::get('kardex', [KardexController::class, 'index'])->name('kardex.index');
        Route::get('kardex/export/excel', [KardexReportController::class, 'exportExcel'])->name('kardex.export.excel');
        Route::get('kardex/export/ple', [KardexReportController::class, 'exportPle'])->name('kardex.export.ple');
    });

    Route::middleware(['role_or_permission:Super Admin|view_inventory|view_inventory_general'])->group(function () {
        Route::post('inventory/adjustments/{adjustment}/confirm', [InventoryAdjustmentController::class, 'confirm'])->name('inventory.adjustments.confirm');
        Route::resource('inventory/adjustments', InventoryAdjustmentController::class)->names('inventory.adjustments');

    });

    Route::middleware(['role_or_permission:Super Admin|view_products'])->group(function () {
        // Product Settings
        Route::post('products/{product}/prices', [ProductSettingsController::class, 'storePrice'])->name('products.prices.store');
        Route::delete('products/{product}/prices/{price}', [ProductSettingsController::class, 'destroyPrice'])->name('products.prices.destroy');

        Route::post('products/{product}/min-prices', [ProductSettingsController::class, 'storeMinPrice'])->name('products.min-prices.store');
        Route::delete('products/{product}/min-prices/{price}', [ProductSettingsController::class, 'destroyMinPrice'])->name('products.min-prices.destroy');

        Route::post('products/{product}/min-stocks', [ProductSettingsController::class, 'storeMinStock'])->name('products.min-stocks.store');
        Route::delete('products/{product}/min-stocks/{stock}', [ProductSettingsController::class, 'destroyMinStock'])->name('products.min-stocks.destroy');
        Route::post('products/{product}/quick-adjust-stock', [ProductSettingsController::class, 'quickAdjustStock'])->name('products.quick-adjust-stock');

        Route::post('products/{product}/kit-components', [ProductSettingsController::class, 'syncKitComponents'])->name('products.kit-components.sync');

    });

    Route::get('/api/notifications/unread', [NotificationController::class, 'unread'])->name('notifications.unread');
    Route::post('/api/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/api/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.readAll');

    // Offline Sync Endpoints
    Route::get('/api/v1/sync/catalog', [SyncController::class, 'getCatalog'])->name('sync.catalog');
    Route::post('/api/v1/sync/batch', [SyncController::class, 'syncBatch'])->name('sync.batch');

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
