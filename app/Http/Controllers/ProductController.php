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
                $query->where('primary_reference', 'like', "%{$search}%")
                    ->orWhere('normalized_reference', 'like', '%'.Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $search)).'%')
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('internal_code', 'like', "%{$search}%")
                    ->orWhereHas('aliases', function ($q) use ($search) {
                        $q->where('alias', 'like', "%{$search}%");
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

        $products = Product::where('status', 'ACTIVE')
            ->when($search, function ($query, $search) {
                $query->where('primary_reference', 'like', "%{$search}%")
                    ->orWhere('normalized_reference', 'like', '%'.Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $search)).'%')
                    ->orWhere('name', 'like', "%{$search}%");
            })
            ->limit(20)
            ->get(['id', 'primary_reference', 'name', 'internal_code']);

        return response()->json($products);
    }

    public function show(Product $product)
    {
        $product->load([
            'brand',
            'category',
            'unit',
            'aliases',
            'lots.location',
            'prices' => function ($q) {
                $q->with('branch')->orderBy('id', 'desc');
            },
            'minPrices' => function ($q) {
                $q->with('branch')->orderBy('id', 'desc');
            },
            'minStocks' => function ($q) {
                $q->with('branch')->orderBy('id', 'desc');
            },
            'kitVersions' => function ($q) {
                $q->with('components.product');
            },
            'inventories' => function ($q) {
                $q->with(['branch']);
            },
        ]);

        return Inertia::render('catalog/products/show', [
            'product' => $product,
            'branches' => Branch::orderBy('name')->get(),
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
