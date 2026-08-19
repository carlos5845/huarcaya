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

        // Determinar las sucursales permitidas para este usuario
        if ($isSuperAdmin) {
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
        if (! $isSuperAdmin) {
            if (empty($branchId) || $branchId === 'ALL' || ! in_array((int) $branchId, $allowedBranchIds)) {
                $branchId = $allowedBranchIds[0] ?? null;
            }
        }

        $query = Product::with(['brand', 'category']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('primary_reference', 'like', "%{$search}%");
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

        return Inertia::render('catalog/inventory/index', [
            'products' => $products,
            'branches' => $branches,
            'filters' => [
                'branch_id' => $branchId,
                'search' => $search,
            ],
        ]);
    }
}
