<?php

namespace App\Http\Controllers;

use App\Models\CustomerReturn;
use App\Models\CustomerReturnLine;
use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\InventoryMovementLine;
use App\Models\Lot;
use App\Models\LotAllocation;
use App\Models\PaymentMethod;
use App\Models\Receivable;
use App\Models\Refund;
use App\Models\RefundMethodLine;
use App\Models\Sale;
use App\Models\Setting;
use App\Services\CreditNoteElectronicService;
use App\Services\KardexService;
use Carbon\Carbon;
use Exception;
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

        $baseQuery = CustomerReturn::query()
            ->when(! $isSuperAdmin && $user->default_branch_id, function ($q) use ($user) {
                $q->where('branch_id', $user->default_branch_id);
            });

        $totalReturns = (clone $baseQuery)->count();
        $totalAmountPEN = (float) (clone $baseQuery)->where('status', 'CONFIRMED')->sum('total_amount');
        $confirmedCount = (clone $baseQuery)->where('status', 'CONFIRMED')->count();
        $draftCount = (clone $baseQuery)->where('status', 'DRAFT')->count();

        $metrics = [
            'total_returns' => $totalReturns,
            'total_amount_pen' => $totalAmountPEN,
            'confirmed_count' => $confirmedCount,
            'draft_count' => $draftCount,
        ];

        $returns = (clone $baseQuery)
            ->with(['customer', 'sale', 'branch'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return Inertia::render('customer-returns/index', [
            'returns' => $returns,
            'metrics' => $metrics,
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $branchId = $user->default_branch_id;
        $saleId = $request->query('sale_id');
        $search = $request->query('search');

        $maxDaysSetting = Setting::where('key', 'sales.return_max_days')->first();
        $maxReturnDays = $maxDaysSetting ? (int) $maxDaysSetting->default_value : 15;

        $sale = null;
        $deadlineInfo = null;
        $financialInfo = null;

        if ($saleId) {
            $sale = Sale::with(['customer', 'lines.product', 'receivable'])
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

            // Fase 4: Verificar plazo máximo desde emisión de la venta
            $saleDate = Carbon::parse($sale->operation_date)->startOfDay();
            $daysElapsed = (int) $saleDate->diffInDays(now()->startOfDay());
            $isExpired = $daysElapsed > $maxReturnDays;

            $deadlineInfo = [
                'max_days' => $maxReturnDays,
                'days_elapsed' => $daysElapsed,
                'is_expired' => $isExpired,
                'can_override' => $isSuperAdmin || $user->hasPermissionTo('manage_users') || $user->hasPermissionTo('view_reports'),
            ];

            // Fase 2: Estado financiero de la venta
            $receivable = $sale->receivable;
            $pendingBalance = ($receivable && $receivable->status === 'ACTIVE') ? (float) $receivable->balance_amount : 0.0;

            $financialInfo = [
                'payment_type' => $sale->payment_type,
                'payment_status' => $sale->payment_status,
                'pending_debt_balance' => round($pendingBalance, 2),
                'paid_amount' => round(max(0, (float) $sale->total_amount - $pendingBalance), 2),
                'default_payment_method_id' => $sale->payment_method_id,
            ];
        }

        // Si no hay venta seleccionada, cargar ventas confirmadas para el selector de venta
        $recentSales = [];
        if (! $sale) {
            $recentSales = Sale::with('customer')
                ->where('status', 'CONFIRMED')
                ->when($branchId && ! $isSuperAdmin, fn ($q) => $q->where('branch_id', $branchId))
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

        $paymentMethods = PaymentMethod::where('company_id', $user->company_id)
            ->where('is_active', true)
            ->orderBy('id')
            ->get(['id', 'name', 'code', 'is_cash']);

        return Inertia::render('customer-returns/create', [
            'sale' => $sale,
            'recentSales' => $recentSales,
            'search' => $search ?? '',
            'deadlineInfo' => $deadlineInfo,
            'financialInfo' => $financialInfo,
            'paymentMethods' => $paymentMethods,
        ]);
    }

    public function store(Request $request, KardexService $kardexService)
    {
        $validated = $request->validate([
            'sale_id' => ['required', 'exists:sales,id'],
            'operation_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'confirm_now' => ['nullable', 'boolean'],
            'settlement_type' => ['nullable', 'string', 'in:RECEIVABLE_OFFSET,CASH_REFUND,STORE_CREDIT'],
            'refund_payment_method_id' => ['nullable', 'exists:payment_methods,id'],
            'sunat_credit_note_type' => ['nullable', 'string', 'in:01,06,07'],
            'override_deadline' => ['nullable', 'boolean'],
            'override_deadline_reason' => ['nullable', 'string', 'max:500'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.sale_line_id' => ['required', 'exists:sale_lines,id'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.condition' => ['nullable', 'string', 'in:GOOD,DAMAGED'],
            'lines.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $sale = Sale::with(['lines', 'receivable'])->findOrFail($validated['sale_id']);

        // Fase 4: Validar política de plazo máximo
        $maxDaysSetting = Setting::where('key', 'sales.return_max_days')->first();
        $maxReturnDays = $maxDaysSetting ? (int) $maxDaysSetting->default_value : 15;
        $saleDate = Carbon::parse($sale->operation_date)->startOfDay();
        $daysElapsed = (int) $saleDate->diffInDays(now()->startOfDay());

        $authorizedBy = null;
        $overrideReason = null;

        if ($daysElapsed > $maxReturnDays) {
            if (! $request->boolean('override_deadline') || empty(trim((string) $request->input('override_deadline_reason')))) {
                return back()->with('error', "El plazo de devolución ha vencido ({$daysElapsed} días transcurridos, máximo permitido: {$maxReturnDays} días). Se requiere autorización de supervisor y motivo justificado.");
            }
            $authorizedBy = $user->id;
            $overrideReason = trim((string) $request->input('override_deadline_reason'));
        }

        // Validar que no se sobrepase la cantidad retornable
        $existingReturnLines = CustomerReturnLine::whereHas('customerReturn', function ($q) use ($sale) {
            $q->where('sale_id', $sale->id)->where('status', '!=', 'CANCELLED');
        })->get();

        $returnedBySaleLine = [];
        foreach ($existingReturnLines as $retLine) {
            $returnedBySaleLine[$retLine->sale_line_id] = ($returnedBySaleLine[$retLine->sale_line_id] ?? 0) + (float) $retLine->quantity;
        }

        $grossSum = 0;
        $returningBySaleLine = [];
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
            $grossSum += ((float) $lineData['quantity'] * (float) $lineData['unit_price']);
            $returningBySaleLine[$saleLine->id] = ($returningBySaleLine[$saleLine->id] ?? 0) + (float) $lineData['quantity'];
        }

        // Determinar si la devolución cubre el 100% de la venta original (TOTAL vs PARTIAL)
        $isTotalReturn = $existingReturnLines->isEmpty();
        if ($isTotalReturn) {
            foreach ($sale->lines as $sLine) {
                $returningQty = $returningBySaleLine[$sLine->id] ?? 0.0;
                if (abs((float) $sLine->quantity - $returningQty) > 0.0001) {
                    $isTotalReturn = false;
                    break;
                }
            }
        }
        $returnType = $isTotalReturn ? 'TOTAL' : 'PARTIAL';

        $total = round($grossSum, 2);
        $hasTax = (float) $sale->tax_amount > 0;
        $subtotal = $hasTax ? round($total / 1.18, 2) : $total;
        $taxAmount = $hasTax ? round($total - $subtotal, 2) : 0.0;

        // Fase 5: Datos preliminares de Comprobante Fiscal vs Documento Interno
        $isFiscalSale = in_array($sale->sale_type, ['FACTURA', 'BOLETA'], true);
        $sunatCreditNoteType = null;
        if ($isFiscalSale) {
            $sunatCreditNoteType = $returnType === 'PARTIAL'
                ? '07'
                : (in_array($validated['sunat_credit_note_type'] ?? null, ['01', '06', '07'], true)
                    ? $validated['sunat_credit_note_type']
                    : '06');
        }

        // Fase 2: Determinar modalidad de liquidación financiera
        $receivable = $sale->receivable;
        $pendingDebt = ($receivable && $receivable->status === 'ACTIVE') ? (float) $receivable->balance_amount : 0.0;
        $excessOverDebt = max(0.0, $total - $pendingDebt);

        $settlementType = $validated['settlement_type'] ?? null;
        if (! $settlementType) {
            // Si hay deuda que cubre toda la devolución, por defecto es compensación de deuda; si no, egreso de caja
            $settlementType = ($excessOverDebt < 0.01 && $pendingDebt > 0) ? 'RECEIVABLE_OFFSET' : 'CASH_REFUND';
        }

        $refundPaymentMethodId = $validated['refund_payment_method_id'] ?? $sale->payment_method_id;
        if (! $refundPaymentMethodId && $settlementType === 'CASH_REFUND') {
            $defaultCashMethod = PaymentMethod::where('company_id', $user->company_id)
                ->where('is_active', true)
                ->orderByDesc('is_cash')
                ->first();
            $refundPaymentMethodId = $defaultCashMethod?->id;
        }

        DB::beginTransaction();
        try {
            $returnNumber = 'NC'.date('Ymd').'-'.strtoupper(Str::random(4));

            $customerReturn = CustomerReturn::create([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $sale->branch_id,
                'customer_id' => $sale->customer_id,
                'sale_id' => $sale->id,
                'return_number' => $returnNumber,
                'operation_date' => $validated['operation_date'],
                'return_type' => $returnType,
                'settlement_type' => $settlementType,
                'refund_payment_method_id' => $refundPaymentMethodId,
                'currency_code' => $sale->currency_code,
                'exchange_rate' => $sale->exchange_rate,
                'subtotal_amount' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $total,
                'refunded_amount' => 0,
                'credit_applied_amount' => 0,
                'status' => 'DRAFT',
                'is_electronic_invoiced' => $isFiscalSale,
                'sunat_credit_note_type' => $sunatCreditNoteType,
                'referenced_document_type' => $isFiscalSale ? ($sale->sale_type === 'FACTURA' ? '01' : '03') : '00',
                'referenced_document_series' => $sale->external_document_series ?: ($isFiscalSale ? ($sale->sale_type === 'FACTURA' ? 'F001' : 'B001') : 'NV01'),
                'referenced_document_number' => $sale->external_document_number ?: $sale->sale_number,
                'electronic_status' => 'NOT_APPLICABLE',
                'notes' => $validated['notes'] ?? null,
                'override_deadline_reason' => $overrideReason,
                'created_by' => Auth::id(),
                'authorized_by' => $authorizedBy,
            ]);

            foreach ($validated['lines'] as $line) {
                CustomerReturnLine::create([
                    'uuid' => (string) Str::uuid(),
                    'customer_return_id' => $customerReturn->id,
                    'sale_line_id' => $line['sale_line_id'],
                    'product_id' => $line['product_id'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'line_total' => $line['quantity'] * $line['unit_price'],
                    'condition' => $line['condition'] ?? 'GOOD',
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            if ($request->boolean('confirm_now')) {
                $this->processReturnConfirmation($customerReturn, $kardexService);
                DB::commit();

                return redirect()->route('customer-returns.show', $customerReturn->id)
                    ->with('success', 'Devolución confirmada, lotes y cuadre financiero procesados exitosamente.');
            }

            DB::commit();

            return redirect()->route('customer-returns.show', $customerReturn->id)
                ->with('success', 'Nota de devolución creada en borrador.');
        } catch (Exception $e) {
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
            'authorizedBy',
            'cancelledBy',
            'refundPaymentMethod',
            'refunds.methodLines.method',
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

            return back()->with('success', 'Devolución confirmada e inventario/cuadre financiero procesado.');
        } catch (Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error: '.$e->getMessage());
        }
    }

    /**
     * Fase 4: Anulación controlada de devoluciones (ejecuta la transacción inversa).
     */
    public function cancel(Request $request, CustomerReturn $customerReturn, KardexService $kardexService)
    {
        $validated = $request->validate([
            'cancellation_reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        if ($customerReturn->status === 'CANCELLED') {
            return back()->with('error', 'Esta devolución ya se encuentra anulada.');
        }

        DB::beginTransaction();
        try {
            if ($customerReturn->status === 'CONFIRMED') {
                $this->processReturnCancellation($customerReturn, $kardexService, $validated['cancellation_reason']);
            } else {
                // Si estaba en DRAFT, solo cambia de estado sin tocar Kardex ni saldos
                $customerReturn->update([
                    'status' => 'CANCELLED',
                    'cancelled_by' => Auth::id(),
                    'cancelled_at' => now(),
                    'cancellation_reason' => $validated['cancellation_reason'],
                ]);
            }

            DB::commit();

            return back()->with('success', 'Devolución anulada exitosamente y movimientos revertidos.');
        } catch (Exception $e) {
            DB::rollBack();

            return back()->with('error', 'No se pudo anular la devolución: '.$e->getMessage());
        }
    }

    /**
     * Procesa la confirmación de una devolución:
     * - Fase 1: Restaura el lote exacto de origen o crea un lote exclusivo LOT-DEV (nunca infla compras recientes).
     * - Fase 2: Liquida cuentas por cobrar, genera reembolso de caja (Refund) o acredita saldo a favor del cliente.
     * - Fase 3: Separa productos en buen estado (GOOD) de dañados/defectuosos (DAMAGED -> stock de cuarentena).
     */
    private function processReturnConfirmation(CustomerReturn $customerReturn, KardexService $kardexService): void
    {
        $customerReturn->loadMissing(['lines.product', 'lines.saleLine', 'customer', 'sale']);

        // 1. Movimiento de Inventario de Entrada
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
            if (! $product || $product->product_type === 'KIT_COMPONENTES') {
                continue;
            }

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

            $condition = $line->condition ?: 'GOOD';

            $movLine = InventoryMovementLine::create([
                'uuid' => (string) Str::uuid(),
                'inventory_movement_id' => $movement->id,
                'product_id' => $product->id,
                'sale_line_id' => $line->sale_line_id,
                'direction' => 'IN',
                'quantity' => $line->quantity,
                'unit_cost' => $unitCost,
                'total_cost' => (float) $line->quantity * $unitCost,
            ]);

            if ($condition === 'DAMAGED') {
                // FASE 3: Ítem Dañado / Defectuoso -> Ingresa a Cuarentena / Merma (NO comercializable)
                $inventory = Inventory::where('branch_id', $customerReturn->branch_id)
                    ->where('product_id', $product->id)
                    ->lockForUpdate()
                    ->first();

                if (! $inventory) {
                    $inventory = Inventory::create([
                        'uuid' => (string) Str::uuid(),
                        'branch_id' => $customerReturn->branch_id,
                        'product_id' => $product->id,
                        'physical_quantity' => 0,
                        'available_quantity' => 0,
                        'damaged_quantity' => 0,
                        'average_cost' => $unitCost,
                    ]);
                }

                $inventory->damaged_quantity = (float) $inventory->damaged_quantity + (float) $line->quantity;
                $inventory->save();

                // Crear lote segregado de merma / dañado con status DAMAGED (ignorado por ventas)
                $damagedLot = Lot::create([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $customerReturn->branch_id,
                    'product_id' => $product->id,
                    'lot_number' => 'LOT-MERMA-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                    'original_quantity' => $line->quantity,
                    'current_quantity' => $line->quantity,
                    'unit_cost' => $unitCost,
                    'status' => 'DAMAGED',
                ]);

                LotAllocation::create([
                    'uuid' => (string) Str::uuid(),
                    'inventory_movement_line_id' => $movLine->id,
                    'lot_id' => $damagedLot->id,
                    'quantity' => $line->quantity,
                ]);
            } else {
                // FASE 1 y 3: Ítem en Buen Estado (GOOD) -> Reingresa al stock comercializable y Kardex
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

                // FASE 1: Trazabilidad estricta al lote de origen (o lote exclusivo de devolución)
                $this->restoreOriginLotsOrCreateReturnLot(
                    $customerReturn,
                    $line,
                    $movLine,
                    $unitCost
                );
            }
        }

        // 2. FASE 2: Cuadre Financiero (Cuentas por cobrar, Egreso de caja o Saldo a favor)
        $remainingToSettle = round((float) $customerReturn->total_amount, 2);
        $creditApplied = 0.0;
        $refundedAmount = 0.0;

        $receivable = Receivable::where('sale_id', $customerReturn->sale_id)->first();
        if ($receivable && $receivable->status === 'ACTIVE' && (float) $receivable->balance_amount > 0) {
            $currentDebt = round((float) $receivable->balance_amount, 2);
            $offsetAmount = min($currentDebt, $remainingToSettle);

            if ($offsetAmount > 0) {
                $newBalance = round($currentDebt - $offsetAmount, 2);
                $isPaid = $newBalance < 0.01;

                $receivable->update([
                    'balance_amount' => $isPaid ? 0.00 : $newBalance,
                    'status' => $isPaid ? 'PAID' : 'ACTIVE',
                    'notes' => trim(($receivable->notes ?? '')."\n".'Amortizado por devolución '.$customerReturn->return_number.' ('.number_format($offsetAmount, 2).')'),
                ]);

                if ($receivable->sale) {
                    $receivable->sale->update([
                        'payment_status' => $isPaid ? 'PAID' : 'PARTIAL',
                    ]);
                }

                $creditApplied = $offsetAmount;
                $remainingToSettle = round($remainingToSettle - $offsetAmount, 2);
            }
        }

        // Si queda saldo a devolver al cliente (venta al contado o pagada por encima del saldo pendiente)
        if ($remainingToSettle >= 0.01) {
            if ($customerReturn->settlement_type === 'STORE_CREDIT') {
                // Abonar al saldo a favor del cliente en tienda
                if ($customerReturn->customer) {
                    $customerReturn->customer->increment('store_credit_balance', $remainingToSettle);
                }
                $refundedAmount = $remainingToSettle;
            } else {
                // Egreso directo de caja (CASH_REFUND por defecto cuando hay monto cobrado a devolver)
                $customerReturn->settlement_type = 'CASH_REFUND';

                $paymentMethodId = $customerReturn->refund_payment_method_id
                    ?: $customerReturn->sale?->payment_method_id
                    ?: PaymentMethod::where('is_active', true)->orderByDesc('is_cash')->value('id');

                $refund = Refund::create([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $customerReturn->branch_id,
                    'customer_id' => $customerReturn->customer_id,
                    'customer_return_id' => $customerReturn->id,
                    'refund_number' => 'REF'.date('Ymd').'-'.strtoupper(Str::random(4)),
                    'operation_date' => $customerReturn->operation_date ?? now(),
                    'currency_code' => $customerReturn->currency_code,
                    'exchange_rate' => $customerReturn->exchange_rate,
                    'total_amount' => $remainingToSettle,
                    'status' => 'CONFIRMED',
                    'notes' => 'Egreso por devolución '.$customerReturn->return_number,
                    'created_by' => Auth::id(),
                ]);

                if ($paymentMethodId) {
                    RefundMethodLine::create([
                        'uuid' => (string) Str::uuid(),
                        'refund_id' => $refund->id,
                        'payment_method_id' => $paymentMethodId,
                        'amount' => $remainingToSettle,
                        'notes' => 'Reembolso de caja por '.$customerReturn->return_number,
                    ]);
                }

                $refundedAmount = $remainingToSettle;
            }
        }

        $customerReturn->update([
            'status' => 'CONFIRMED',
            'settlement_type' => $customerReturn->settlement_type,
            'credit_applied_amount' => $creditApplied,
            'refunded_amount' => $refundedAmount,
            'confirmed_by' => Auth::id(),
            'confirmed_at' => now(),
        ]);

        // 3. FASE 5: Emitir / Preparar Nota de Crédito Electrónica SUNAT (Catálogo 09) o Vale de Devolución Interno
        app(CreditNoteElectronicService::class)->generateFromReturn(
            $customerReturn,
            $customerReturn->sunat_credit_note_type
        );
    }

    /**
     * Fase 1: Restaura las unidades estrictamente al lote original del que salieron en la venta.
     * Si no hay registro del lote de origen o el lote fue eliminado, crea un lote exclusivo LOT-DEV.
     * Bajo ninguna circunstancia infla compras recientes ajenas a la venta.
     */
    private function restoreOriginLotsOrCreateReturnLot(
        CustomerReturn $customerReturn,
        CustomerReturnLine $returnLine,
        InventoryMovementLine $returnMovLine,
        float $unitCost
    ): void {
        $remainingToRestore = (float) $returnLine->quantity;

        // Buscar el movimiento de salida original de la venta
        $saleOutAllocations = collect();

        if ($customerReturn->sale_id) {
            $saleMovLineQuery = InventoryMovementLine::whereHas('movement', function ($q) use ($customerReturn) {
                $q->where('reference_type', Sale::class)
                    ->where('reference_id', $customerReturn->sale_id)
                    ->where('movement_type', 'OUT');
            })->where('product_id', $returnLine->product_id);

            // Si tiene vínculo exacto con sale_line_id, priorizarlo
            $exactLines = (clone $saleMovLineQuery)->where('sale_line_id', $returnLine->sale_line_id)->get();
            $targetMovLines = $exactLines->isNotEmpty() ? $exactLines : $saleMovLineQuery->get();

            if ($targetMovLines->isNotEmpty()) {
                $saleOutAllocations = LotAllocation::with('lot')
                    ->whereIn('inventory_movement_line_id', $targetMovLines->pluck('id'))
                    ->orderBy('id', 'desc')
                    ->get();
            }
        }

        // Calcular cuánto ya fue restaurado a cada lote en devoluciones anteriores de esta misma venta
        $alreadyRestoredByLot = [];
        if ($customerReturn->sale_id) {
            $prevReturnIds = CustomerReturn::where('sale_id', $customerReturn->sale_id)
                ->where('id', '!=', $customerReturn->id)
                ->where('status', 'CONFIRMED')
                ->pluck('id');

            if ($prevReturnIds->isNotEmpty()) {
                $prevReturnAllocations = LotAllocation::whereHas('movementLine', function ($q) use ($prevReturnIds, $returnLine) {
                    $q->where('product_id', $returnLine->product_id)
                        ->whereHas('movement', function ($mq) use ($prevReturnIds) {
                            $mq->where('reference_type', CustomerReturn::class)
                                ->whereIn('reference_id', $prevReturnIds)
                                ->where('movement_type', 'IN');
                        });
                })->get();

                foreach ($prevReturnAllocations as $prevAlloc) {
                    $alreadyRestoredByLot[$prevAlloc->lot_id] = ($alreadyRestoredByLot[$prevAlloc->lot_id] ?? 0) + (float) $prevAlloc->quantity;
                }
            }
        }

        // Reintegrar a los lotes de origen exactos
        foreach ($saleOutAllocations as $outAlloc) {
            if ($remainingToRestore <= 0.000001) {
                break;
            }

            $originLot = $outAlloc->lot;
            // No mezclar con lotes de regularización ficticios (LOT-REG-*)
            if (! $originLot || str_starts_with((string) $originLot->lot_number, 'LOT-REG-')) {
                continue;
            }

            $dispatchedFromThisLot = (float) $outAlloc->quantity;
            $alreadyRestored = $alreadyRestoredByLot[$originLot->id] ?? 0.0;
            $restorableToThisLot = max(0.0, $dispatchedFromThisLot - $alreadyRestored);

            if ($restorableToThisLot <= 0.000001) {
                continue;
            }

            $toRestore = min($remainingToRestore, $restorableToThisLot);

            $originLot->current_quantity = (float) $originLot->current_quantity + $toRestore;
            if ($originLot->status === 'DEPLETED' && $originLot->current_quantity > 0) {
                $originLot->status = 'ACTIVE';
            }
            $originLot->save();

            LotAllocation::create([
                'uuid' => (string) Str::uuid(),
                'inventory_movement_line_id' => $returnMovLine->id,
                'lot_id' => $originLot->id,
                'quantity' => $toRestore,
            ]);

            $alreadyRestoredByLot[$originLot->id] = $alreadyRestored + $toRestore;
            $remainingToRestore -= $toRestore;
        }

        // Si la venta no tenía registro de lote de origen (o quedó remanente), crear un lote exclusivo de devolución
        if ($remainingToRestore > 0.000001) {
            $returnLot = Lot::create([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $customerReturn->branch_id,
                'product_id' => $returnLine->product_id,
                'lot_number' => 'LOT-DEV-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                'original_quantity' => $remainingToRestore,
                'current_quantity' => $remainingToRestore,
                'unit_cost' => $unitCost,
                'status' => 'ACTIVE',
            ]);

            LotAllocation::create([
                'uuid' => (string) Str::uuid(),
                'inventory_movement_line_id' => $returnMovLine->id,
                'lot_id' => $returnLot->id,
                'quantity' => $remainingToRestore,
            ]);
        }
    }

    /**
     * Fase 4: Reversión transaccional completa al anular una devolución confirmada.
     */
    private function processReturnCancellation(
        CustomerReturn $customerReturn,
        KardexService $kardexService,
        string $reason
    ): void {
        $customerReturn->loadMissing(['lines.product', 'customer', 'sale', 'refunds']);

        // 1. Movimiento de salida por anulación de devolución
        $outMovement = InventoryMovement::create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $customerReturn->branch_id,
            'movement_type' => 'OUT',
            'operation_date' => now(),
            'reference_type' => CustomerReturn::class,
            'reference_id' => $customerReturn->id,
            'notes' => 'Anulación de Devolución '.$customerReturn->return_number.': '.$reason,
            'created_by' => Auth::id(),
        ]);

        // Localizar las asignaciones de lote creadas cuando se confirmó la devolución
        $inMovement = InventoryMovement::with('lines.lotAllocations.lot')
            ->where('reference_type', CustomerReturn::class)
            ->where('reference_id', $customerReturn->id)
            ->where('movement_type', 'IN')
            ->first();

        foreach ($customerReturn->lines as $line) {
            $product = $line->product;
            if (! $product || $product->product_type === 'KIT_COMPONENTES') {
                continue;
            }

            $condition = $line->condition ?: 'GOOD';

            if ($condition === 'DAMAGED') {
                // Revertir del stock en cuarentena / dañado
                $inventory = Inventory::where('branch_id', $customerReturn->branch_id)
                    ->where('product_id', $product->id)
                    ->lockForUpdate()
                    ->first();

                if ($inventory) {
                    $inventory->damaged_quantity = max(0, (float) $inventory->damaged_quantity - (float) $line->quantity);
                    $inventory->save();
                }
            } else {
                // Revertir del Kardex y del stock comercializable (valida que exista stock suficiente)
                $inventory = Inventory::where('branch_id', $customerReturn->branch_id)
                    ->where('product_id', $product->id)
                    ->first();
                $unitCost = $inventory ? (float) $inventory->average_cost : (float) $product->cost_price;

                $outMovLine = InventoryMovementLine::create([
                    'uuid' => (string) Str::uuid(),
                    'inventory_movement_id' => $outMovement->id,
                    'product_id' => $product->id,
                    'sale_line_id' => $line->sale_line_id,
                    'direction' => 'OUT',
                    'quantity' => $line->quantity,
                    'unit_cost' => $unitCost,
                    'total_cost' => (float) $line->quantity * $unitCost,
                ]);

                $kardexService->recordExit([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $customerReturn->branch_id,
                    'product_id' => $product->id,
                    'inventory_movement_line_id' => $outMovLine->id,
                    'user_id' => Auth::id(),
                    'operation_date' => now(),
                    'operation_type' => 'ANULACION_DEVOLUCION',
                    'reference' => 'ANULACIÓN: '.$customerReturn->return_number,
                    'quantity' => $line->quantity,
                ]);
            }

            // Descontar de los lotes exactos que habían sido incrementados o creados en esta devolución
            if ($inMovement) {
                $matchingInLines = $inMovement->lines->where('product_id', $product->id);
                $remainingToDeductLot = (float) $line->quantity;

                foreach ($matchingInLines as $inLine) {
                    foreach ($inLine->lotAllocations as $alloc) {
                        if ($remainingToDeductLot <= 0.000001) {
                            break;
                        }
                        $lot = $alloc->lot;
                        if ($lot) {
                            $deduct = min((float) $lot->current_quantity, (float) $alloc->quantity, $remainingToDeductLot);
                            $lot->current_quantity = max(0, (float) $lot->current_quantity - $deduct);
                            if ($lot->current_quantity <= 0.000001) {
                                $lot->current_quantity = 0;
                                $lot->status = 'DEPLETED';
                            }
                            $lot->save();
                            $remainingToDeductLot -= $deduct;
                        }
                    }
                }
            }
        }

        // 2. Revertir Cuadre Financiero
        $creditApplied = (float) $customerReturn->credit_applied_amount;
        if ($creditApplied > 0) {
            $receivable = Receivable::where('sale_id', $customerReturn->sale_id)->first();
            if ($receivable) {
                $restoredBalance = round((float) $receivable->balance_amount + $creditApplied, 2);
                $receivable->update([
                    'balance_amount' => $restoredBalance,
                    'status' => 'ACTIVE',
                    'notes' => trim(($receivable->notes ?? '')."\n".'Deuda restablecida por anulación de devolución '.$customerReturn->return_number.' (+'.number_format($creditApplied, 2).')'),
                ]);

                if ($receivable->sale) {
                    $paidPortion = (float) $receivable->original_amount - $restoredBalance;
                    $receivable->sale->update([
                        'payment_status' => $paidPortion > 0.01 ? 'PARTIAL' : 'UNPAID',
                    ]);
                }
            }
        }

        $refundedAmount = (float) $customerReturn->refunded_amount;
        if ($refundedAmount > 0) {
            if ($customerReturn->settlement_type === 'STORE_CREDIT' && $customerReturn->customer) {
                $currentCredit = (float) $customerReturn->customer->store_credit_balance;
                if ($currentCredit + 0.001 < $refundedAmount) {
                    throw new Exception('No se puede anular la devolución porque el cliente ya utilizó parte o la totalidad del saldo a favor otorgado.');
                }
                $customerReturn->customer->decrement('store_credit_balance', $refundedAmount);
            } else {
                // Anular los reembolsos de caja (Refund) asociados
                foreach ($customerReturn->refunds as $refund) {
                    $refund->update([
                        'status' => 'CANCELLED',
                        'cancelled_at' => now(),
                        'notes' => trim(($refund->notes ?? '').' | Anulado: '.$reason),
                    ]);
                }
            }
        }

        // 3. Marcar la devolución como CANCELLED
        $customerReturn->update([
            'status' => 'CANCELLED',
            'cancelled_by' => Auth::id(),
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);

        app(CreditNoteElectronicService::class)->markAsCancelled($customerReturn);
    }
}
