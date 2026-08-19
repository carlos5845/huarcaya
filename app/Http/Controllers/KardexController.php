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
        $branchId = $request->input('branch_id');
        $productId = $request->input('product_id');

        $entries = KardexEntry::with(['product', 'user', 'originalEntry'])
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->when($productId, fn($q) => $q->where('product_id', $productId))
            ->orderBy('sequence_number', 'desc')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('inventory/kardex/index', [
            'entries' => $entries,
            'branches' => Branch::all(),
            'products' => Product::all(), // En producción esto debería ser un buscador asíncrono
            'filters' => $request->only(['branch_id', 'product_id'])
        ]);
    }
}
