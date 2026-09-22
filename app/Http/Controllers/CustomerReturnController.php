<?php

namespace App\Http\Controllers;

use App\Models\CustomerReturn;
use App\Models\CustomerReturnLine;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\InventoryMovementLine;
use App\Models\Lot;
use App\Models\Receivable;
use App\Models\Sale;
use App\Services\KardexService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CustomerReturnController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');

        $returns = CustomerReturn::with(['customer', 'sale', 'branch'])
            ->when(! $isSuperAdmin && $user->default_branch_id, function ($q) use ($user) {
                $q->where('branch_id', $user->default_branch_id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return Inertia::render('customer-returns/index', [
            'returns' => $returns,
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $branchId = $user->default_branch_id;
        $saleId = $request->query('sale_id');
        $search = $request->query('search');

        $sale = null;
        if ($saleId) {
            $sale = Sale::with(['customer', 'lines.product'])
                ->findOrFail($saleId);

            // Calcular cantidades ya devueltas por cada línea de venta
            $existingReturnLines = CustomerReturnLine::whereHas('customerReturn', function ($q) use ($sale) {
                $q->where('sale_id', $sale->id)->where('status', '!=', 'CANCELLED');
            })->get();

            $returnedBySaleLine = [];
            foreach ($existingReturnLines as $retLine) {
                $returnedBySaleLine[$retLine->sale_line_id] = ($returnedBySaleLine[$retLine->sale_line_id] ?? 0) + (float) $retLine->quantity;
            }

            $hasAvailable = false;
            foreach ($sale->lines as $line) {
                $alreadyReturned = $returnedBySaleLine[$line->id] ?? 0;
                $line->already_returned_quantity = $alreadyReturned;
                $line->available_return_quantity = max(0, (float) $line->quantity - $alreadyReturned);
                if ($line->available_return_quantity > 0.0001) {
                    $hasAvailable = true;
                }
            }

            if (! $hasAvailable) {
                return redirect()->route('sales.show', $sale->id)
                    ->with('error', 'Esta venta ya no admite más devoluciones porque todos sus productos han sido devueltos.');
            }
        }

        // Si no hay venta seleccionada, cargar ventas confirmadas para el selector de venta
        $recentSales = [];
        if (! $sale) {
            $recentSales = Sale::with('customer')
                ->where('status', 'CONFIRMED')
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->when($search, function ($q, $search) {
                    $q->where(function ($sq) use ($search) {
                        $sq->whereLikeAccentInsensitive('sale_number', "%{$search}%")
                            ->orWhereLikeAccentInsensitive('external_document_number', "%{$search}%")
                            ->orWhereHas('customer', function ($cq) use ($search) {
                                $cq->whereLikeAccentInsensitive('legal_name', "%{$search}%")
                                    ->orWhere('document_number', 'like', "%{$search}%");
                            });
                    });
                })
                ->orderBy('operation_date', 'desc')
                ->limit(20)
                ->get();
        }

        return Inertia::render('customer-returns/create', [
            'sale' => $sale,
            'recentSales' => $recentSales,
            'search' => $search ?? '',
        ]);
    }

    public function store(Request $request, KardexService $kardexService)
    {
        $validated = $request->validate([
            'sale_id' => ['required', 'exists:sales,id'],
            'operation_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'confirm_now' => ['nullable', 'boolean'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.sale_line_id' => ['required', 'exists:sale_lines,id'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $sale = Sale::with('lines')->findOrFail($validated['sale_id']);

        // Validar que no se sobrepase la cantidad retornable
        $existingReturnLines = CustomerReturnLine::whereHas('customerReturn', function ($q) use ($sale) {
            $q->where('sale_id', $sale->id)->where('status', '!=', 'CANCELLED');
        })->get();

        $returnedBySaleLine = [];
        foreach ($existingReturnLines as $retLine) {
            $returnedBySaleLine[$retLine->sale_line_id] = ($returnedBySaleLine[$retLine->sale_line_id] ?? 0) + (float) $retLine->quantity;
        }

        foreach ($validated['lines'] as $lineData) {
            $saleLine = $sale->lines->firstWhere('id', $lineData['sale_line_id']);
            if (! $saleLine) {
                return back()->with('error', 'Línea de venta no encontrada.');
            }
            $alreadyReturned = $returnedBySaleLine[$saleLine->id] ?? 0;
            $available = (float) $saleLine->quantity - $alreadyReturned;
            if ((float) $lineData['quantity'] > ($available + 0.000001)) {
                $name = $saleLine->product_name_snapshot ?? 'Producto';

                return back()->with('error', "La cantidad a devolver de '{$name}' excede el saldo disponible ({$available}).");
            }
        }

        DB::beginTransaction();
        try {
            $returnNumber = 'NC'.date('Ymd').'-'.strtoupper(Str::random(4));

            $subtotal = 0;
            foreach ($validated['lines'] as $line) {
                $subtotal += ($line['quantity'] * $line['unit_price']);
            }
            $total = $subtotal;

            $customerReturn = CustomerReturn::create([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $sale->branch_id,
                'customer_id' => $sale->customer_id,
                'sale_id' => $sale->id,
                'return_number' => $returnNumber,
                'operation_date' => $validated['operation_date'],
                'return_type' => 'PARTIAL',
                'currency_code' => $sale->currency_code,
                'exchange_rate' => $sale->exchange_rate,
                'subtotal_amount' => $subtotal,
                'tax_amount' => 0,
                'total_amount' => $total,
                'status' => 'DRAFT',
                'notes' => $validated['notes'],
                'created_by' => Auth::id(),
            ]);

            foreach ($validated['lines'] as $line) {
                CustomerReturnLine::create([
                    'uuid' => (string) Str::uuid(),
                    'customer_return_id' => $customerReturn->id,
                    'sale_line_id' => $line['sale_line_id'],
                    'product_id' => $line['product_id'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'line_subtotal' => $line['quantity'] * $line['unit_price'],
                    'line_total' => $line['quantity'] * $line['unit_price'],
                ]);
            }

            if ($request->boolean('confirm_now')) {
                $this->processReturnConfirmation($customerReturn, $kardexService);
                DB::commit();

                return redirect()->route('customer-returns.show', $customerReturn->id)
                    ->with('success', 'Devolución confirmada e inventario restaurado exitosamente.');
            }

            DB::commit();

            return redirect()->route('customer-returns.show', $customerReturn->id)
                ->with('success', 'Nota de devolución creada en borrador.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al crear devolución: '.$e->getMessage());
        }
    }

    public function show(CustomerReturn $customerReturn)
    {
        $customerReturn->load([
            'customer',
            'sale',
            'lines.product.unit',
            'lines.saleLine',
            'creator',
            'confirmedBy',
            'branch',
        ]);

        return Inertia::render('customer-returns/show', [
            'customerReturn' => $customerReturn,
        ]);
    }

    public function confirm(CustomerReturn $customerReturn, KardexService $kardexService)
    {
        if ($customerReturn->status !== 'DRAFT') {
            return back()->with('error', 'La devolución ya fue procesada.');
        }

        DB::beginTransaction();
        try {
            $this->processReturnConfirmation($customerReturn, $kardexService);
            DB::commit();

            return back()->with('success', 'Devolución confirmada e inventario restaurado.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error: '.$e->getMessage());
        }
    }

    private function processReturnConfirmation(CustomerReturn $customerReturn, KardexService $kardexService): void
    {
        $customerReturn->loadMissing(['lines.product', 'lines.saleLine']);

        $customerReturn->update([
            'status' => 'CONFIRMED',
            'confirmed_by' => Auth::id(),
            'confirmed_at' => now(),
        ]);

        // 1. Devolver inventario al Kardex y restaurar lotes
        $movement = InventoryMovement::create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $customerReturn->branch_id,
            'movement_type' => 'IN',
            'operation_date' => $customerReturn->operation_date ?? now(),
            'reference_type' => CustomerReturn::class,
            'reference_id' => $customerReturn->id,
            'notes' => 'Devolución de Venta '.$customerReturn->return_number,
            'created_by' => Auth::id(),
        ]);

        foreach ($customerReturn->lines as $line) {
            $product = $line->product;
            if ($product && $product->product_type !== 'KIT_COMPONENTES') {
                $unitCost = (float) ($line->saleLine?->unit_cost_base ?? 0);
                if ($unitCost <= 0) {
                    $inv = Inventory::where('branch_id', $customerReturn->branch_id)
                        ->where('product_id', $product->id)
                        ->first();
                    $unitCost = $inv ? (float) $inv->average_cost : 0;
                }
                if ($unitCost <= 0) {
                    $unitCost = (float) $product->cost_price;
                }

                $movLine = InventoryMovementLine::create([
                    'uuid' => (string) Str::uuid(),
                    'inventory_movement_id' => $movement->id,
                    'product_id' => $product->id,
                    'direction' => 'IN',
                    'quantity' => $line->quantity,
                    'unit_cost' => $unitCost,
                    'total_cost' => $line->quantity * $unitCost,
                ]);

                $kardexService->recordEntry([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $customerReturn->branch_id,
                    'product_id' => $product->id,
                    'inventory_movement_line_id' => $movLine->id,
                    'user_id' => Auth::id(),
                    'operation_date' => $customerReturn->operation_date,
                    'operation_type' => 'DEVOLUCION_VENTA',
                    'reference' => 'DEVOLUCIÓN: '.$customerReturn->return_number,
                    'quantity' => $line->quantity,
                    'unit_cost' => $unitCost,
                ]);

                // Incrementar Lote activo existente o crear nuevo Lote
                $lot = Lot::where('branch_id', $customerReturn->branch_id)
                    ->where('product_id', $product->id)
                    ->where('status', 'ACTIVE')
                    ->orderBy('created_at', 'desc')
                    ->first();

                if ($lot) {
                    $lot->increment('current_quantity', $line->quantity);
                } else {
                    Lot::create([
                        'uuid' => (string) Str::uuid(),
                        'branch_id' => $customerReturn->branch_id,
                        'product_id' => $product->id,
                        'lot_number' => 'LOT-DEV-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                        'original_quantity' => $line->quantity,
                        'current_quantity' => $line->quantity,
                        'unit_cost' => $unitCost,
                        'status' => 'ACTIVE',
                    ]);
                }
            }
        }

        // 2. Anular o Amortizar Saldos de Cuentas por Cobrar
        $receivable = Receivable::where('sale_id', $customerReturn->sale_id)->first();
        if ($receivable && $receivable->status === 'ACTIVE') {
            $newBalance = max(0, $receivable->balance_amount - $customerReturn->total_amount);
            $receivable->update([
                'balance_amount' => $newBalance,
                'status' => $newBalance <= 0 ? 'PAID' : 'ACTIVE',
            ]);

            $receivable->notes = $receivable->notes."\n".'Amortizado por devolución '.$customerReturn->return_number.' ('.$customerReturn->total_amount.')';
            $receivable->save();
        }
    }
}
