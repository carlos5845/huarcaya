<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $canSeeAllBranches = $isSuperAdmin || $user->can('view_inventory_general');

        // Determinar las sucursales permitidas para este usuario
        if ($canSeeAllBranches) {
            $branches = Branch::orderBy('name')->get(['id', 'name']);
            $allowedBranchIds = $branches->pluck('id')->toArray();
        } else {
            // Usuarios normales solo pueden ver sus sucursales asignadas (o su sucursal por defecto)
            $branches = $user->branches()->orderBy('name')->get(['branches.id', 'branches.name']);

            if ($branches->isEmpty() && $user->default_branch_id) {
                $branches = Branch::where('id', $user->default_branch_id)->get(['id', 'name']);
            }
            $allowedBranchIds = $branches->pluck('id')->toArray();
        }

        $branchId = $request->input('branch_id');
        $search = $request->input('search');
        $stockStatus = $request->input('stock_status', 'all');

        // Si no es Super Admin y pide 'ALL' o pide una sucursal no permitida, forzamos a la primera permitida
        if (! $canSeeAllBranches) {
            if (empty($branchId) || $branchId === 'ALL' || ! in_array((int) $branchId, $allowedBranchIds)) {
                $branchId = $allowedBranchIds[0] ?? null;
            }
        }

        // --- CÁLCULO DE KPIS EJECUTIVOS ---
        $prodKpiQuery = Product::query();
        if ($search) {
            $prodKpiQuery->where(function ($q) use ($search) {
                $q->whereLikeAccentInsensitive('name', "%{$search}%")
                    ->orWhereLikeAccentInsensitive('primary_reference', "%{$search}%")
                    ->orWhereLikeAccentInsensitive('internal_code', "%{$search}%")
                    ->orWhereHas('brand', function ($bq) use ($search) {
                        $bq->whereLikeAccentInsensitive('name', "%{$search}%");
                    });
            });
        }

        $invKpiQuery = Inventory::query();
        if ($branchId && $branchId !== 'ALL') {
            $invKpiQuery->where('inventories.branch_id', $branchId);
        } else {
            $invKpiQuery->whereIn('inventories.branch_id', $allowedBranchIds);
        }

        if ($search) {
            $invKpiQuery->whereHas('product', function ($q) use ($search) {
                $q->whereLikeAccentInsensitive('name', "%{$search}%")
                    ->orWhereLikeAccentInsensitive('primary_reference', "%{$search}%")
                    ->orWhereLikeAccentInsensitive('internal_code', "%{$search}%")
                    ->orWhereHas('brand', function ($bq) use ($search) {
                        $bq->whereLikeAccentInsensitive('name', "%{$search}%");
                    });
            });
        }

        $totalSkus = (clone $prodKpiQuery)->count();
        $totalPhysical = (float) ((clone $invKpiQuery)->sum('physical_quantity') ?? 0);
        $totalAvailable = (float) ((clone $invKpiQuery)->sum('available_quantity') ?? 0);
        $totalReserved = max(0, $totalPhysical - $totalAvailable);
        $totalValue = (float) ((clone $invKpiQuery)->selectRaw('SUM(physical_quantity * average_cost) as val')->value('val') ?? 0);

        // Agotados: Todos los productos que no tienen stock disponible > 0 en la(s) sede(s) seleccionada(s)
        $outOfStockCount = (clone $prodKpiQuery)->whereDoesntHave('inventories', function ($q) use ($branchId, $allowedBranchIds) {
            if ($branchId && $branchId !== 'ALL') {
                $q->where('branch_id', $branchId);
            } else {
                $q->whereIn('branch_id', $allowedBranchIds);
            }
            $q->where('available_quantity', '>', 0);
        })->count();

        // Stock bajo: Productos con stock disponible > 0 y <= mínimo establecido
        $lowStockQuery = (clone $invKpiQuery)->where('inventories.available_quantity', '>', 0);
        if ($branchId && $branchId !== 'ALL') {
            $lowStockQuery->join('product_min_stocks', function ($j) use ($branchId) {
                $j->on('inventories.product_id', '=', 'product_min_stocks.product_id')
                    ->where('product_min_stocks.branch_id', '=', $branchId);
            })->whereColumn('inventories.available_quantity', '<=', 'product_min_stocks.minimum_quantity');
        } else {
            $lowStockQuery->join('product_min_stocks', function ($j) {
                $j->on('inventories.product_id', '=', 'product_min_stocks.product_id')
                    ->on('inventories.branch_id', '=', 'product_min_stocks.branch_id');
            })->whereColumn('inventories.available_quantity', '<=', 'product_min_stocks.minimum_quantity');
        }
        $lowStockCount = $lowStockQuery->count('inventories.id');

        $kpis = [
            'total_skus' => $totalSkus,
            'total_physical' => $totalPhysical,
            'total_available' => $totalAvailable,
            'total_reserved' => $totalReserved,
            'total_inventory_value' => round($totalValue, 2),
            'critical_count' => $lowStockCount + $outOfStockCount,
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount,
        ];

        // --- CONSULTA PRINCIPAL DE PRODUCTOS ---
        $query = Product::with(['brand', 'category', 'unit', 'prices', 'inventories.branch']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereLikeAccentInsensitive('name', "%{$search}%")
                    ->orWhereLikeAccentInsensitive('primary_reference', "%{$search}%")
                    ->orWhereLikeAccentInsensitive('internal_code', "%{$search}%")
                    ->orWhereHas('brand', function ($bq) use ($search) {
                        $bq->whereLikeAccentInsensitive('name', "%{$search}%");
                    });
            });
        }

        // Filtro por estado de stock
        if ($stockStatus === 'low_stock') {
            $query->whereExists(function ($sub) use ($branchId, $allowedBranchIds) {
                $sub->selectRaw(1)
                    ->from('inventories')
                    ->join('product_min_stocks', function ($j) {
                        $j->on('inventories.product_id', '=', 'product_min_stocks.product_id')
                            ->on('inventories.branch_id', '=', 'product_min_stocks.branch_id');
                    })
                    ->whereColumn('inventories.product_id', 'products.id')
                    ->where('inventories.available_quantity', '>', 0)
                    ->whereColumn('inventories.available_quantity', '<=', 'product_min_stocks.minimum_quantity');

                if ($branchId && $branchId !== 'ALL') {
                    $sub->where('inventories.branch_id', $branchId);
                } else {
                    $sub->whereIn('inventories.branch_id', $allowedBranchIds);
                }
            });
        } elseif ($stockStatus === 'out_of_stock') {
            $query->whereDoesntHave('inventories', function ($q) use ($branchId, $allowedBranchIds) {
                if ($branchId && $branchId !== 'ALL') {
                    $q->where('branch_id', $branchId);
                } else {
                    $q->whereIn('branch_id', $allowedBranchIds);
                }
                $q->where('available_quantity', '>', 0);
            });
        } elseif ($stockStatus === 'in_stock') {
            $query->whereHas('inventories', function ($q) use ($branchId, $allowedBranchIds) {
                if ($branchId && $branchId !== 'ALL') {
                    $q->where('branch_id', $branchId);
                } else {
                    $q->whereIn('branch_id', $allowedBranchIds);
                }
                $q->where('physical_quantity', '>', 0);
            });
        }
        // En 'all', no aplicamos whereHas('inventories'): se listan TODOS los productos del catálogo

        if ($branchId && $branchId !== 'ALL') {
            $query->withSum(['inventories as physical_quantity' => fn ($q) => $q->where('branch_id', $branchId)], 'physical_quantity')
                ->withSum(['inventories as available_quantity' => fn ($q) => $q->where('branch_id', $branchId)], 'available_quantity')
                ->withMax(['minStocks as min_stock_quantity' => fn ($q) => $q->where('branch_id', $branchId)], 'minimum_quantity');
        } else {
            $query->withSum(['inventories as physical_quantity' => fn ($q) => $q->whereIn('branch_id', $allowedBranchIds)], 'physical_quantity')
                ->withSum(['inventories as available_quantity' => fn ($q) => $q->whereIn('branch_id', $allowedBranchIds)], 'available_quantity')
                ->withSum(['minStocks as min_stock_quantity' => fn ($q) => $q->whereIn('branch_id', $allowedBranchIds)], 'minimum_quantity');
        }

        // Ordenar primero los que tienen stock físico mayor a 0, luego los agotados/sin stock en las siguientes páginas
        $products = $query->orderByRaw('CASE WHEN COALESCE(physical_quantity, 0) > 0 THEN 1 ELSE 0 END DESC, COALESCE(physical_quantity, 0) DESC, products.id DESC')
            ->paginate(20)
            ->withQueryString();

        $products->getCollection()->transform(function ($product) use ($branchId) {
            $inventory = null;
            if ($branchId && $branchId !== 'ALL') {
                $inventory = collect($product->inventories)->firstWhere('branch_id', (int) $branchId);
            } else {
                $inventory = collect($product->inventories)->sortByDesc('updated_at')->first();
            }

            $price = null;
            if ($branchId && $branchId !== 'ALL') {
                $price = collect($product->prices)->where('branch_id', (int) $branchId)->first()
                      ?? collect($product->prices)->whereNull('branch_id')->first();
            } else {
                $price = collect($product->prices)->whereNull('branch_id')->first() ?? collect($product->prices)->first();
            }

            $physical = (float) ($product->physical_quantity ?? 0);
            $available = (float) ($product->available_quantity ?? 0);
            $reserved = max(0, $physical - $available);
            $minStock = $product->min_stock_quantity !== null ? (float) $product->min_stock_quantity : null;

            $purchasePrice = $inventory ? (float) $inventory->average_cost : 0.0;
            $salePrice = $price ? (float) $price->amount : 0.0;
            $totalCost = $physical * $purchasePrice;

            // Diagnóstico semántico de stock
            if ($available <= 0) {
                $stockStatus = 'OUT_OF_STOCK';
            } elseif ($minStock !== null && $minStock > 0 && $available <= $minStock) {
                $stockStatus = 'LOW_STOCK';
            } elseif ($minStock !== null && $available > $minStock) {
                $stockStatus = 'OPTIMAL';
            } else {
                $stockStatus = 'NO_THRESHOLD';
            }

            // Margen comercial estimado
            $margin = null;
            if ($salePrice > 0 && $purchasePrice > 0) {
                $margin = round((($salePrice - $purchasePrice) / $salePrice) * 100, 1);
            }

            $branchBreakdown = collect($product->inventories)
                ->where('physical_quantity', '>', 0)
                ->map(fn ($inv) => [
                    'branch_id' => $inv->branch_id,
                    'branch_name' => $inv->branch?->name ?? "Sede #{$inv->branch_id}",
                    'physical' => (float) $inv->physical_quantity,
                    'available' => (float) $inv->available_quantity,
                ])
                ->values()
                ->all();

            $product->physical_quantity = $physical;
            $product->available_quantity = $available;
            $product->reserved_quantity = $reserved;
            $product->min_stock_quantity = $minStock;
            $product->stock_status = $stockStatus;
            $product->purchase_price = $purchasePrice;
            $product->sale_price = $salePrice;
            $product->total_cost = round($totalCost, 2);
            $product->margin_percentage = $margin;
            $product->branch_breakdown = $branchBreakdown;

            return $product;
        });

        return Inertia::render('catalog/inventory/index', [
            'products' => $products,
            'branches' => $branches,
            'isSuperAdmin' => $isSuperAdmin,
            'kpis' => $kpis,
            'filters' => [
                'branch_id' => $branchId,
                'search' => $search,
                'stock_status' => $stockStatus,
            ],
        ]);
    }
}
