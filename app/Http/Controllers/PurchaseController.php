<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Lot;
use App\Models\Purchase;
use App\Models\PurchaseLine;
use App\Models\Supplier;
use App\Services\KardexService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $branchIdFilter = $request->input('branch_id');

        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');

        $allowedBranchIds = $isSuperAdmin
            ? Branch::pluck('id')->toArray()
            : $user->branches()->pluck('branches.id')->toArray();

        if (empty($allowedBranchIds) && ! $isSuperAdmin && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        $purchases = Purchase::with(['supplier', 'lines.product'])
            ->where('company_id', $user->company_id)
            ->whereIn('branch_id', $allowedBranchIds)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('purchase_number', 'like', "%{$search}%")
                        ->orWhereHas('supplier', function ($sq) use ($search) {
                            $sq->where('legal_name', 'like', "%{$search}%");
                        })
                        ->orWhereHas('lines.product', function ($pq) use ($search) {
                            $pq->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($branchIdFilter, function ($query, $branchIdFilter) {
                $query->where('branch_id', $branchIdFilter);
            })
            ->when($dateFrom, function ($query, $dateFrom) {
                $query->whereDate('document_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                $query->whereDate('document_date', '<=', $dateTo);
            })
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('purchases/index', [
            'purchases' => $purchases,
            'branches' => $isSuperAdmin ? Branch::orderBy('name')->get(['id', 'name']) : [],
            'isSuperAdmin' => $isSuperAdmin,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'branch_id']),
        ]);
    }

    public function create()
    {
        $suppliers = Supplier::where('company_id', Auth::user()->company_id)->where('status', 'ACTIVE')->get();

        return Inertia::render('purchases/create', [
            'suppliers' => $suppliers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'supplier_document_type' => ['nullable', 'string', 'max:30'],
            'supplier_document_series' => ['nullable', 'string', 'max:30'],
            'supplier_document_number' => ['nullable', 'string', 'max:50'],
            'document_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:1'],
            'lines.*.unit_cost' => ['required', 'numeric', 'min:0'],
        ]);

        $companyId = Auth::user()->company_id;
        $branchId = Auth::user()->default_branch_id ?? Branch::where('company_id', $companyId)->first()->id;

        DB::beginTransaction();
        try {
            // Check document uniqueness if provided
            if ($validated['supplier_document_type'] && $validated['supplier_document_series'] && $validated['supplier_document_number']) {
                $exists = Purchase::where('company_id', $companyId)
                    ->where('supplier_id', $validated['supplier_id'])
                    ->where('supplier_document_type', $validated['supplier_document_type'])
                    ->where('supplier_document_series', $validated['supplier_document_series'])
                    ->where('supplier_document_number', $validated['supplier_document_number'])
                    ->exists();

                if ($exists) {
                    throw ValidationException::withMessages([
                        'supplier_document_number' => 'Ya existe una compra con este comprobante para el proveedor seleccionado.',
                    ]);
                }
            }

            // Calculate totals
            $subtotal = 0;
            foreach ($validated['lines'] as $line) {
                $subtotal += ($line['quantity'] * $line['unit_cost']);
            }
            // For simplicity, tax is 0 in this basic version, or calculated if needed
            $taxAmount = 0;
            $totalAmount = $subtotal + $taxAmount;

            $purchaseNumber = 'PUR-'.date('Ymd').'-'.strtoupper(Str::random(6));

            $purchase = Purchase::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'branch_id' => $branchId,
                'supplier_id' => $validated['supplier_id'],
                'purchase_number' => $purchaseNumber,
                'supplier_document_type' => $validated['supplier_document_type'],
                'supplier_document_series' => $validated['supplier_document_series'],
                'supplier_document_number' => $validated['supplier_document_number'],
                'document_date' => $validated['document_date'],
                'currency_code' => 'PEN',
                'exchange_rate' => 1,
                'subtotal_amount' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'status' => 'DRAFT',
                'notes' => $validated['notes'],
                'created_by' => Auth::id(),
            ]);

            foreach ($validated['lines'] as $lineData) {
                $lineSubtotal = $lineData['quantity'] * $lineData['unit_cost'];
                PurchaseLine::create([
                    'uuid' => (string) Str::uuid(),
                    'purchase_id' => $purchase->id,
                    'product_id' => $lineData['product_id'],
                    'ordered_quantity' => $lineData['quantity'],
                    'unit_cost_original' => $lineData['unit_cost'],
                    'unit_cost_base' => $lineData['unit_cost'], // assuming same currency
                    'line_subtotal' => $lineSubtotal,
                    'tax_amount' => 0,
                    'line_total' => $lineSubtotal,
                    'received_quantity' => 0,
                ]);
            }

            DB::commit();

            return redirect()->route('purchases.show', $purchase->id)->with('success', 'Compra en borrador creada exitosamente.');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function show(Purchase $purchase)
    {
        $purchase->load(['supplier', 'lines.product', 'creator']);

        return Inertia::render('purchases/show', [
            'purchase' => $purchase,
        ]);
    }

    public function confirm(Purchase $purchase, KardexService $kardexService)
    {
        if ($purchase->status !== 'DRAFT') {
            return back()->with('error', 'La compra ya ha sido confirmada o anulada.');
        }

        DB::beginTransaction();
        try {
            $purchase->update([
                'status' => 'CONFIRMED',
                'confirmed_at' => now(),
                'approved_by' => Auth::id(),
            ]);

            foreach ($purchase->lines as $line) {
                $line->update([
                    'received_quantity' => $line->ordered_quantity,
                ]);

                // Create Lot for PEPS (FIFO) tracking
                $lotNumber = 'LOT-'.date('Ymd').'-'.strtoupper(Str::random(4));
                Lot::create([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $purchase->branch_id,
                    'product_id' => $line->product_id,
                    'lot_number' => $lotNumber,
                    'original_quantity' => $line->received_quantity,
                    'current_quantity' => $line->received_quantity,
                    'unit_cost' => $line->unit_cost_base,
                    'status' => 'ACTIVE',
                ]);

                // Register Kardex Entry via Service
                $kardexService->recordEntry([
                    'product_id' => $line->product_id,
                    'branch_id' => $purchase->branch_id,
                    'quantity' => (int) $line->received_quantity, // Convert decimal to int since it's discrete
                    'unit_cost' => $line->unit_cost_base,
                    'operation_type' => 'COMPRA',
                    'reference' => 'COMPRA: '.$purchase->purchase_number,
                ]);
            }

            DB::commit();

            return back()->with('success', 'Compra confirmada. El inventario ha sido actualizado.');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
