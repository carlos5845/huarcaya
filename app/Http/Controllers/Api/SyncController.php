<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Company;
use App\Models\Customer;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Quotation;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\Transfer;
use App\Models\Unit;
use App\Services\SyncEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class SyncController extends Controller
{
    /**
     * List 100% of compiled Vite assets in public/build/assets/ so the Service Worker
     * can precache every JS/CSS/icon chunk and guarantee zero missing-module errors offline.
     */
    public function getPwaAssets(): JsonResponse
    {
        $assets = [];

        $buildAssetsDir = public_path('build/assets');
        if (File::isDirectory($buildAssetsDir)) {
            foreach (File::files($buildAssetsDir) as $file) {
                $ext = strtolower($file->getExtension());
                if (in_array($ext, ['js', 'css', 'woff', 'woff2', 'ttf', 'svg', 'png', 'jpg', 'webp'], true)) {
                    $assets[] = '/build/assets/'.$file->getFilename();
                }
            }
        }

        $staticFiles = [
            '/manifest.webmanifest',
            '/icons/icon-192.png',
            '/icons/icon-512.png',
            '/icons/icon-maskable.png',
            '/captura.png',
            '/logo-text.png',
        ];

        foreach ($staticFiles as $path) {
            if (File::exists(public_path(ltrim($path, '/')))) {
                $assets[] = $path;
            }
        }

        return response()->json([
            'assets' => array_values(array_unique($assets)),
            'count' => count($assets),
        ]);
    }

    /**
     * Lightweight authenticated health check that also refreshes the XSRF-TOKEN cookie.
     */
    public function ping(): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    /**
     * Download the branch catalog and operational datasets for offline local storage (IndexedDB).
     */
    public function getCatalog(Request $request): JsonResponse
    {
        $user = $request->user();
        $companyId = $user->company_id;
        $branchId = $request->input('branch_id')
            ?? $user->default_branch_id
            ?? Branch::where('company_id', $companyId)->first()?->id;

        $products = Product::where('company_id', $companyId)
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

        $customers = Customer::where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->get(['id', 'uuid', 'document_type', 'document_number', 'legal_name', 'phone', 'email', 'address']);

        $suppliers = Supplier::where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->get(['id', 'uuid', 'document_type', 'document_number', 'legal_name', 'trade_name', 'phone', 'email', 'address', 'contact_name']);

        $brands = Brand::where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->get(['id', 'uuid', 'code', 'name']);

        $categories = Category::where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->get(['id', 'uuid', 'parent_id', 'code', 'name']);

        $units = Unit::where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->get(['id', 'uuid', 'code', 'name', 'symbol', 'allows_decimals']);

        $branches = Branch::where('company_id', $companyId)
            ->where('status', 'ACTIVE')
            ->get(['id', 'uuid', 'name', 'code', 'address', 'phone', 'type', 'invoice_series', 'boleta_series', 'ticket_series']);

        $companyModel = Company::find($companyId);
        $company = $companyModel ? [
            'id' => $companyModel->id,
            'name' => $companyModel->name,
            'business_name' => $companyModel->business_name,
            'trade_name' => $companyModel->trade_name,
            'document_type' => $companyModel->document_type,
            'document_number' => $companyModel->document_number,
            'address' => $companyModel->address,
            'phone' => $companyModel->phone,
            'email' => $companyModel->email,
            'ubigeo' => $companyModel->ubigeo,
        ] : null;

        $paymentMethods = PaymentMethod::where('company_id', $companyId)
            ->where('is_active', true)
            ->get(['id', 'name', 'code', 'is_cash']);

        $branchIds = $branches->pluck('id');
        $since = now()->subDays(60);

        $receivables = Receivable::whereIn('branch_id', $branchIds)
            ->where('balance_amount', '>', 0)
            ->with('customer:id,legal_name,document_number')
            ->orderByDesc('id')
            ->limit(250)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'uuid' => $r->uuid,
                'branch_id' => $r->branch_id,
                'customer_id' => $r->customer_id,
                'customer_name' => $r->customer?->legal_name ?? 'Cliente',
                'customer_document' => $r->customer?->document_number,
                'sale_id' => $r->sale_id,
                'issue_date' => $r->issue_date?->toIso8601String(),
                'due_date' => $r->due_date?->format('Y-m-d'),
                'currency_code' => $r->currency_code,
                'original_amount' => round((float) $r->original_amount, 2),
                'balance_amount' => round((float) $r->balance_amount, 2),
                'status' => $r->status,
            ]);

        $recentSales = Sale::where('company_id', $companyId)
            ->where('created_at', '>=', $since)
            ->orderByDesc('id')
            ->limit(200)
            ->get([
                'id', 'uuid', 'branch_id', 'customer_id', 'sale_number', 'sale_type',
                'payment_type', 'payment_status', 'operation_date', 'currency_code',
                'total_amount', 'status', 'customer_name_snapshot', 'customer_document_snapshot',
            ])
            ->map(fn ($s) => [
                'id' => $s->id,
                'uuid' => $s->uuid,
                'branch_id' => $s->branch_id,
                'customer_id' => $s->customer_id,
                'sale_number' => $s->sale_number,
                'sale_type' => $s->sale_type,
                'payment_type' => $s->payment_type,
                'payment_status' => $s->payment_status,
                'operation_date' => $s->operation_date?->toIso8601String(),
                'currency_code' => $s->currency_code,
                'total_amount' => round((float) $s->total_amount, 2),
                'status' => $s->status,
                'customer_name' => $s->customer_name_snapshot ?? 'Varios',
                'customer_document' => $s->customer_document_snapshot,
            ]);

        $recentPurchases = Purchase::where('company_id', $companyId)
            ->where('created_at', '>=', $since)
            ->with('supplier:id,legal_name,document_number')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'uuid' => $p->uuid,
                'branch_id' => $p->branch_id,
                'supplier_id' => $p->supplier_id,
                'supplier_name' => $p->supplier?->legal_name ?? 'Proveedor',
                'purchase_number' => $p->purchase_number,
                'supplier_document_type' => $p->supplier_document_type,
                'supplier_document_series' => $p->supplier_document_series,
                'supplier_document_number' => $p->supplier_document_number,
                'document_date' => $p->document_date?->format('Y-m-d'),
                'currency_code' => $p->currency_code,
                'total_amount' => round((float) $p->total_amount, 2),
                'status' => $p->status,
            ]);

        $recentQuotations = Quotation::where('company_id', $companyId)
            ->where('created_at', '>=', $since)
            ->orderByDesc('id')
            ->limit(200)
            ->get([
                'id', 'uuid', 'branch_id', 'customer_id', 'quotation_number',
                'operation_date', 'valid_until_date', 'currency_code', 'total_amount',
                'status', 'customer_name_snapshot',
            ])
            ->map(fn ($q) => [
                'id' => $q->id,
                'uuid' => $q->uuid,
                'branch_id' => $q->branch_id,
                'customer_id' => $q->customer_id,
                'quotation_number' => $q->quotation_number,
                'operation_date' => $q->operation_date?->toIso8601String(),
                'valid_until_date' => $q->valid_until_date?->format('Y-m-d'),
                'currency_code' => $q->currency_code,
                'total_amount' => round((float) $q->total_amount, 2),
                'status' => $q->status,
                'customer_name' => $q->customer_name_snapshot ?? 'Cliente',
            ]);

        $recentTransfers = Transfer::where('company_id', $companyId)
            ->where('created_at', '>=', $since)
            ->orderByDesc('id')
            ->limit(200)
            ->get([
                'id', 'uuid', 'source_branch_id', 'destination_branch_id',
                'transfer_number', 'request_date', 'status',
            ])
            ->map(fn ($t) => [
                'id' => $t->id,
                'uuid' => $t->uuid,
                'source_branch_id' => $t->source_branch_id,
                'destination_branch_id' => $t->destination_branch_id,
                'transfer_number' => $t->transfer_number,
                'request_date' => $t->request_date?->toIso8601String(),
                'status' => $t->status,
            ]);

        $branch = $branchId ? Branch::find($branchId) : null;

        return response()->json([
            'products' => $products,
            'customers' => $customers,
            'suppliers' => $suppliers,
            'brands' => $brands,
            'categories' => $categories,
            'units' => $units,
            'branches' => $branches,
            'company' => $company,
            'payment_methods' => $paymentMethods,
            'receivables' => $receivables,
            'recent_sales' => $recentSales,
            'recent_purchases' => $recentPurchases,
            'recent_quotations' => $recentQuotations,
            'recent_transfers' => $recentTransfers,
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
