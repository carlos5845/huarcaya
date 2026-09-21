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
                    $q->whereLikeAccentInsensitive('purchase_number', "%{$search}%")
                        ->orWhereHas('supplier', function ($sq) use ($search) {
                            $sq->whereLikeAccentInsensitive('legal_name', "%{$search}%")
                                ->orWhereLikeAccentInsensitive('document_number', "%{$search}%");
                        })
                        ->orWhereHas('lines.product', function ($pq) use ($search) {
                            $pq->whereLikeAccentInsensitive('name', "%{$search}%")
                                ->orWhereLikeAccentInsensitive('primary_reference', "%{$search}%")
                                ->orWhereHas('brand', function ($bq) use ($search) {
                                    $bq->whereLikeAccentInsensitive('name', "%{$search}%");
                                });
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
        $user = Auth::user();
        $suppliers = Supplier::where('company_id', $user->company_id)->where('status', 'ACTIVE')->orderBy('legal_name')->get();
        $defaultBranch = $user->default_branch_id ? Branch::find($user->default_branch_id) : Branch::where('company_id', $user->company_id)->first();

        return Inertia::render('purchases/create', [
            'suppliers' => $suppliers,
            'defaultBranch' => $defaultBranch,
        ]);
    }

    public function store(Request $request, KardexService $kardexService)
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
            'tax_mode' => ['required', 'string', 'in:INCLUDED,PLUS_TAX,EXEMPT'],
            'currency_code' => ['required', 'string', 'in:PEN,USD'],
            'exchange_rate' => ['required_if:currency_code,USD', 'numeric', 'min:0.01'],
            'document_file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'], // Max 5MB
            'action' => ['nullable', 'string', 'in:DRAFT,CONFIRM'],
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
            $linesTotal = 0;
            $taxMode = $validated['tax_mode'];

            foreach ($validated['lines'] as $line) {
                $linesTotal += ($line['quantity'] * $line['unit_cost']);
            }

            $globalSubtotal = $linesTotal;
            $globalTax = 0;
            $globalTotal = $linesTotal;

            if ($taxMode === 'INCLUDED') {
                $globalSubtotal = $linesTotal / 1.18;
                $globalTax = $linesTotal - $globalSubtotal;
                $globalTotal = $linesTotal;
            } elseif ($taxMode === 'PLUS_TAX') {
                $globalSubtotal = $linesTotal;
                $globalTax = $linesTotal * 0.18;
                $globalTotal = $linesTotal + $globalTax;
            }

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
                'currency_code' => $validated['currency_code'],
                'exchange_rate' => $validated['currency_code'] === 'USD' ? $validated['exchange_rate'] : 1,
                'subtotal_amount' => round($globalSubtotal, 2),
                'tax_amount' => round($globalTax, 2),
                'total_amount' => round($globalTotal, 2),
                'status' => 'DRAFT',
                'notes' => $validated['notes'] ?? null,
                'document_file_path' => $request->hasFile('document_file') ? $request->file('document_file')->store('purchases', 'public') : null,
                'created_by' => Auth::id(),
            ]);

            foreach ($validated['lines'] as $lineData) {
                $baseInput = $lineData['quantity'] * $lineData['unit_cost'];

                $lineSubtotal = $baseInput;
                $lineTax = 0;
                $lineFinalTotal = $baseInput;

                if ($taxMode === 'INCLUDED') {
                    $lineSubtotal = $baseInput / 1.18;
                    $lineTax = $baseInput - $lineSubtotal;
                    $lineFinalTotal = $baseInput;
                } elseif ($taxMode === 'PLUS_TAX') {
                    $lineSubtotal = $baseInput;
                    $lineTax = $baseInput * 0.18;
                    $lineFinalTotal = $baseInput + $lineTax;
                }

                PurchaseLine::create([
                    'uuid' => (string) Str::uuid(),
                    'purchase_id' => $purchase->id,
                    'product_id' => $lineData['product_id'],
                    'ordered_quantity' => $lineData['quantity'],
                    'unit_cost_original' => $lineData['unit_cost'],
                    'unit_cost_base' => $lineData['unit_cost'], // assuming same currency
                    'line_subtotal' => round($lineSubtotal, 2),
                    'tax_amount' => round($lineTax, 2),
                    'line_total' => round($lineFinalTotal, 2),
                    'received_quantity' => 0,
                ]);
            }

            // Direct confirmation option
            if ($request->input('action') === 'CONFIRM') {
                $purchase->update([
                    'status' => 'CONFIRMED',
                    'confirmed_at' => now(),
                    'approved_by' => Auth::id(),
                ]);

                foreach ($purchase->lines as $line) {
                    $line->update([
                        'received_quantity' => $line->ordered_quantity,
                    ]);

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

                    $kardexService->recordEntry([
                        'product_id' => $line->product_id,
                        'branch_id' => $purchase->branch_id,
                        'quantity' => (int) $line->received_quantity,
                        'unit_cost' => $line->unit_cost_base,
                        'operation_type' => 'COMPRA',
                        'reference' => 'COMPRA: '.$purchase->purchase_number,
                    ]);
                }
            }

            DB::commit();

            $msg = $request->input('action') === 'CONFIRM'
                ? 'Compra registrada y confirmada en Kardex exitosamente.'
                : 'Compra en borrador creada exitosamente.';

            return redirect()->route('purchases.show', $purchase->id)->with('success', $msg);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function show(Purchase $purchase)
    {
        $purchase->load(['supplier', 'lines.product.brand', 'lines.product.unit', 'creator', 'approver', 'branch']);

        return Inertia::render('purchases/show', [
            'purchase' => $purchase,
        ]);
    }

    public function edit(Purchase $purchase)
    {
        if ($purchase->status !== 'DRAFT') {
            return redirect()->route('purchases.index')->with('error', 'Solo se pueden editar compras en estado borrador.');
        }

        $purchase->load(['lines.product.brand', 'lines.product.unit', 'branch']);
        $suppliers = Supplier::where('company_id', Auth::user()->company_id)->where('status', 'ACTIVE')->orderBy('legal_name')->get();

        return Inertia::render('purchases/edit', [
            'purchase' => $purchase,
            'suppliers' => $suppliers,
        ]);
    }

    public function update(Request $request, Purchase $purchase, KardexService $kardexService)
    {
        if ($purchase->status !== 'DRAFT') {
            return redirect()->back()->with('error', 'Solo se pueden editar compras en estado borrador.');
        }

        $validated = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'supplier_document_type' => ['required', 'string'],
            'supplier_document_series' => ['nullable', 'string', 'max:10'],
            'supplier_document_number' => ['nullable', 'string', 'max:20'],
            'document_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:1'],
            'lines.*.unit_cost' => ['required', 'numeric', 'min:0'],
            'tax_mode' => ['required', 'string', 'in:INCLUDED,PLUS_TAX,EXEMPT'],
            'currency_code' => ['required', 'string', 'in:PEN,USD'],
            'exchange_rate' => ['required_if:currency_code,USD', 'numeric', 'min:0.01'],
            'document_file' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'action' => ['nullable', 'string', 'in:DRAFT,CONFIRM'],
        ]);

        $companyId = Auth::user()->company_id;

        // Check document uniqueness if changed
        if ($validated['supplier_document_type'] && $validated['supplier_document_series'] && $validated['supplier_document_number']) {
            $exists = Purchase::where('company_id', $companyId)
                ->where('supplier_id', $validated['supplier_id'])
                ->where('supplier_document_type', $validated['supplier_document_type'])
                ->where('supplier_document_series', $validated['supplier_document_series'])
                ->where('supplier_document_number', $validated['supplier_document_number'])
                ->where('id', '!=', $purchase->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'supplier_document_number' => 'Ya existe una compra con este comprobante para el proveedor seleccionado.',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $request, $purchase, $kardexService) {
            $linesTotal = 0;
            $taxMode = $validated['tax_mode'];

            $purchase->lines()->delete();

            foreach ($validated['lines'] as $lineData) {
                $lineSubtotal = $lineData['quantity'] * $lineData['unit_cost'];

                $lineTax = 0;
                $lineFinalTotal = 0;

                if ($taxMode === 'INCLUDED') {
                    $lineFinalTotal = $lineSubtotal;
                    $lineSubtotal = $lineFinalTotal / 1.18;
                    $lineTax = $lineFinalTotal - $lineSubtotal;
                } elseif ($taxMode === 'PLUS_TAX') {
                    $lineTax = $lineSubtotal * 0.18;
                    $lineFinalTotal = $lineSubtotal + $lineTax;
                } else {
                    $lineFinalTotal = $lineSubtotal;
                }

                $linesTotal += $lineFinalTotal;

                $purchase->lines()->create([
                    'uuid' => (string) Str::uuid(),
                    'product_id' => $lineData['product_id'],
                    'ordered_quantity' => $lineData['quantity'],
                    'unit_cost_original' => $lineData['unit_cost'],
                    'unit_cost_base' => $lineData['unit_cost'],
                    'line_subtotal' => round($lineSubtotal, 2),
                    'tax_amount' => round($lineTax, 2),
                    'line_total' => round($lineFinalTotal, 2),
                    'received_quantity' => 0,
                ]);
            }

            $globalSubtotal = 0;
            $globalTax = 0;
            $globalTotal = 0;

            if ($taxMode === 'INCLUDED') {
                $globalTotal = $linesTotal;
                $globalSubtotal = $globalTotal / 1.18;
                $globalTax = $globalTotal - $globalSubtotal;
            } elseif ($taxMode === 'PLUS_TAX') {
                $globalSubtotal = $purchase->lines()->sum('line_subtotal');
                $globalTax = $purchase->lines()->sum('tax_amount');
                $globalTotal = $globalSubtotal + $globalTax;
            } else {
                $globalSubtotal = $linesTotal;
                $globalTotal = $linesTotal;
            }

            $updateData = [
                'supplier_id' => $validated['supplier_id'],
                'supplier_document_type' => $validated['supplier_document_type'],
                'supplier_document_series' => $validated['supplier_document_series'] ?? null,
                'supplier_document_number' => $validated['supplier_document_number'] ?? null,
                'document_date' => $validated['document_date'],
                'currency_code' => $validated['currency_code'],
                'exchange_rate' => $validated['currency_code'] === 'USD' ? $validated['exchange_rate'] : 1,
                'subtotal_amount' => round($globalSubtotal, 2),
                'tax_amount' => round($globalTax, 2),
                'total_amount' => round($globalTotal, 2),
                'notes' => $validated['notes'] ?? null,
            ];

            if ($request->hasFile('document_file')) {
                $updateData['document_file_path'] = $request->file('document_file')->store('purchases', 'public');
            }

            $purchase->update($updateData);

            if ($request->input('action') === 'CONFIRM') {
                $purchase->update([
                    'status' => 'CONFIRMED',
                    'confirmed_at' => now(),
                    'approved_by' => Auth::id(),
                ]);

                foreach ($purchase->lines as $line) {
                    $line->update([
                        'received_quantity' => $line->ordered_quantity,
                    ]);

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

                    $kardexService->recordEntry([
                        'product_id' => $line->product_id,
                        'branch_id' => $purchase->branch_id,
                        'quantity' => (int) $line->received_quantity,
                        'unit_cost' => $line->unit_cost_base,
                        'operation_type' => 'COMPRA',
                        'reference' => 'COMPRA: '.$purchase->purchase_number,
                    ]);
                }
            }
        });

        $msg = $request->input('action') === 'CONFIRM'
            ? 'Compra actualizada y confirmada en inventario Kardex exitosamente.'
            : 'Compra actualizada exitosamente.';

        return redirect()->route('purchases.show', $purchase)->with('success', $msg);
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
