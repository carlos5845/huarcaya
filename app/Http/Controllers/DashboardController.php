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

        $now = now();
        $startOfMonth = $now->copy()->startOfMonth();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();
        $startOfToday = $now->copy()->startOfDay();
        $endOfToday = $now->copy()->endOfDay();

        $month = $request->query('month');
        $date = $request->query('date');

        if ($isAdmin) {
            // === VISTA ADMINISTRADOR ===
            $salesQuery = Sale::where('company_id', $companyId)->where('status', 'CONFIRMED');
            $purchasesQuery = Purchase::where('company_id', $companyId)->where('status', 'CONFIRMED');

            if ($branchId && $branchId !== 'all') {
                $salesQuery->where('branch_id', $branchId);
                $purchasesQuery->where('branch_id', $branchId);
            }

            $stats = [
                'revenue_this_month' => (float) (clone $salesQuery)->where('created_at', '>=', $startOfMonth)->sum('total_amount'),
                'revenue_last_month' => (float) (clone $salesQuery)->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->sum('total_amount'),
                'expenses_this_month' => (float) (clone $purchasesQuery)->where('created_at', '>=', $startOfMonth)->sum('total_amount'),
                'expenses_last_month' => (float) (clone $purchasesQuery)->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->sum('total_amount'),
                'sales_count_this_month' => (clone $salesQuery)->where('created_at', '>=', $startOfMonth)->count(),
                'sales_count_last_month' => (clone $salesQuery)->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->count(),
                'products_count' => Product::where('company_id', $companyId)->count(),
            ];

            // Ventas por Usuario (Comparativa de vendedores)
            $userQuery = User::where('users.company_id', $companyId);
            if ($branchId && $branchId !== 'all') {
                $userQuery->whereExists(function ($q) use ($branchId) {
                    $q->select(DB::raw(1))
                        ->from('user_branches')
                        ->whereColumn('user_branches.user_id', 'users.id')
                        ->where('user_branches.branch_id', $branchId);
                });
            }

            $salesByUser = $userQuery->leftJoin('sales', function ($join) use ($branchId, $date, $month) {
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

            $recentSales = $recentSalesQuery->orderBy('created_at', 'desc')->take(6)->get();
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

            $stats = [
                'my_revenue_this_month' => (float) (clone $mySalesQuery)->where('created_at', '>=', $startOfMonth)->sum('total_amount'),
                'my_revenue_last_month' => (float) (clone $mySalesQuery)->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->sum('total_amount'),
                'my_revenue_today' => (float) (clone $mySalesQuery)->whereBetween('created_at', [$startOfToday, $endOfToday])->sum('total_amount'),
                'my_sales_count_today' => (clone $mySalesQuery)->whereBetween('created_at', [$startOfToday, $endOfToday])->count(),
                'my_sales_count_this_month' => (clone $mySalesQuery)->where('created_at', '>=', $startOfMonth)->count(),
                'my_sales_count_last_month' => (clone $mySalesQuery)->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->count(),
                'branch_stock_count' => $branchStockCount,
            ];

            // Evolución de ventas diarias del usuario durante el mes seleccionado o actual
            $dailySalesQuery = Sale::where('company_id', $companyId)
                ->where('created_by', $user->id)
                ->where('status', 'CONFIRMED');

            if ($date) {
                $dailySalesQuery->whereDate('created_at', $date);
            } elseif ($month) {
                $year = substr($month, 0, 4);
                $m = substr($month, 5, 2);
                $dailySalesQuery->whereYear('created_at', $year)->whereMonth('created_at', $m);
            } else {
                $dailySalesQuery->where('created_at', '>=', $startOfMonth);
            }

            $dailySales = $dailySalesQuery
                ->select(
                    DB::raw('DATE(created_at) as sale_date'),
                    DB::raw('SUM(total_amount) as total_amount'),
                    DB::raw('COUNT(id) as total_sales')
                )
                ->groupBy(DB::raw('DATE(created_at)'))
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
                ->orderBy('created_at', 'desc')
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
                'month' => $month,
                'date' => $date,
            ],
        ]);
    }
}
