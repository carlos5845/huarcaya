<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');

        $products = Product::with(['brand', 'category', 'unit'])
            ->when($search, function ($query, $search) {
                $query->whereLikeAccentInsensitive('primary_reference', "%{$search}%")
                    ->orWhereLikeAccentInsensitive('normalized_reference', '%'.Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $search)).'%')
                    ->orWhereLikeAccentInsensitive('name', "%{$search}%")
                    ->orWhereLikeAccentInsensitive('internal_code', "%{$search}%")
                    ->orWhereHas('aliases', function ($q) use ($search) {
                        $q->whereLikeAccentInsensitive('alias', "%{$search}%");
                    })
                    ->orWhereHas('brand', function ($bq) use ($search) {
                        $bq->whereLikeAccentInsensitive('name', "%{$search}%");
                    });
            })
            ->orderBy('id', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('catalog/products/index', [
            'products' => $products,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('catalog/products/form', [
            'brands' => Brand::orderBy('name')->get(),
            'categories' => Category::orderBy('name')->get(),
            'units' => Unit::orderBy('name')->get(),
            'product' => null,
        ]);
    }

    public function checkSimilarity(Request $request)
    {
        $request->validate(['reference' => 'required|string']);
        $normalized = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $request->reference));

        $exists = Product::where('normalized_reference', $normalized)
            ->when($request->ignore_id, function ($q) use ($request) {
                $q->where('id', '!=', $request->ignore_id);
            })
            ->first();

        return response()->json([
            'exists' => (bool) $exists,
            'similar_product' => $exists ? [
                'reference' => $exists->primary_reference,
                'name' => $exists->name,
            ] : null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'internal_code' => ['nullable', 'string', 'max:50', 'unique:products,internal_code'],
            'primary_reference' => ['required', 'string', 'max:255', 'unique:products,primary_reference'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'brand_id' => ['required', 'exists:brands,id'],
            'category_id' => ['required', 'exists:categories,id'],
            'unit_id' => ['required', 'exists:units,id'],
            'product_type' => ['required', 'in:SIMPLE,KIT_UNICO,KIT_COMPONENTES'],
            'requires_lot_tracking' => ['boolean'],
            'fifo_enabled' => ['boolean'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
            'aliases' => ['nullable', 'array'],
            'aliases.*.alias' => ['required', 'string', 'max:255'],
        ]);

        $product = Product::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => Auth::user()->company_id,
            'internal_code' => $validated['internal_code'] ?? null,
            'primary_reference' => $validated['primary_reference'],
            'normalized_reference' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $validated['primary_reference'])),
            'name' => $validated['name'],
            'normalized_name' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $validated['name'])),
            'description' => $validated['description'],
            'brand_id' => $validated['brand_id'],
            'category_id' => $validated['category_id'],
            'unit_id' => $validated['unit_id'],
            'product_type' => $validated['product_type'],
            'requires_lot_tracking' => $validated['requires_lot_tracking'] ?? false,
            'fifo_enabled' => $validated['fifo_enabled'] ?? true,
            'status' => $validated['status'],
            'created_by' => Auth::id(),
        ]);

        if (! empty($validated['aliases'])) {
            foreach ($validated['aliases'] as $alias) {
                $product->aliases()->create([
                    'uuid' => (string) Str::uuid(),
                    'alias' => $alias['alias'],
                    'normalized_alias' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $alias['alias'])),
                    'created_by' => Auth::id(),
                ]);
            }
        }

        return redirect()->route('products.index')->with('success', 'Producto registrado exitosamente.');
    }

    public function search(Request $request)
    {
        $search = $request->input('q');

        $branchId = $request->input('branch_id') ?: (Auth::user()->default_branch_id
                    ?? Branch::where('company_id', Auth::user()->company_id)->first()->id);

        $products = Product::with([
            'brand',
            'prices' => function ($q) use ($branchId) {
                $q->where('status', 'ACTIVE')
                    ->where(function ($query) use ($branchId) {
                        $query->where('branch_id', $branchId)->orWhereNull('branch_id');
                    })
                    ->orderBy('id', 'desc');
            },
            'inventories' => function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            },
        ])
            ->where('status', 'ACTIVE')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereLikeAccentInsensitive('primary_reference', "%{$search}%")
                        ->orWhereLikeAccentInsensitive('normalized_reference', '%'.Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $search)).'%')
                        ->orWhereLikeAccentInsensitive('name', "%{$search}%")
                        ->orWhereHas('brand', function ($brandQuery) use ($search) {
                            $brandQuery->whereLikeAccentInsensitive('name', "%{$search}%");
                        });
                });
            })
            ->limit(20)
            ->get(['id', 'primary_reference', 'name', 'internal_code', 'brand_id']);

        $products->transform(function ($product) {
            $price = $product->prices->first();
            $inventory = $product->inventories->first();

            $suggestedPrice = $price ? $price->amount : ($inventory && $inventory->average_cost > 0 ? $inventory->average_cost * 1.30 : 0);

            return [
                'id' => $product->id,
                'primary_reference' => $product->primary_reference,
                'name' => $product->name,
                'internal_code' => $product->internal_code,
                'suggested_price' => round($suggestedPrice, 2),
                'brand' => $product->brand ? ['name' => $product->brand->name] : null,
                'available_quantity' => $inventory ? (float) $inventory->available_quantity : 0,
            ];
        });

        return response()->json($products);
    }

    public function show(Product $product)
    {
        $user = auth()->user();
        $isSuperAdmin = $user->hasRole('Super Admin');

        $branches = $isSuperAdmin
            ? Branch::orderBy('name')->get()
            : $user->branches()->orderBy('name')->get();

        if ($branches->isEmpty() && $user->default_branch_id) {
            $branches = Branch::where('id', $user->default_branch_id)->get();
        }

        $allowedBranchIds = $branches->pluck('id')->toArray();

        $product->load([
            'brand',
            'category',
            'unit',
            'aliases',
            'kitVersions' => function ($q) {
                $q->with('components.product');
            },
            'lots' => function ($q) use ($allowedBranchIds, $isSuperAdmin) {
                $q->with('location');
                if (! $isSuperAdmin) {
                    $q->whereIn('branch_id', $allowedBranchIds);
                }
            },
            'prices' => function ($q) use ($allowedBranchIds, $isSuperAdmin) {
                $q->with('branch')->orderBy('id', 'desc');
                if (! $isSuperAdmin) {
                    $q->where(function ($sub) use ($allowedBranchIds) {
                        $sub->whereIn('branch_id', $allowedBranchIds)->orWhereNull('branch_id');
                    });
                }
            },
            'minPrices' => function ($q) use ($allowedBranchIds, $isSuperAdmin) {
                $q->with('branch')->orderBy('id', 'desc');
                if (! $isSuperAdmin) {
                    $q->where(function ($sub) use ($allowedBranchIds) {
                        $sub->whereIn('branch_id', $allowedBranchIds)->orWhereNull('branch_id');
                    });
                }
            },
            'minStocks' => function ($q) use ($allowedBranchIds, $isSuperAdmin) {
                $q->with('branch')->orderBy('id', 'desc');
                if (! $isSuperAdmin) {
                    $q->whereIn('branch_id', $allowedBranchIds);
                }
            },
            'inventories' => function ($q) use ($allowedBranchIds, $isSuperAdmin) {
                $q->with(['branch']);
                if (! $isSuperAdmin) {
                    $q->whereIn('branch_id', $allowedBranchIds);
                }
            },
        ]);

        return Inertia::render('catalog/products/show', [
            'product' => $product,
            'branches' => $branches,
            'isSuperAdmin' => $isSuperAdmin,
        ]);
    }

    public function edit(Product $product)
    {
        $product->load('aliases');

        return Inertia::render('catalog/products/form', [
            'brands' => Brand::orderBy('name')->get(),
            'categories' => Category::orderBy('name')->get(),
            'units' => Unit::orderBy('name')->get(),
            'product' => $product,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'internal_code' => ['nullable', 'string', 'max:50', Rule::unique('products')->ignore($product->id)],
            'primary_reference' => ['required', 'string', 'max:255', Rule::unique('products')->ignore($product->id)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'brand_id' => ['required', 'exists:brands,id'],
            'category_id' => ['required', 'exists:categories,id'],
            'unit_id' => ['required', 'exists:units,id'],
            'product_type' => ['required', 'in:SIMPLE,KIT_UNICO,KIT_COMPONENTES'],
            'requires_lot_tracking' => ['boolean'],
            'fifo_enabled' => ['boolean'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
            'aliases' => ['nullable', 'array'],
            'aliases.*.id' => ['nullable', 'exists:product_aliases,id'],
            'aliases.*.alias' => ['required', 'string', 'max:255'],
        ]);

        $product->update([
            'internal_code' => $validated['internal_code'] ?? null,
            'primary_reference' => $validated['primary_reference'],
            'normalized_reference' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $validated['primary_reference'])),
            'name' => $validated['name'],
            'normalized_name' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $validated['name'])),
            'description' => $validated['description'],
            'brand_id' => $validated['brand_id'],
            'category_id' => $validated['category_id'],
            'unit_id' => $validated['unit_id'],
            'product_type' => $validated['product_type'],
            'requires_lot_tracking' => $validated['requires_lot_tracking'] ?? false,
            'fifo_enabled' => $validated['fifo_enabled'] ?? true,
            'status' => $validated['status'],
        ]);

        // Sync aliases
        $keptAliasIds = collect($validated['aliases'] ?? [])->pluck('id')->filter()->toArray();
        $product->aliases()->whereNotIn('id', $keptAliasIds)->delete();

        if (! empty($validated['aliases'])) {
            foreach ($validated['aliases'] as $alias) {
                if (isset($alias['id'])) {
                    $product->aliases()->where('id', $alias['id'])->update([
                        'alias' => $alias['alias'],
                        'normalized_alias' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $alias['alias'])),
                    ]);
                } else {
                    $product->aliases()->create([
                        'uuid' => (string) Str::uuid(),
                        'alias' => $alias['alias'],
                        'normalized_alias' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $alias['alias'])),
                        'created_by' => Auth::id(),
                    ]);
                }
            }
        }

        return redirect()->route('products.index')->with('success', 'Producto actualizado exitosamente.');
    }

    public function destroy(Product $product)
    {
        $product->update([
            'status' => $product->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        ]);

        return back()->with('success', 'Estado del producto modificado exitosamente.');
    }
}
