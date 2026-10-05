<?php

namespace App\Services;

use App\Models\Conflict;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;

class ConflictResolutionService
{
    public function __construct(
        public SyncEngineService $syncEngineService,
        public KardexService $kardexService
    ) {}

    /**
     * Reject an offline conflict operation.
     */
    public function reject(Conflict $conflict, User $user, string $notes): void
    {
        if (in_array($conflict->status, ['RESOLVED', 'RESOLVED_FORCE'])) {
            throw new Exception('No se puede rechazar un conflicto que ya ha sido resuelto previamente.');
        }

        DB::transaction(function () use ($conflict, $user, $notes) {
            $conflict->update([
                'status' => 'REJECTED',
                'resolved_by' => $user->id,
                'resolved_at' => now(),
                'resolution_notes' => $notes,
            ]);

            if ($conflict->syncOperation) {
                $conflict->syncOperation->update([
                    'status' => 'FAILED',
                    'error_message' => "Operación rechazada administrativamente: {$notes}",
                ]);
            }
        });
    }

    /**
     * Resolve a conflict by modifying its payload and reprocessing.
     */
    public function resolveWithCorrection(Conflict $conflict, array $newPayload, User $user, string $notes): array
    {
        if (in_array($conflict->status, ['RESOLVED', 'RESOLVED_FORCE'])) {
            throw new Exception('Este conflicto ya ha sido resuelto previamente.');
        }

        if (! $conflict->syncOperation) {
            throw new Exception('El conflicto no tiene una operación de sincronización asociada para reprocesar.');
        }

        $branchId = $newPayload['branch_id']
            ?? $conflict->client_state['branch_id']
            ?? $conflict->branch?->id
            ?? 1;

        return DB::transaction(function () use ($conflict, $newPayload, $user, $notes, $branchId) {
            // Update payload in sync operation and client_state in conflict
            $conflict->update(['client_state' => $newPayload]);
            $conflict->syncOperation->update(['payload' => $newPayload]);

            $result = $this->syncEngineService->reprocessOperation($conflict->syncOperation, $user, (int) $branchId);

            if (($result['status'] ?? '') === 'SUCCESS') {
                $conflict->update([
                    'status' => 'RESOLVED',
                    'resolved_by' => $user->id,
                    'resolved_at' => now(),
                    'resolution_notes' => $notes,
                ]);
            }

            return $result;
        });
    }

    /**
     * Authorize an exception: creates necessary Kardex regularization entries for missing stock,
     * then executes the operation cleanly.
     */
    public function resolveWithForceAuthorization(Conflict $conflict, User $user, string $notes): array
    {
        if (in_array($conflict->status, ['RESOLVED', 'RESOLVED_FORCE'])) {
            throw new Exception('Este conflicto ya ha sido resuelto previamente.');
        }

        if (! $conflict->syncOperation) {
            throw new Exception('El conflicto no tiene una operación de sincronización asociada para reprocesar.');
        }

        $payload = $conflict->client_state ?? $conflict->syncOperation->payload;
        $branchId = (int) ($payload['branch_id'] ?? $conflict->branch?->id ?? 1);

        return DB::transaction(function () use ($conflict, $payload, $user, $notes, $branchId) {
            // If it's a sale with stock shortage, regularize stock in Kardex
            if ($conflict->entity_type === 'Sale' && ! empty($payload['lines'])) {
                foreach ($payload['lines'] as $line) {
                    $productId = $line['product_id'] ?? null;
                    if (! $productId && ! empty($line['product_uuid'])) {
                        $p = Product::where('uuid', $line['product_uuid'])->first();
                        $productId = $p?->id;
                    }

                    if (! $productId) {
                        continue;
                    }

                    $product = Product::find($productId);
                    if (! $product) {
                        continue;
                    }

                    $inventory = Inventory::where('branch_id', $branchId)
                        ->where('product_id', $productId)
                        ->lockForUpdate()
                        ->first();

                    $available = $inventory ? (float) $inventory->available_quantity : 0.0;
                    $requested = (float) ($line['quantity'] ?? 0);

                    if ($requested > $available) {
                        $shortage = $requested - $available;
                        $unitCost = (float) ($product->cost_price ?? $line['unit_price'] ?? 0);

                        // Record positive adjustment entry to balance Kardex before sale deduction
                        $this->kardexService->recordEntry([
                            'branch_id' => $branchId,
                            'product_id' => $productId,
                            'quantity' => $shortage,
                            'unit_cost' => $unitCost > 0 ? $unitCost : 1.0,
                            'operation_type' => 'AJUSTE_POSITIVO',
                            'reference' => 'Regularización por autorización de conflicto '.$conflict->uuid,
                            'user_id' => $user->id,
                        ]);
                    }
                }
            }

            // Now reprocess the operation with balanced inventory
            $result = $this->syncEngineService->reprocessOperation($conflict->syncOperation, $user, $branchId);

            if (($result['status'] ?? '') === 'SUCCESS') {
                $conflict->update([
                    'status' => 'RESOLVED_FORCE',
                    'resolved_by' => $user->id,
                    'resolved_at' => now(),
                    'resolution_notes' => $notes,
                ]);
            }

            return $result;
        });
    }
}
