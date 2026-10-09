<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryMovement;
use App\Models\InventoryMovementLine;
use App\Models\KardexEntry;
use App\Models\KitVersion;
use App\Models\Lot;
use App\Models\LotAllocation;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentMethodLine;
use App\Models\Product;
use App\Models\Receivable;
use App\Models\Sale;
use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class SaleConfirmationService
{
    public function __construct(
        public KardexService $kardexService
    ) {}

    /**
     * Executes the sale confirmation routine: validates stock, registers Kardex exit,
     * discharges FIFO lots, creates payment/receivable, and updates sale status.
     */
    public function confirm(Sale $sale, ?int $userId = null): void
    {
        $operatorId = $userId ?? Auth::id();
        $sale->load('lines');

        // Preparar items a deducir (descomponiendo kits si es necesario)
        $itemsToDeduct = [];
        $requiredQuantities = []; // Para validación agrupada

        foreach ($sale->lines as $line) {
            if ($line->product_type_snapshot === 'KIT_COMPONENTES') {
                $activeKitVersion = KitVersion::with('components')
                    ->where('product_id', $line->product_id)
                    ->where('status', 'ACTIVE')
                    ->first();

                if (! $activeKitVersion) {
                    throw new Exception("El producto '{$line->product_name_snapshot}' es un KIT pero no tiene una versión activa.");
                }
                if ($activeKitVersion->components->isEmpty()) {
                    throw new Exception("La versión activa del KIT '{$line->product_name_snapshot}' no tiene componentes configurados.");
                }

                foreach ($activeKitVersion->components as $component) {
                    $componentQty = (float) $line->quantity * (float) $component->quantity;
                    $itemsToDeduct[] = [
                        'product_id' => $component->product_id,
                        'quantity' => $componentQty,
                    ];
                    $requiredQuantities[$component->product_id] = ($requiredQuantities[$component->product_id] ?? 0) + $componentQty;
                }
            } else {
                $itemsToDeduct[] = [
                    'product_id' => $line->product_id,
                    'quantity' => (float) $line->quantity,
                ];
                $requiredQuantities[$line->product_id] = ($requiredQuantities[$line->product_id] ?? 0) + (float) $line->quantity;
            }
        }

        // 1. Validar disponibilidad global agrupada
        foreach ($requiredQuantities as $productId => $qty) {
            $inventory = Inventory::where('branch_id', $sale->branch_id)
                ->where('product_id', $productId)
                ->lockForUpdate()
                ->first();

            if (! $inventory || $inventory->physical_quantity < $qty) {
                $prodName = Product::find($productId)?->name ?? 'ID '.$productId;
                throw new Exception("Stock insuficiente para el producto '{$prodName}'. Solicitado: {$qty}. Disponible: ".($inventory->physical_quantity ?? 0));
            }
        }

        // 2. Crear Movimiento de Inventario
        $movement = InventoryMovement::create([
            'uuid' => (string) Str::uuid(),
            'branch_id' => $sale->branch_id,
            'movement_type' => 'OUT',
            'reference_type' => Sale::class,
            'reference_id' => $sale->id,
            'operation_date' => now(),
            'notes' => 'Salida por Venta '.$sale->sale_number,
            'created_by' => $operatorId,
        ]);

        // 3. Procesar las salidas (itemsToDeduct)
        foreach ($itemsToDeduct as $item) {
            // Obtener costo promedio vigente ANTES de la salida para costearla
            $inventory = Inventory::where('branch_id', $sale->branch_id)
                ->where('product_id', $item['product_id'])
                ->first();
            $unitCost = $inventory ? (float) $inventory->average_cost : 0;

            // Crear línea de movimiento
            $movementLine = InventoryMovementLine::create([
                'uuid' => (string) Str::uuid(),
                'inventory_movement_id' => $movement->id,
                'product_id' => $item['product_id'],
                'direction' => 'OUT',
                'quantity' => $item['quantity'],
                'unit_cost' => $unitCost,
                'total_cost' => $item['quantity'] * $unitCost,
            ]);

            // Registrar Salida en Kardex (descuenta stock global)
            $this->kardexService->recordExit([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $sale->branch_id,
                'product_id' => $item['product_id'],
                'inventory_movement_line_id' => $movementLine->id,
                'sequence_number' => KardexEntry::max('sequence_number') + 1,
                'user_id' => $operatorId,
                'operation_date' => now(),
                'operation_type' => 'VENTA',
                'reference' => 'Venta '.$sale->sale_number,
                'quantity' => $item['quantity'],
            ]);

            // 5. Descarga de Lotes (PEPS/FIFO)
            $remainingQuantityToDeduct = $item['quantity'];

            $lots = Lot::where('branch_id', $sale->branch_id)
                ->where('product_id', $item['product_id'])
                ->where('current_quantity', '>', 0)
                ->orderBy('created_at', 'asc')
                ->lockForUpdate()
                ->get();

            foreach ($lots as $lot) {
                if ($remainingQuantityToDeduct <= 0) {
                    break;
                }

                $availableInLot = (float) $lot->current_quantity;
                $toDeduct = min($availableInLot, $remainingQuantityToDeduct);

                // Actualizar Lote
                $lot->current_quantity = $availableInLot - $toDeduct;
                if ($lot->current_quantity <= 0.000001) {
                    $lot->current_quantity = 0;
                    $lot->status = 'DEPLETED';
                }
                $lot->save();

                // Registrar Asignación de Lote a este movimiento
                LotAllocation::create([
                    'uuid' => (string) Str::uuid(),
                    'inventory_movement_line_id' => $movementLine->id,
                    'lot_id' => $lot->id,
                    'quantity' => $toDeduct,
                ]);

                $remainingQuantityToDeduct -= $toDeduct;
            }

            if ($remainingQuantityToDeduct > 0.000001) {
                // Auto-recuperación: Crear lote de regularización para cubrir el remanente físico disponible
                $inventory = Inventory::where('branch_id', $sale->branch_id)
                    ->where('product_id', $item['product_id'])
                    ->first();

                $autoLot = Lot::create([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $sale->branch_id,
                    'product_id' => $item['product_id'],
                    'lot_number' => 'LOT-REG-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                    'original_quantity' => $remainingQuantityToDeduct,
                    'current_quantity' => 0,
                    'unit_cost' => $inventory ? (float) $inventory->average_cost : 0,
                    'status' => 'DEPLETED',
                ]);

                LotAllocation::create([
                    'uuid' => (string) Str::uuid(),
                    'inventory_movement_line_id' => $movementLine->id,
                    'lot_id' => $autoLot->id,
                    'quantity' => $remainingQuantityToDeduct,
                ]);

                $remainingQuantityToDeduct = 0;
            }
        }

        if ($sale->payment_type === 'CASH' || $sale->payment_type === 'CREDIT') {
            $isCash = $sale->payment_type === 'CASH';

            $totalAmount = round((float) $sale->total_amount, 2);
            $initialPayment = $isCash ? $totalAmount : round((float) ($sale->initial_payment_amount ?? 0), 2);
            $initialPayment = min($initialPayment, $totalAmount);

            $rawBalance = $totalAmount - $initialPayment;
            $isFullySettled = $rawBalance < 0.01;
            $balance = $isFullySettled ? 0.00 : round($rawBalance, 2);
            $status = $isFullySettled ? 'PAID' : 'ACTIVE';

            // Generar Cuentas por Cobrar (Receivable)
            $receivable = Receivable::create([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $sale->branch_id,
                'customer_id' => $sale->customer_id,
                'sale_id' => $sale->id,
                'reference_type' => Sale::class,
                'reference_id' => $sale->id,
                'issue_date' => $sale->operation_date,
                'due_date' => $sale->due_date ?? $sale->operation_date,
                'currency_code' => $sale->currency_code,
                'original_amount' => $totalAmount,
                'balance_amount' => $balance,
                'status' => $status,
                'notes' => $isCash ? 'Generado automáticamente por Venta al Contado' : 'Generado por Venta al Crédito',
                'created_by' => $operatorId,
            ]);

            if ($initialPayment > 0) {
                // Generar Pago (Payment)
                $payment = Payment::create([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $sale->branch_id,
                    'customer_id' => $sale->customer_id,
                    'payment_number' => 'P'.date('Ymd').'-'.strtoupper(Str::random(6)),
                    'operation_date' => now(),
                    'currency_code' => $sale->currency_code,
                    'exchange_rate' => $sale->exchange_rate,
                    'total_amount' => $initialPayment,
                    'status' => 'CONFIRMED',
                    'notes' => $isCash ? ('Pago por Venta al Contado '.$sale->sale_number) : ('Pago inicial por Venta al Crédito '.$sale->sale_number),
                    'created_by' => $operatorId,
                ]);

                // Asociar Método de Pago
                if ($sale->payment_method_id) {
                    PaymentMethodLine::create([
                        'uuid' => (string) Str::uuid(),
                        'payment_id' => $payment->id,
                        'payment_method_id' => $sale->payment_method_id,
                        'amount' => $initialPayment,
                    ]);
                }

                // Asignar Pago a la Cuenta por Cobrar
                PaymentAllocation::create([
                    'uuid' => (string) Str::uuid(),
                    'payment_id' => $payment->id,
                    'receivable_id' => $receivable->id,
                    'allocated_amount' => $initialPayment,
                ]);
            }

            $sale->payment_status = $isFullySettled ? 'PAID' : ($initialPayment > 0 ? 'PARTIAL' : 'UNPAID');
            $sale->total_amount = $totalAmount;
            $sale->initial_payment_amount = $initialPayment;
            $sale->save();
        }

        $sale->update([
            'status' => 'CONFIRMED',
            'confirmed_at' => now(),
            'confirmed_by' => $operatorId,
        ]);
    }
}
