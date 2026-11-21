<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $companyId = $user->company_id;

        // Identificar si el usuario tiene rol administrativo
        $isAdmin = $user->hasRole('Super Admin') || $user->hasRole('Gerente') || $user->hasRole('Administrador de Tienda');
        $isSuperAdmin = $user->hasRole('Super Admin') || $user->hasRole('Gerente');

        // Manejo de sucursales permitidas
        if ($isSuperAdmin) {
            $branches = Branch::where('company_id', $companyId)->orderBy('name')->get(['id', 'name']);
            $branchId = $request->query('branch_id', 'all');
        } else {
            $userBranches = $user->branches()->orderBy('name')->get(['branches.id', 'branches.name']);
            if ($userBranches->isEmpty() && $user->default_branch_id) {
                $userBranches = Branch::where('id', $user->default_branch_id)->get(['id', 'name']);
            }
            $branches = $userBranches;
            $allowedBranchIds = $branches->pluck('id')->toArray();

            $branchId = $request->query('branch_id');
            if (! $branchId || $branchId === 'all' || ! in_array((int) $branchId, $allowedBranchIds)) {
                $branchId = $allowedBranchIds[0] ?? $user->default_branch_id;
            }
        }

        $month = $request->query('month');
        $date = $request->query('date');

        // Si no se especifica mes ni fecha, detectar el mes activo más relevante
        if (! $date && ! $month) {
            $currentMonth = now()->format('Y-m');
            $hasCurrentMonthSales = Sale::where('company_id', $companyId)
                ->where('status', 'CONFIRMED')
                ->where(function ($q) {
                    $q->where('operation_date', '>=', now()->startOfMonth())
                        ->orWhere(function ($q2) {
                            $q2->whereNull('operation_date')
                                ->where('created_at', '>=', now()->startOfMonth());
                        });
                })
                ->exists();

            if (! $hasCurrentMonthSales) {
                $latestSale = Sale::where('company_id', $companyId)
                    ->where('status', 'CONFIRMED')
                    ->orderByRaw('COALESCE(operation_date, created_at) DESC')
                    ->first();

                if ($latestSale) {
                    $refDate = $latestSale->operation_date ?? $latestSale->created_at;
                    $month = Carbon::parse($refDate)->format('Y-m');
                } else {
                    $month = $currentMonth;
                }
            } else {
                $month = $currentMonth;
            }
        }

        // Definición de rangos de fechas y comparación
        if ($date) {
            $startDate = Carbon::parse($date)->startOfDay();
            $endDate = Carbon::parse($date)->endOfDay();
            $startDatePrev = $startDate->copy()->subDay()->startOfDay();
            $endDatePrev = $startDate->copy()->subDay()->endOfDay();
            $periodLabel = Carbon::parse($date)->format('d/m/Y');
            $comparisonLabel = 'vs día anterior';
            $activeMonth = Carbon::parse($date)->format('Y-m');
            $activeDate = $date;
        } else {
            $startDate = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
            $endDate = Carbon::createFromFormat('Y-m', $month)->endOfMonth();
            $startDatePrev = $startDate->copy()->subMonth()->startOfMonth();
            $endDatePrev = $startDate->copy()->subMonth()->endOfMonth();

            $monthNames = [
                '01' => 'Enero', '02' => 'Febrero', '03' => 'Marzo', '04' => 'Abril',
                '05' => 'Mayo', '06' => 'Junio', '07' => 'Julio', '08' => 'Agosto',
                '09' => 'Septiembre', '10' => 'Octubre', '11' => 'Noviembre', '12' => 'Diciembre',
            ];
            $mNum = substr($month, 5, 2);
            $yNum = substr($month, 0, 4);
            $periodLabel = ($monthNames[$mNum] ?? 'Mes').' '.$yNum;
            $comparisonLabel = 'vs mes anterior';
            $activeMonth = $month;
            $activeDate = null;
        }

        if ($isAdmin) {
            // === VISTA ADMINISTRADOR ===
            $salesBase = Sale::where('company_id', $companyId)->where('status', 'CONFIRMED');
            $purchasesBase = Purchase::where('company_id', $companyId)->where('status', 'CONFIRMED');

            if ($branchId && $branchId !== 'all') {
                $salesBase->where('branch_id', $branchId);
                $purchasesBase->where('branch_id', $branchId);
            }

            // Ventas período actual
            $salesCurrentQuery = (clone $salesBase)->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('operation_date', [$startDate, $endDate])
                    ->orWhere(function ($q2) use ($startDate, $endDate) {
                        $q2->whereNull('operation_date')
                            ->whereBetween('created_at', [$startDate, $endDate]);
                    });
            });
            $revenueCurrent = (float) $salesCurrentQuery->sum('total_amount');
            $salesCountCurrent = (int) $salesCurrentQuery->count();
            $avgTicket = $salesCountCurrent > 0 ? round($revenueCurrent / $salesCountCurrent, 2) : 0.0;

            // Ventas período anterior (comparativa)
            $salesPrevQuery = (clone $salesBase)->where(function ($q) use ($startDatePrev, $endDatePrev) {
                $q->whereBetween('operation_date', [$startDatePrev, $endDatePrev])
                    ->orWhere(function ($q2) use ($startDatePrev, $endDatePrev) {
                        $q2->whereNull('operation_date')
                            ->whereBetween('created_at', [$startDatePrev, $endDatePrev]);
                    });
            });
            $revenuePrev = (float) $salesPrevQuery->sum('total_amount');
            $salesCountPrev = (int) $salesPrevQuery->count();

            // Compras período actual
            $purchasesCurrentQuery = (clone $purchasesBase)->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('document_date', [$startDate->toDateString(), $endDate->toDateString()])
                    ->orWhere(function ($q2) use ($startDate, $endDate) {
                        $q2->whereNull('document_date')
                            ->whereBetween('created_at', [$startDate, $endDate]);
                    });
            });
            $expensesCurrent = (float) $purchasesCurrentQuery->sum('total_amount');
            $purchasesCountCurrent = (int) $purchasesCurrentQuery->count();

            // Compras período anterior
            $purchasesPrevQuery = (clone $purchasesBase)->where(function ($q) use ($startDatePrev, $endDatePrev) {
                $q->whereBetween('document_date', [$startDatePrev->toDateString(), $endDatePrev->toDateString()])
                    ->orWhere(function ($q2) use ($startDatePrev, $endDatePrev) {
                        $q2->whereNull('document_date')
                            ->whereBetween('created_at', [$startDatePrev, $endDatePrev]);
                    });
            });
            $expensesPrev = (float) $purchasesPrevQuery->sum('total_amount');

            // Inventario y Catálogo
            $inventoryBase = Inventory::query();
            if ($branchId && $branchId !== 'all') {
                $inventoryBase->where('branch_id', $branchId);
            } else {
                $branchIdsList = $branches->pluck('id')->filter()->toArray();
                if (! empty($branchIdsList)) {
                    $inventoryBase->whereIn('branch_id', $branchIdsList);
                }
            }
            $inventoryValuation = (float) (clone $inventoryBase)->where('physical_quantity', '>', 0)->sum(DB::raw('physical_quantity * average_cost'));
            $totalUnitsStock = (int) (clone $inventoryBase)->where('physical_quantity', '>', 0)->sum('physical_quantity');
            $productsWithStock = (int) (clone $inventoryBase)->where('physical_quantity', '>', 0)->distinct('product_id')->count('product_id');
            $productsCount = Product::where('company_id', $companyId)->count();

            // Cuentas por Cobrar (Receivables)
            $receivablesBase = DB::table('receivables')
                ->where('company_id', $companyId)
                ->where('status', 'ACTIVE');
            if ($branchId && $branchId !== 'all') {
                $receivablesBase->where('branch_id', $branchId);
            }
            $pendingReceivablesTotal = (float) (clone $receivablesBase)->sum('balance_amount');
            $pendingReceivablesCount = (int) (clone $receivablesBase)->count();

            $stats = [
                'revenue_this_month' => $revenueCurrent,
                'revenue_last_month' => $revenuePrev,
                'expenses_this_month' => $expensesCurrent,
                'expenses_last_month' => $expensesPrev,
                'sales_count_this_month' => $salesCountCurrent,
                'sales_count_last_month' => $salesCountPrev,
                'purchases_count' => $purchasesCountCurrent,
                'average_ticket' => $avgTicket,
                'products_count' => $productsCount,
                'inventory_valuation' => $inventoryValuation,
                'total_units_stock' => $totalUnitsStock,
                'products_with_stock' => $productsWithStock,
                'pending_receivables_total' => $pendingReceivablesTotal,
                'pending_receivables_count' => $pendingReceivablesCount,
                'period_label' => $periodLabel,
                'comparison_label' => $comparisonLabel,
            ];

            // Ventas por Usuario (Comparativa de vendedores durante el período seleccionado)
            $userQuery = User::where('users.company_id', $companyId);
            if ($branchId && $branchId !== 'all') {
                $userQuery->whereExists(function ($q) use ($branchId) {
                    $q->select(DB::raw(1))
                        ->from('user_branches')
                        ->whereColumn('user_branches.user_id', 'users.id')
                        ->where('user_branches.branch_id', $branchId);
                });
            }

            $salesByUser = $userQuery->leftJoin('sales', function ($join) use ($branchId, $startDate, $endDate) {
                $join->on('users.id', '=', 'sales.created_by')
                    ->where('sales.status', 'CONFIRMED');

                if ($branchId && $branchId !== 'all') {
                    $join->where('sales.branch_id', $branchId);
                }

                $join->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('sales.operation_date', [$startDate, $endDate])
                        ->orWhere(function ($q2) use ($startDate, $endDate) {
                            $q2->whereNull('sales.operation_date')
                                ->whereBetween('sales.created_at', [$startDate, $endDate]);
                        });
                });
            })
                ->select(
                    'users.id',
                    'users.name',
                    DB::raw('COALESCE(SUM(sales.total_amount), 0) as total_amount'),
                    DB::raw('COUNT(sales.id) as total_sales')
                )
                ->groupBy('users.id', 'users.name')
                ->orderByDesc('total_amount')
                ->get();

            // Ventas recientes
            $recentSalesQuery = Sale::where('company_id', $companyId)
                ->with(['customer:id,name,document_number', 'creator:id,name']);

            if ($branchId && $branchId !== 'all') {
                $recentSalesQuery->where('branch_id', $branchId);
            }

            $recentSales = $recentSalesQuery->orderByRaw('COALESCE(operation_date, created_at) DESC')->take(6)->get();
            $chartData = $salesByUser;

        } else {
            // === VISTA USUARIO OPERATIVO / NORMAL ===
            $mySalesQuery = Sale::where('company_id', $companyId)
                ->where('created_by', $user->id)
                ->where('status', 'CONFIRMED');

            $activeBranchId = $branchId ?: $user->default_branch_id;
            $branchStockCount = Inventory::where('branch_id', $activeBranchId)
                ->where('physical_quantity', '>', 0)
                ->count();
            $branchUnitsStock = (int) Inventory::where('branch_id', $activeBranchId)
                ->where('physical_quantity', '>', 0)
                ->sum('physical_quantity');

            // Ventas período actual
            $mySalesCurrent = (clone $mySalesQuery)->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('operation_date', [$startDate, $endDate])
                    ->orWhere(function ($q2) use ($startDate, $endDate) {
                        $q2->whereNull('operation_date')
                            ->whereBetween('created_at', [$startDate, $endDate]);
                    });
            });
            $myRevenueCurrent = (float) $mySalesCurrent->sum('total_amount');
            $mySalesCountCurrent = (int) $mySalesCurrent->count();

            // Ventas período anterior
            $mySalesPrev = (clone $mySalesQuery)->where(function ($q) use ($startDatePrev, $endDatePrev) {
                $q->whereBetween('operation_date', [$startDatePrev, $endDatePrev])
                    ->orWhere(function ($q2) use ($startDatePrev, $endDatePrev) {
                        $q2->whereNull('operation_date')
                            ->whereBetween('created_at', [$startDatePrev, $endDatePrev]);
                    });
            });
            $myRevenuePrev = (float) $mySalesPrev->sum('total_amount');
            $mySalesCountPrev = (int) $mySalesPrev->count();

            // Ventas hoy
            $startOfToday = now()->startOfDay();
            $endOfToday = now()->endOfDay();
            $mySalesTodayQuery = (clone $mySalesQuery)->where(function ($q) use ($startOfToday, $endOfToday) {
                $q->whereBetween('operation_date', [$startOfToday, $endOfToday])
                    ->orWhere(function ($q2) use ($startOfToday, $endOfToday) {
                        $q2->whereNull('operation_date')
                            ->whereBetween('created_at', [$startOfToday, $endOfToday]);
                    });
            });
            $myRevenueToday = (float) $mySalesTodayQuery->sum('total_amount');
            $mySalesCountToday = (int) $mySalesTodayQuery->count();

            $stats = [
                'my_revenue_this_month' => $myRevenueCurrent,
                'my_revenue_last_month' => $myRevenuePrev,
                'my_revenue_today' => $myRevenueToday,
                'my_sales_count_today' => $mySalesCountToday,
                'my_sales_count_this_month' => $mySalesCountCurrent,
                'my_sales_count_last_month' => $mySalesCountPrev,
                'branch_stock_count' => $branchStockCount,
                'branch_units_stock' => $branchUnitsStock,
                'period_label' => $periodLabel,
                'comparison_label' => $comparisonLabel,
            ];

            // Evolución de ventas diarias del usuario durante el período
            $dailySalesQuery = Sale::where('company_id', $companyId)
                ->where('created_by', $user->id)
                ->where('status', 'CONFIRMED')
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('operation_date', [$startDate, $endDate])
                        ->orWhere(function ($q2) use ($startDate, $endDate) {
                            $q2->whereNull('operation_date')
                                ->whereBetween('created_at', [$startDate, $endDate]);
                        });
                });

            $dailySales = $dailySalesQuery
                ->select(
                    DB::raw('DATE(COALESCE(operation_date, created_at)) as sale_date'),
                    DB::raw('SUM(total_amount) as total_amount'),
                    DB::raw('COUNT(id) as total_sales')
                )
                ->groupBy(DB::raw('DATE(COALESCE(operation_date, created_at))'))
                ->orderBy('sale_date', 'asc')
                ->get()
                ->map(function ($row) {
                    return [
                        'name' => Carbon::parse($row->sale_date)->format('d/m'),
                        'full_date' => $row->sale_date,
                        'total_amount' => (float) $row->total_amount,
                        'total_sales' => (int) $row->total_sales,
                    ];
                });

            $chartData = $dailySales;

            // Últimas ventas del usuario actual
            $recentSales = Sale::where('company_id', $companyId)
                ->where('created_by', $user->id)
                ->with(['customer:id,name,document_number', 'creator:id,name'])
                ->orderByRaw('COALESCE(operation_date, created_at) DESC')
                ->take(6)
                ->get();
        }

        $userRole = $user->getRoleNames()->first() ?? ($isAdmin ? 'Administrador' : 'Usuario');
        $userBranchName = $user->defaultBranch?->name
            ?? ($user->branches()->first()?->name
                ?? ($isSuperAdmin ? 'Acceso Global' : ($branches->first()?->name ?? 'Sucursal')));

        $userInfo = [
            'name' => $user->name,
            'role_name' => $userRole,
            'branch_name' => $userBranchName,
        ];

        return Inertia::render('dashboard', [
            'is_admin' => $isAdmin,
            'user_info' => $userInfo,
            'stats' => $stats,
            'chartData' => $chartData,
            'recentSales' => $recentSales,
            'branches' => $branches,
            'filters' => [
                'branch_id' => (string) $branchId,
                'month' => $activeMonth,
                'date' => $activeDate,
            ],
        ]);
    }
}
