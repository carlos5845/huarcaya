<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\KardexEntry;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class KardexController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        
        $allowedBranchIds = $isSuperAdmin 
            ? \App\Models\Branch::pluck('id')->toArray() 
            : $user->branches()->pluck('branches.id')->toArray();

        if (empty($allowedBranchIds) && !$isSuperAdmin && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        $branchId = $request->input('branch_id');
        $productId = $request->input('product_id');
        $search = $request->input('search');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        // Si no es Super Admin y pide 'ALL' o una sucursal no permitida, forzamos a mostrar solo las permitidas
        if (!$isSuperAdmin) {
            if (empty($branchId) || $branchId === 'ALL' || !in_array((int)$branchId, $allowedBranchIds)) {
                $branchId = null; // No filtramos por uno específico, dejamos que el whereIn actúe sobre todos los permitidos
            }
        }

        $entries = KardexEntry::with(['product', 'user', 'originalEntry'])
            ->whereIn('branch_id', $allowedBranchIds)
            ->when($branchId && $branchId !== 'ALL', fn($q) => $q->where('branch_id', $branchId))
            ->when($productId, fn($q) => $q->where('product_id', $productId))
            ->when($search, function ($query, $search) {
                $query->where(function($q) use ($search) {
                    $q->where('operation_type', 'like', "%{$search}%")
                      ->orWhereHas('user', function($uq) use ($search) {
                          $uq->where('name', 'like', "%{$search}%");
                      })
                      ->orWhereHas('product', function($pq) use ($search) {
                          $pq->where('name', 'like', "%{$search}%")
                             ->orWhere('internal_code', 'like', "%{$search}%")
                             ->orWhere('primary_reference', 'like', "%{$search}%");
                      });
                });
            })
            ->when($dateFrom, function ($query, $dateFrom) {
                $query->whereDate('operation_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                $query->whereDate('operation_date', '<=', $dateTo);
            })
            ->orderBy('sequence_number', 'desc')
            ->paginate(50)
            ->withQueryString();

        $branches = $isSuperAdmin 
            ? \App\Models\Branch::orderBy('name')->get() 
            : $user->branches()->orderBy('name')->get();
        if ($branches->isEmpty() && $user->default_branch_id) {
            $branches = \App\Models\Branch::where('id', $user->default_branch_id)->get();
        }

        return Inertia::render('inventory/kardex/index', [
            'entries' => $entries,
            'branches' => $branches,
            'isSuperAdmin' => $isSuperAdmin,
            'products' => Product::all(), // En producción esto debería ser un buscador asíncrono
            'filters' => $request->only(['branch_id', 'product_id', 'search', 'date_from', 'date_to'])
        ]);
    }
}
