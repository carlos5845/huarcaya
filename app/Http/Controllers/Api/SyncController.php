<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Services\SyncEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    /**
     * Download the branch catalog for offline local storage (IndexedDB).
     */
    public function getCatalog(Request $request): JsonResponse
    {
        $user = $request->user();
        $branchId = $request->input('branch_id')
            ?? $user->default_branch_id
            ?? Branch::where('company_id', $user->company_id)->first()?->id;

        $products = Product::where('company_id', $user->company_id)
            ->where('status', 'ACTIVE')
            ->with([
                'brand',
                'category',
                'unit',
                'prices',
                'inventories' => function ($q) use ($branchId) {
                    if ($branchId) {
                        $q->where('branch_id', $branchId);
                    }
                },
            ])
            ->get()
            ->map(function ($product) {
                $inv = $product->inventories->first();
                $price = $product->prices->sortByDesc('id')->first();
                $suggestedPrice = $price ? (float) $price->amount : ($inv && (float) $inv->average_cost > 0 ? (float) $inv->average_cost * 1.30 : 0);

                return [
                    'id' => $product->id,
                    'uuid' => $product->uuid,
                    'name' => $product->name,
                    'primary_reference' => $product->primary_reference,
                    'barcode' => $product->internal_code,
                    'sale_price' => round($suggestedPrice, 2),
                    'cost_price' => $inv ? (float) $inv->average_cost : 0,
                    'product_type' => $product->product_type,
                    'unit_code' => $product->unit?->code ?? 'NIU',
                    'category_name' => $product->category?->name,
                    'brand_name' => $product->brand?->name,
                    'local_stock' => $inv ? max(0, (float) $inv->available_quantity) : 0,
                ];
            });

        $customers = Customer::where('company_id', $user->company_id)
            ->where('status', 'ACTIVE')
            ->get(['id', 'uuid', 'document_type', 'document_number', 'legal_name', 'phone', 'email', 'address']);

        $paymentMethods = PaymentMethod::where('company_id', $user->company_id)
            ->where('is_active', true)
            ->get(['id', 'name', 'code', 'is_cash']);

        $branch = $branchId ? Branch::find($branchId) : null;

        return response()->json([
            'products' => $products,
            'customers' => $customers,
            'payment_methods' => $paymentMethods,
            'branch' => $branch ? ['id' => $branch->id, 'name' => $branch->name, 'code' => $branch->code] : null,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    /**
     * Process an incoming batch of offline operations idempotently.
     */
    public function syncBatch(Request $request, SyncEngineService $syncEngine): JsonResponse
    {
        $validated = $request->validate([
            'operations' => ['required', 'array'],
            'operations.*.uuid' => ['required', 'string'],
            'operations.*.entity_type' => ['required', 'string'],
            'operations.*.operation_type' => ['required', 'string'],
            'operations.*.payload' => ['required', 'array'],
            'branch_id' => ['nullable', 'exists:branches,id'],
        ]);

        $user = $request->user();
        $branchId = (int) ($validated['branch_id']
            ?? $user->default_branch_id
            ?? Branch::where('company_id', $user->company_id)->first()?->id);

        $results = $syncEngine->processBatch($validated['operations'], $user, $branchId);

        return response()->json([
            'results' => $results,
            'processed_count' => count($results),
            'server_time' => now()->toIso8601String(),
        ]);
    }
}
