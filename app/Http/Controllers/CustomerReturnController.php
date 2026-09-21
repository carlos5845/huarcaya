<?php

namespace App\Http\Controllers;

use App\Models\CustomerReturn;
use App\Models\CustomerReturnLine;
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
        $branchId = Auth::user()->default_branch_id;
        $returns = CustomerReturn::with(['customer', 'sale'])
            ->where('branch_id', $branchId)
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return Inertia::render('customer-returns/index', [
            'returns' => $returns,
        ]);
    }

    public function create(Request $request)
    {
        $branchId = Auth::user()->default_branch_id;
        $saleId = $request->query('sale_id');

        $sale = null;
        if ($saleId) {
            $sale = Sale::with(['customer', 'lines.product'])->where('id', $saleId)->where('branch_id', $branchId)->firstOrFail();
        }

        return Inertia::render('customer-returns/create', [
            'sale' => $sale,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sale_id' => ['required', 'exists:sales,id'],
            'operation_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.sale_line_id' => ['required', 'exists:sale_lines,id'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $sale = Sale::findOrFail($validated['sale_id']);

        DB::beginTransaction();
        try {
            $returnNumber = 'NC'.date('Ymd').'-'.strtoupper(Str::random(4));

            $subtotal = 0;
            foreach ($validated['lines'] as $line) {
                $subtotal += ($line['quantity'] * $line['unit_price']);
            }
            $total = $subtotal; // Simplify taxes for now, or apply same tax_mode

            $customerReturn = CustomerReturn::create([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $sale->branch_id,
                'customer_id' => $sale->customer_id,
                'sale_id' => $sale->id,
                'return_number' => $returnNumber,
                'operation_date' => $validated['operation_date'],
                'return_type' => 'PARTIAL', // Could be TOTAL if all items
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

            DB::commit();

            return redirect()->route('customer-returns.show', $customerReturn->id)
                ->with('success', 'Nota de devolucin creada en borrador.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al crear devolucin: '.$e->getMessage());
        }
    }

    public function show(CustomerReturn $customerReturn)
    {
        $customerReturn->load(['customer', 'sale', 'lines.product', 'lines.saleLine']);

        return Inertia::render('customer-returns/show', [
            'customerReturn' => $customerReturn,
        ]);
    }

    public function confirm(CustomerReturn $customerReturn, KardexService $kardexService)
    {
        if ($customerReturn->status !== 'DRAFT') {
            return back()->with('error', 'La devolucin ya fue procesada.');
        }

        DB::beginTransaction();
        try {
            $customerReturn->update([
                'status' => 'CONFIRMED',
                'confirmed_by' => Auth::id(),
                'confirmed_at' => now(),
            ]);

            // 1. Devolver inventario al Kardex
            $movement = InventoryMovement::create([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $customerReturn->branch_id,
                'movement_type' => 'IN', // Re-entry
                'operation_date' => $customerReturn->operation_date,
                'reference_type' => CustomerReturn::class,
                'reference_id' => $customerReturn->id,
                'notes' => 'Devolucin de Venta '.$customerReturn->return_number,
                'created_by' => Auth::id(),
            ]);

            foreach ($customerReturn->lines as $line) {
                $product = $line->product;
                if ($product->product_type === 'STANDARD') {
                    $movLine = InventoryMovementLine::create([
                        'uuid' => (string) Str::uuid(),
                        'inventory_movement_id' => $movement->id,
                        'product_id' => $product->id,
                        'direction' => 'IN',
                        'quantity' => $line->quantity,
                        'unit_cost' => $line->saleLine->unit_cost_base ?? 0, // Approx
                        'total_cost' => $line->quantity * ($line->saleLine->unit_cost_base ?? 0),
                    ]);

                    $kardexService->recordEntry([
                        'uuid' => (string) Str::uuid(),
                        'branch_id' => $customerReturn->branch_id,
                        'product_id' => $product->id,
                        'inventory_movement_line_id' => $movLine->id,
                        'sequence_number' => 1,
                        'user_id' => Auth::id(),
                        'operation_date' => $customerReturn->operation_date,
                        'operation_type' => 'DEVOLUCION_VENTA',
                        'quantity' => $line->quantity,
                        'unit_cost' => $line->saleLine->unit_cost_base ?? 0,
                    ]);

                    // Increment Lot quantity if needed (simplified for now)
                    $lot = Lot::where('branch_id', $customerReturn->branch_id)
                        ->where('product_id', $product->id)
                        ->first();
                    if ($lot) {
                        $lot->increment('current_quantity', $line->quantity);
                    }
                }
            }

            // 2. Anular Saldos de Cuentas por Cobrar
            $receivable = Receivable::where('sale_id', $customerReturn->sale_id)->first();
            if ($receivable && $receivable->status === 'ACTIVE') {
                $newBalance = max(0, $receivable->balance_amount - $customerReturn->total_amount);
                $receivable->update([
                    'balance_amount' => $newBalance,
                    'status' => $newBalance <= 0 ? 'PAID' : 'ACTIVE',
                ]);

                // Tracing the adjustment in notes or a specific adjustment table
                $receivable->notes = $receivable->notes.'
Amortizado por devolucin '.$customerReturn->return_number.' ('.$customerReturn->total_amount.')';
                $receivable->save();
            }

            DB::commit();

            return back()->with('success', 'Devolucin confirmada e inventario restaurado.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error: '.$e->getMessage());
        }
    }
}
