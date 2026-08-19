<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductMinPrice;
use App\Models\ProductMinStock;
use App\Models\ProductPrice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ProductSettingsController extends Controller
{
    public function storePrice(Request $request, Product $product)
    {
        $validated = $request->validate([
            'branch_id' => ['nullable', 'exists:branches,id'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $product->prices()->create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $validated['branch_id'] ?? null,
            'price_type' => 'PUBLIC',
            'currency_code' => 'PEN',
            'amount' => $validated['amount'],
            'effective_from' => now(),
            'created_by' => Auth::id(),
        ]);

        return back()->with('success', 'Precio agregado exitosamente.');
    }

    public function destroyPrice(Product $product, ProductPrice $price)
    {
        $price->delete();

        return back()->with('success', 'Precio eliminado.');
    }

    public function storeMinPrice(Request $request, Product $product)
    {
        $validated = $request->validate([
            'branch_id' => ['nullable', 'exists:branches,id'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $product->minPrices()->create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $validated['branch_id'] ?? null,
            'currency_code' => 'PEN',
            'amount' => $validated['amount'],
            'effective_from' => now(),
            'created_by' => Auth::id(),
        ]);

        return back()->with('success', 'Precio mínimo agregado exitosamente.');
    }

    public function destroyMinPrice(Product $product, ProductMinPrice $price)
    {
        $price->delete();

        return back()->with('success', 'Precio mínimo eliminado.');
    }

    public function storeMinStock(Request $request, Product $product)
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'exists:branches,id'], // Stock is per branch, no global min stock? Usually yes. If null, maybe we don't allow.
            'quantity' => ['required', 'numeric', 'min:0'],
        ]);

        // Check if exists
        $existing = $product->minStocks()->where('branch_id', $validated['branch_id'])->first();
        if ($existing) {
            $existing->update(['minimum_quantity' => $validated['quantity']]);
        } else {
            $stock = new ProductMinStock([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $validated['branch_id'],
                'minimum_quantity' => $validated['quantity'],
                'created_by' => Auth::id(),
            ]);
            $stock->effective_from = now();
            $product->minStocks()->save($stock);
        }

        return back()->with('success', 'Stock mínimo configurado.');
    }

    public function destroyMinStock(Product $product, ProductMinStock $stock)
    {
        $stock->delete();

        return back()->with('success', 'Stock mínimo eliminado.');
    }

    public function syncKitComponents(Request $request, Product $product)
    {
        if ($product->product_type !== 'KIT_COMPONENTES') {
            abort(403, 'El producto no es un Kit por componentes.');
        }

        $validated = $request->validate([
            'components' => ['array'],
            'components.*.product_id' => ['required', 'exists:products,id'],
            'components.*.quantity' => ['required', 'numeric', 'min:0.01'],
        ]);

        // Disable previous active version
        $product->kitVersions()->where('status', 'ACTIVE')->update(['status' => 'INACTIVE']);

        // Create new version
        $versionNumber = $product->kitVersions()->count() + 1;
        $version = $product->kitVersions()->create([
            'uuid' => (string) Str::uuid(),
            'version_name' => 'v'.$versionNumber,
            'status' => 'ACTIVE',
            'created_by' => Auth::id(),
        ]);

        // Attach components
        if (! empty($validated['components'])) {
            foreach ($validated['components'] as $comp) {
                $version->components()->create([
                    'uuid' => (string) Str::uuid(),
                    'product_id' => $comp['product_id'],
                    'quantity' => $comp['quantity'],
                    'is_critical' => true,
                ]);
            }
        }

        return back()->with('success', 'Composición del Kit actualizada (Versión '.$versionNumber.').');
    }
}
