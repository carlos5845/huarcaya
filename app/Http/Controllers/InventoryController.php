<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $canSeeAllBranches = $isSuperAdmin || $user->hasPermissionTo('view_inventory_general');

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

        // Si no es Super Admin y pide 'ALL' o pide una sucursal no permitida, forzamos a la primera permitida
        if (! $canSeeAllBranches) {
            if (empty($branchId) || $branchId === 'ALL' || ! in_array((int) $branchId, $allowedBranchIds)) {
                $branchId = $allowedBranchIds[0] ?? null;
            }
        }

        $query = Product::with(['brand', 'category', 'prices', 'inventories']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereLikeAccentInsensitive('name', "%{$search}%")
                    ->orWhereLikeAccentInsensitive('primary_reference', "%{$search}%")
                    ->orWhereLikeAccentInsensitive('internal_code', "%{$search}%")
                    ->orWhereHas('brand', function ($bq) use ($search) {
                        $bq->whereLikeAccentInsensitive('name', "%{$search}%");
                    });
            });
        } else {
            // Si no hay búsqueda, por defecto solo mostrar productos que tengan stock físico > 0 en las sucursales seleccionadas
            $query->whereHas('inventories', function ($q) use ($branchId, $allowedBranchIds) {
                if ($branchId && $branchId !== 'ALL') {
                    $q->where('branch_id', $branchId)->where('physical_quantity', '>', 0);
                } else {
                    $q->whereIn('branch_id', $allowedBranchIds)->where('physical_quantity', '>', 0);
                }
            });
        }

        if ($branchId && $branchId !== 'ALL') {
            $query->withSum(['inventories as physical_quantity' => fn ($q) => $q->where('branch_id', $branchId)], 'physical_quantity')
                ->withSum(['inventories as available_quantity' => fn ($q) => $q->where('branch_id', $branchId)], 'available_quantity');
        } else {
            // Esto solo se ejecuta si es Super Admin y selecciona 'ALL'
            $query->withSum('inventories as physical_quantity', 'physical_quantity')
                ->withSum('inventories as available_quantity', 'available_quantity');
        }

        $products = $query->orderBy('id', 'desc')->paginate(20);

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

            $product->purchase_price = $inventory ? (float) $inventory->average_cost : 0;
            $product->sale_price = $price ? (float) $price->amount : 0;

            return $product;
        });

        return Inertia::render('catalog/inventory/index', [
            'products' => $products,
            'branches' => $branches,
            'isSuperAdmin' => $isSuperAdmin,
            'filters' => [
                'branch_id' => $branchId,
                'search' => $search,
            ],
        ]);
    }
}
