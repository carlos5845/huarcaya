<?php

namespace App\Http\Controllers;

use App\Models\InventoryAdjustment;
use App\Models\InventoryAdjustmentLine;
use App\Models\Lot;
use App\Models\Product;
use App\Models\ProductMinPrice;
use App\Models\ProductMinStock;
use App\Models\ProductPrice;
use App\Services\KardexService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductSettingsController extends Controller
{
    public function storePrice(Request $request, Product $product)
    {
        $user = Auth::user();
        if (! $user->hasRole('Super Admin')) {
            $currentBranchId = $user->default_branch_id ?? $user->branches()->first()?->id;
            if ($request->input('branch_id') === 'GLOBAL' || (int) $request->input('branch_id') !== (int) $currentBranchId) {
                return back()->with('error', 'Solo puedes registrar precios para tu sucursal asignada.');
            }
        }

        if ($request->input('branch_id') === 'GLOBAL') {
            $request->merge(['branch_id' => null]);
        }

        $validated = $request->validate([
            'branch_id' => ['nullable', 'exists:branches,id'],
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        $product->prices()->create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $validated['branch_id'] ?? null,
            'price_type' => 'PUBLIC',
            'currency_code' => 'PEN',
            'amount' => $validated['amount'],
            'effective_from' => now(),
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Precio público agregado exitosamente.');
    }

    public function destroyPrice(Product $product, ProductPrice $price)
    {
        $user = Auth::user();
        if (! $user->hasRole('Super Admin')) {
            $currentBranchId = $user->default_branch_id ?? $user->branches()->first()?->id;
            if (! $price->branch_id || (int) $price->branch_id !== (int) $currentBranchId) {
                return back()->with('error', 'Solo puedes eliminar precios de tu sucursal asignada.');
            }
        }

        $price->delete();

        return back()->with('success', 'Precio público eliminado.');
    }

    public function storeMinPrice(Request $request, Product $product)
    {
        $user = Auth::user();
        if (! $user->hasRole('Super Admin')) {
            $currentBranchId = $user->default_branch_id ?? $user->branches()->first()?->id;
            if ($request->input('branch_id') === 'GLOBAL' || (int) $request->input('branch_id') !== (int) $currentBranchId) {
                return back()->with('error', 'Solo puedes registrar precios mínimos para tu sucursal asignada.');
            }
        }

        if ($request->input('branch_id') === 'GLOBAL') {
            $request->merge(['branch_id' => null]);
        }

        $validated = $request->validate([
            'branch_id' => ['nullable', 'exists:branches,id'],
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        $product->minPrices()->create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $validated['branch_id'] ?? null,
            'currency_code' => 'PEN',
            'amount' => $validated['amount'],
            'effective_from' => now(),
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Precio mínimo agregado exitosamente.');
    }

    public function destroyMinPrice(Product $product, ProductMinPrice $price)
    {
        $user = Auth::user();
        if (! $user->hasRole('Super Admin')) {
            $currentBranchId = $user->default_branch_id ?? $user->branches()->first()?->id;
            if (! $price->branch_id || (int) $price->branch_id !== (int) $currentBranchId) {
                return back()->with('error', 'Solo puedes eliminar precios mínimos de tu sucursal asignada.');
            }
        }

        $price->delete();

        return back()->with('success', 'Precio mínimo eliminado.');
    }

    public function storeMinStock(Request $request, Product $product)
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'exists:branches,id'], // Stock is per branch, no global min stock? Usually yes. If null, maybe we don't allow.
            'quantity' => ['required', 'numeric', 'min:0'],
        ]);

        $user = Auth::user();
        if (! $user->hasRole('Super Admin')) {
            $currentBranchId = $user->default_branch_id ?? $user->branches()->first()?->id;
            if (! $currentBranchId || (int) $validated['branch_id'] !== (int) $currentBranchId) {
                return back()->with('error', 'Solo puedes configurar el umbral de stock de tu sucursal asignada.');
            }
        }

        // Check if exists
        $existing = $product->minStocks()->where('branch_id', $validated['branch_id'])->first();
        if ($existing) {
            $existing->update(['minimum_quantity' => $validated['quantity']]);
        } else {
            $stock = new ProductMinStock([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $validated['branch_id'],
                'minimum_quantity' => $validated['quantity'],
                'created_by' => $user->id,
            ]);
            $stock->effective_from = now();
            $product->minStocks()->save($stock);
        }

        return back()->with('success', 'Stock mínimo configurado.');
    }

    public function destroyMinStock(Product $product, ProductMinStock $stock)
    {
        $user = Auth::user();
        if (! $user->hasRole('Super Admin')) {
            $currentBranchId = $user->default_branch_id ?? $user->branches()->first()?->id;
            if (! $currentBranchId || (int) $stock->branch_id !== (int) $currentBranchId) {
                return back()->with('error', 'Solo puedes eliminar el umbral de stock de tu sucursal asignada.');
            }
        }

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

    public function quickAdjustStock(Request $request, Product $product)
    {
        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');

        $validated = $request->validate([
            'branch_id' => ['required', 'exists:branches,id'],
            'type' => ['required', 'in:POSITIVE,NEGATIVE'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'reason' => ['required', 'string', 'max:100'],
        ]);

        if (! $isSuperAdmin) {
            $currentBranchId = $user->default_branch_id ?? $user->branches()->first()?->id;
            if (! $currentBranchId || (int) $validated['branch_id'] !== (int) $currentBranchId) {
                return back()->with('error', 'Solo puedes ajustar el inventario de la sede a la que estás asignado actualmente.');
            }
        }

        DB::beginTransaction();
        try {
            $prefix = $validated['type'] === 'POSITIVE' ? 'AJP' : 'AJN';
            $adjNumber = $prefix.date('Ymd').'-'.strtoupper(Str::random(5));

            $adjustment = InventoryAdjustment::create([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $validated['branch_id'],
                'adjustment_number' => $adjNumber,
                'operation_date' => now(),
                'adjustment_type' => $validated['type'],
                'status' => 'CONFIRMED',
                'notes' => 'Ajuste rápido desde ficha de producto: '.$validated['reason'],
                'created_by' => $user->id,
                'confirmed_by' => $user->id,
                'confirmed_at' => now(),
            ]);

            $unitCost = $validated['type'] === 'POSITIVE' ? (float) ($validated['unit_cost'] ?? 0) : 0;

            $line = InventoryAdjustmentLine::create([
                'uuid' => (string) Str::uuid(),
                'inventory_adjustment_id' => $adjustment->id,
                'product_id' => $product->id,
                'quantity' => $validated['quantity'],
                'unit_cost' => $unitCost,
                'line_total_cost' => $unitCost * (float) $validated['quantity'],
                'reason_code' => $validated['reason'],
            ]);

            $kardexService = app(KardexService::class);
            $kardexData = [
                'branch_id' => $validated['branch_id'],
                'product_id' => $product->id,
                'quantity' => (float) $validated['quantity'],
                'unit_cost' => $unitCost,
                'operation_type' => $validated['type'] === 'POSITIVE' ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
                'reference' => 'AJUSTE RÁPIDO: '.$adjNumber.' ('.$validated['reason'].')',
                'user_id' => $user->id,
            ];

            if ($validated['type'] === 'POSITIVE') {
                $kardexService->recordEntry($kardexData);

                Lot::create([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $product->id,
                    'lot_number' => 'LOT-ADJ-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                    'original_quantity' => (float) $validated['quantity'],
                    'current_quantity' => (float) $validated['quantity'],
                    'unit_cost' => $unitCost,
                    'status' => 'ACTIVE',
                ]);
            } else {
                $kardexService->recordExit($kardexData);

                // FIFO lots deduction
                $remainingToDeduct = (float) $validated['quantity'];
                $lots = Lot::where('branch_id', $validated['branch_id'])
                    ->where('product_id', $product->id)
                    ->where('current_quantity', '>', 0)
                    ->orderBy('created_at', 'asc')
                    ->lockForUpdate()
                    ->get();

                foreach ($lots as $lot) {
                    if ($remainingToDeduct <= 0) {
                        break;
                    }
                    $availableInLot = (float) $lot->current_quantity;
                    $toDeduct = min($availableInLot, $remainingToDeduct);
                    $lot->current_quantity = $availableInLot - $toDeduct;
                    if ($lot->current_quantity <= 0.000001) {
                        $lot->current_quantity = 0;
                        $lot->status = 'DEPLETED';
                    }
                    $lot->save();
                    $remainingToDeduct -= $toDeduct;
                }
            }

            DB::commit();

            return back()->with('success', 'Ajuste de inventario aplicado exitosamente.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al aplicar ajuste: '.$e->getMessage());
        }
    }
}
