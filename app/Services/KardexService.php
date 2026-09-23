<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\KardexEntry;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class KardexService
{
    /**
     * Registra una entrada en el Kardex y actualiza el inventario con el nuevo Promedio Ponderado Móvil.
     *
     * @param  array  $data  {
     *                       'branch_id': int,
     *                       'product_id': int,
     *                       'quantity': numeric,
     *                       'unit_cost': numeric,
     *                       'operation_type': string, // ej. 'COMPRA', 'AJUSTE_POSITIVO', 'INVENTARIO_INICIAL'
     *                       'reference': string|null,
     *                       'inventory_movement_line_id': int|null,
     *                       'user_id': int|null,
     *                       'device_id': string|null,
     *                       'operation_date': string|Carbon|null,
     *                       'uuid': string|null,
     *                       }
     */
    public function recordEntry(array $data): KardexEntry
    {
        if ($data['quantity'] <= 0) {
            throw new InvalidArgumentException('La cantidad de entrada debe ser mayor a cero.');
        }

        return DB::transaction(function () use ($data) {
            // 1. Idempotencia: Verificar si el UUID ya existe (para sincronizaciones PWA)
            $uuid = $data['uuid'] ?? (string) Str::uuid();
            $existing = KardexEntry::where('uuid', $uuid)->first();
            if ($existing) {
                return $existing;
            }

            // 2. Obtener o crear inventario con bloqueo pesimista (Row-level lock)
            $inventory = Inventory::where('branch_id', $data['branch_id'])
                ->where('product_id', $data['product_id'])
                ->lockForUpdate()
                ->first();

            if (! $inventory) {
                $inventory = new Inventory([
                    'uuid' => (string) Str::uuid(),
                    'branch_id' => $data['branch_id'],
                    'product_id' => $data['product_id'],
                    'physical_quantity' => 0,
                    'available_quantity' => 0,
                    'average_cost' => 0,
                ]);
            }

            // 3. Cálculos de Promedio Ponderado Móvil
            $inputQuantity = (float) $data['quantity'];
            $inputUnitCost = (float) $data['unit_cost'];
            $inputTotalCost = $inputQuantity * $inputUnitCost;

            $currentQuantity = (float) $inventory->physical_quantity;
            $currentAverageCost = (float) $inventory->average_cost;
            $currentTotalValue = $currentQuantity * $currentAverageCost;

            $newQuantity = $currentQuantity + $inputQuantity;
            $newTotalValue = $currentTotalValue + $inputTotalCost;
            $newAverageCost = $newQuantity > 0 ? ($newTotalValue / $newQuantity) : $inputUnitCost;

            // 4. Actualizar Inventario
            $inventory->physical_quantity = $newQuantity;
            // Para available_quantity se asume igual a physical_quantity por ahora, salvo manejo de reservas
            $inventory->available_quantity = $inventory->available_quantity + $inputQuantity;
            $inventory->average_cost = $newAverageCost;
            $inventory->save();

            // 5. Determinar siguiente número de secuencia
            $sequenceNumber = KardexEntry::max('sequence_number') + 1;

            // 6. Registrar en Kardex
            return KardexEntry::create([
                'uuid' => $uuid,
                'branch_id' => $data['branch_id'],
                'product_id' => $data['product_id'],
                'inventory_movement_line_id' => $data['inventory_movement_line_id'] ?? null,
                'sequence_number' => $sequenceNumber,
                'user_id' => $data['user_id'] ?? auth()->id(),
                'device_id' => $data['device_id'] ?? null,
                'operation_date' => $data['operation_date'] ?? now(),
                'operation_type' => $data['operation_type'],
                'reference' => $data['reference'] ?? null,

                'input_quantity' => $inputQuantity,
                'input_unit_cost' => $inputUnitCost,
                'input_total_cost' => $inputTotalCost,

                'balance_quantity' => $newQuantity,
                'balance_unit_cost' => $newAverageCost,
                'balance_total_cost' => $newTotalValue,

                'sync_status' => 'SYNCED',
            ]);
        });
    }

    /**
     * Registra una salida en el Kardex y deduce el inventario respetando el costo promedio.
     */
    public function recordExit(array $data): KardexEntry
    {
        if ($data['quantity'] <= 0) {
            throw new InvalidArgumentException('La cantidad de salida debe ser mayor a cero.');
        }

        return DB::transaction(function () use ($data) {
            // 1. Idempotencia
            $uuid = $data['uuid'] ?? (string) Str::uuid();
            $existing = KardexEntry::where('uuid', $uuid)->first();
            if ($existing) {
                return $existing;
            }

            // 2. Bloquear Inventario
            $inventory = Inventory::where('branch_id', $data['branch_id'])
                ->where('product_id', $data['product_id'])
                ->lockForUpdate()
                ->first();

            if (! $inventory) {
                throw new InvalidArgumentException('No existe inventario para este producto en la sucursal indicada.');
            }

            // 3. Validación estricta de Stock Negativo
            $outputQuantity = (float) $data['quantity'];
            if ($inventory->physical_quantity < $outputQuantity) {
                throw new InvalidArgumentException("Stock insuficiente. No se puede realizar la salida. Stock actual: {$inventory->physical_quantity}");
            }

            // 4. Cálculos de Salida (Costo Promedio Vigente)
            $outputUnitCost = (float) $inventory->average_cost;
            $outputTotalCost = $outputQuantity * $outputUnitCost;

            $newQuantity = (float) $inventory->physical_quantity - $outputQuantity;
            // El costo unitario promedio se mantiene igual en una salida normal
            $newAverageCost = $outputUnitCost;
            $newTotalValue = $newQuantity * $newAverageCost;

            // 5. Actualizar Inventario
            $inventory->physical_quantity = $newQuantity;
            $inventory->available_quantity = $inventory->available_quantity - $outputQuantity;
            $inventory->save();

            // 6. Secuencia
            $sequenceNumber = KardexEntry::max('sequence_number') + 1;

            // 7. Registrar Kardex
            return KardexEntry::create([
                'uuid' => $uuid,
                'branch_id' => $data['branch_id'],
                'product_id' => $data['product_id'],
                'inventory_movement_line_id' => $data['inventory_movement_line_id'] ?? null,
                'sequence_number' => $sequenceNumber,
                'user_id' => $data['user_id'] ?? auth()->id(),
                'device_id' => $data['device_id'] ?? null,
                'operation_date' => $data['operation_date'] ?? now(),
                'operation_type' => $data['operation_type'], // ej. 'VENTA', 'SALIDA_DANO', 'CONSUMO'
                'reference' => $data['reference'] ?? null,

                'output_quantity' => $outputQuantity,
                'output_unit_cost' => $outputUnitCost,
                'output_total_cost' => $outputTotalCost,

                'balance_quantity' => $newQuantity,
                'balance_unit_cost' => $newAverageCost,
                'balance_total_cost' => $newTotalValue,

                'sync_status' => 'SYNCED',
            ]);
        });
    }

    /**
     * Revierte un movimiento específico del Kardex (compensación).
     */
    public function reverseMovement(int $kardexEntryId, ?int $userId = null): KardexEntry
    {
        return DB::transaction(function () use ($kardexEntryId, $userId) {
            $original = KardexEntry::where('id', $kardexEntryId)->lockForUpdate()->firstOrFail();

            // Evitar revertir algo ya revertido
            if (KardexEntry::where('original_entry_id', $original->id)->exists()) {
                throw new InvalidArgumentException('El movimiento ya ha sido revertido previamente.');
            }

            // Si el original fue Entrada, el reverso es una Salida
            if ($original->input_quantity > 0) {
                $reversal = $this->recordExit([
                    'branch_id' => $original->branch_id,
                    'product_id' => $original->product_id,
                    'quantity' => $original->input_quantity,
                    'operation_type' => 'REVERSO_ENTRADA',
                    'reference' => 'REVERSO: '.($original->reference ?? $original->id),
                    'user_id' => $userId ?? auth()->id(),
                ]);
            } else {
                // Si el original fue Salida, el reverso es una Entrada
                $reversal = $this->recordEntry([
                    'branch_id' => $original->branch_id,
                    'product_id' => $original->product_id,
                    'quantity' => $original->output_quantity,
                    'unit_cost' => $original->output_unit_cost, // Devolvemos al costo oficial de salida
                    'operation_type' => 'REVERSO_SALIDA',
                    'reference' => 'REVERSO: '.($original->reference ?? $original->id),
                    'user_id' => $userId ?? auth()->id(),
                ]);
            }

            // Enlazar trazabilidad
            $reversal->original_entry_id = $original->id;
            $reversal->save();

            $original->reversed_by_entry_id = $reversal->id;
            $original->save();

            return $reversal;
        });
    }
}
