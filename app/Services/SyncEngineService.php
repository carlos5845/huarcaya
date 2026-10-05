<?php

namespace App\Services;

use App\Models\Conflict;
use App\Models\Customer;
use App\Models\Lot;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseLine;
use App\Models\Sale;
use App\Models\SaleLine;
use App\Models\Supplier;
use App\Models\SyncOperation;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SyncEngineService
{
    public function __construct(
        public SaleConfirmationService $saleConfirmationService,
        public KardexService $kardexService
    ) {}

    /**
     * Process an array of sync operations sequentially and idempotently.
     *
     * @param  array<int, array<string, mixed>>  $operations
     * @return array<int, array<string, mixed>>
     */
    public function processBatch(array $operations, User $user, int $branchId): array
    {
        $results = [];

        // Sort by client_timestamp if available to preserve chronological intent
        usort($operations, function ($a, $b) {
            $tA = isset($a['client_timestamp']) ? strtotime($a['client_timestamp']) : 0;
            $tB = isset($b['client_timestamp']) ? strtotime($b['client_timestamp']) : 0;

            return $tA <=> $tB;
        });

        foreach ($operations as $op) {
            $uuid = $op['uuid'] ?? (string) Str::uuid();
            $entityType = $op['entity_type'] ?? 'Unknown';

            // 1. Check idempotency: If sync operation was already processed successfully, return success immediately
            $existing = SyncOperation::where('uuid', $uuid)->first();
            if ($existing) {
                if ($existing->status === 'SUCCESS') {
                    $results[] = [
                        'uuid' => $uuid,
                        'status' => 'SUCCESS',
                        'server_id' => $existing->payload['server_id'] ?? null,
                        'sale_number' => $existing->payload['sale_number'] ?? null,
                        'message' => 'Operación ya sincronizada previamente (idempotente).',
                    ];

                    continue;
                }

                if ($existing->status === 'CONFLICT') {
                    $results[] = [
                        'uuid' => $uuid,
                        'status' => 'CONFLICT',
                        'message' => $existing->error_message ?? 'Conflicto de sincronización pendiente de resolución.',
                    ];

                    continue;
                }
            }

            // 2. Process based on entity type
            try {
                if ($entityType === 'Customer') {
                    $result = $this->processCustomerOperation($op, $user, $existing);
                } elseif ($entityType === 'Sale') {
                    $result = $this->processSaleOperation($op, $user, $branchId, $existing);
                } elseif ($entityType === 'Purchase') {
                    $result = $this->processPurchaseOperation($op, $user, $branchId, $existing);
                } else {
                    throw new Exception("Tipo de entidad '{$entityType}' no soportado para sincronización.");
                }

                $results[] = $result;
            } catch (Exception $e) {
                $results[] = [
                    'uuid' => $uuid,
                    'status' => 'FAILED',
                    'message' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    /**
     * Reprocess a specific SyncOperation, typically after administrative correction or approval.
     */
    public function reprocessOperation(SyncOperation $syncOp, User $user, int $branchId): array
    {
        $op = [
            'uuid' => $syncOp->uuid,
            'device_id' => $syncOp->device_id,
            'entity_type' => $syncOp->entity_type,
            'entity_uuid' => $syncOp->entity_uuid,
            'operation_type' => $syncOp->operation_type,
            'payload' => $syncOp->payload,
            'client_timestamp' => $syncOp->client_timestamp,
        ];

        $syncOp->update(['status' => 'PROCESSING', 'error_message' => null]);

        if ($syncOp->entity_type === 'Customer') {
            return $this->processCustomerOperation($op, $user, $syncOp);
        } elseif ($syncOp->entity_type === 'Sale') {
            return $this->processSaleOperation($op, $user, $branchId, $syncOp);
        } elseif ($syncOp->entity_type === 'Purchase') {
            return $this->processPurchaseOperation($op, $user, $branchId, $syncOp);
        }

        throw new Exception("Tipo de entidad '{$syncOp->entity_type}' no soportado para reprocesamiento.");
    }

    /**
     * Process an offline customer creation or update.
     */
    private function processCustomerOperation(array $op, User $user, ?SyncOperation $existing): array
    {
        $payload = $op['payload'] ?? [];
        $uuid = $op['uuid'];
        $customerUuid = $payload['uuid'] ?? (string) Str::uuid();

        $syncOp = $existing ?? SyncOperation::create([
            'uuid' => $uuid,
            'device_id' => $op['device_id'] ?? null,
            'user_id' => $user->id,
            'entity_type' => 'Customer',
            'entity_uuid' => $customerUuid,
            'operation_type' => $op['operation_type'] ?? 'CREATE',
            'payload' => $payload,
            'status' => 'PROCESSING',
            'client_timestamp' => $op['client_timestamp'] ?? now(),
        ]);

        $customer = Customer::where('company_id', $user->company_id)
            ->where(function ($q) use ($customerUuid, $payload) {
                $q->where('uuid', $customerUuid);
                if (! empty($payload['document_number'])) {
                    $q->orWhere('document_number', $payload['document_number']);
                }
            })
            ->first();

        if (! $customer) {
            $customer = Customer::create([
                'uuid' => $customerUuid,
                'company_id' => $user->company_id,
                'document_type' => $payload['document_type'] ?? 'DNI',
                'document_number' => $payload['document_number'] ?? '',
                'legal_name' => $payload['legal_name'] ?? 'Cliente Offline',
                'phone' => $payload['phone'] ?? null,
                'email' => $payload['email'] ?? null,
                'address' => $payload['address'] ?? null,
                'status' => 'ACTIVE',
                'created_by' => $user->id,
            ]);
        }

        $syncOp->update([
            'status' => 'SUCCESS',
            'processed_at' => now(),
            'payload' => array_merge($payload, ['server_id' => $customer->id]),
        ]);

        return [
            'uuid' => $uuid,
            'status' => 'SUCCESS',
            'server_id' => $customer->id,
            'message' => 'Cliente sincronizado exitosamente.',
        ];
    }

    /**
     * Process an offline sale creation, deducting Kardex and lots idempotently.
     */
    private function processSaleOperation(array $op, User $user, int $branchId, ?SyncOperation $existing): array
    {
        $payload = $op['payload'] ?? [];
        $uuid = $op['uuid'];
        $saleUuid = $payload['uuid'] ?? (string) Str::uuid();

        $syncOp = $existing ?? SyncOperation::create([
            'uuid' => $uuid,
            'device_id' => $op['device_id'] ?? null,
            'user_id' => $user->id,
            'entity_type' => 'Sale',
            'entity_uuid' => $saleUuid,
            'operation_type' => $op['operation_type'] ?? 'CREATE',
            'payload' => $payload,
            'status' => 'PROCESSING',
            'client_timestamp' => $op['client_timestamp'] ?? now(),
        ]);

        // Check if Sale already exists with this UUID
        $sale = Sale::where('uuid', $saleUuid)->first();
        if ($sale) {
            $syncOp->update([
                'status' => 'SUCCESS',
                'processed_at' => now(),
                'payload' => array_merge($payload, [
                    'server_id' => $sale->id,
                    'sale_number' => $sale->sale_number,
                ]),
            ]);

            return [
                'uuid' => $uuid,
                'status' => 'SUCCESS',
                'server_id' => $sale->id,
                'sale_number' => $sale->sale_number,
                'message' => 'Venta ya existente y registrada.',
            ];
        }

        DB::beginTransaction();
        try {
            // 1. Resolve Customer
            $customer = null;
            if (! empty($payload['customer_id'])) {
                $customer = Customer::find($payload['customer_id']);
            }
            if (! $customer && ! empty($payload['customer_uuid'])) {
                $customer = Customer::where('uuid', $payload['customer_uuid'])->first();
            }
            if (! $customer) {
                // Fallback to generic customer
                $customer = Customer::firstOrCreate(
                    [
                        'company_id' => $user->company_id,
                        'document_number' => '00000000',
                    ],
                    [
                        'uuid' => (string) Str::uuid(),
                        'document_type' => 'DNI',
                        'legal_name' => 'Clientes Varios / Público en General',
                        'status' => 'ACTIVE',
                        'created_by' => $user->id,
                    ]
                );
            }

            // 2. Generate sale number
            $saleType = $payload['sale_type'] ?? 'BOLETA';
            $prefix = $saleType === 'FACTURA' ? 'F' : ($saleType === 'BOLETA' ? 'B' : 'T');
            $saleNumber = $prefix.date('Ymd').'-'.strtoupper(Str::random(6));

            $paymentType = $payload['payment_type'] ?? 'CASH';
            $taxMode = $payload['tax_mode'] ?? 'INCLUDED';
            $currencyCode = $payload['currency_code'] ?? 'PEN';
            $exchangeRate = $currencyCode === 'USD' ? (float) ($payload['exchange_rate'] ?? 3.80) : 1.0;

            // 3. Create Sale record
            $sale = Sale::create([
                'uuid' => $saleUuid,
                'company_id' => $user->company_id,
                'branch_id' => $branchId,
                'customer_id' => $customer->id,
                'sale_number' => $saleNumber,
                'sale_type' => $saleType,
                'payment_type' => $paymentType,
                'payment_method_id' => $payload['payment_method_id'] ?? null,
                'due_date' => $payload['due_date'] ?? null,
                'initial_payment_amount' => $payload['initial_payment_amount'] ?? 0,
                'payment_status' => $paymentType === 'CASH' ? 'PAID' : 'UNPAID',
                'external_document_type' => $saleType,
                'external_document_series' => $payload['external_document_series'] ?? null,
                'external_document_number' => $payload['external_document_number'] ?? null,
                'operation_date' => $payload['operation_date'] ?? now()->toDateString(),
                'currency_code' => $currencyCode,
                'exchange_rate' => $exchangeRate,
                'status' => 'DRAFT',
                'customer_name_snapshot' => $customer->legal_name,
                'customer_document_snapshot' => $customer->document_number,
                'notes' => trim(($payload['notes'] ?? '').' [Sincronizado Offline]'),
                'created_by' => $user->id,
                'subtotal_amount' => 0,
                'tax_amount' => 0,
                'total_amount' => 0,
            ]);

            // 4. Create Sale Lines
            $linesData = $payload['lines'] ?? [];
            if (empty($linesData)) {
                throw new Exception('La venta sincronizada no contiene líneas de detalle.');
            }

            $subtotal = 0;
            $taxAmount = 0;

            foreach ($linesData as $lineData) {
                $product = null;
                if (! empty($lineData['product_id'])) {
                    $product = Product::find($lineData['product_id']);
                }
                if (! $product && ! empty($lineData['product_uuid'])) {
                    $product = Product::where('uuid', $lineData['product_uuid'])->first();
                }

                if (! $product) {
                    throw new Exception('Producto no encontrado en el servidor para la línea.');
                }

                $quantity = (float) ($lineData['quantity'] ?? 1);
                $unitPrice = (float) ($lineData['unit_price'] ?? 0);
                $lineTotal = $quantity * $unitPrice;
                $lineTax = 0;

                if ($taxMode === 'INCLUDED') {
                    $lineTax = $lineTotal - ($lineTotal / 1.18);
                } elseif ($taxMode === 'PLUS_TAX') {
                    $lineTax = $lineTotal * 0.18;
                    $lineTotal += $lineTax;
                }

                $subtotal += $lineTotal;
                $taxAmount += $lineTax;

                SaleLine::create([
                    'uuid' => (string) Str::uuid(),
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'product_type_snapshot' => $product->product_type ?? 'STANDARD',
                    'product_reference_snapshot' => $product->primary_reference ?? 'N/A',
                    'product_name_snapshot' => $product->name,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'unit_cost_base' => 0,
                    'line_subtotal' => $lineTotal - $lineTax,
                    'discount_amount' => 0,
                    'tax_amount' => $lineTax,
                    'line_total' => $lineTotal,
                ]);
            }

            $sale->update([
                'subtotal_amount' => $subtotal - $taxAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => $subtotal,
            ]);

            // 5. Confirm sale (deducts Kardex, FIFO lots, creates payments/receivables)
            $action = $payload['action'] ?? 'CONFIRM';
            if ($action === 'CONFIRM') {
                $this->saleConfirmationService->confirm($sale, $user->id);
            }

            DB::commit();

            // 6. Record success in SyncOperation
            $syncOp->update([
                'status' => 'SUCCESS',
                'processed_at' => now(),
                'payload' => array_merge($payload, [
                    'server_id' => $sale->id,
                    'sale_number' => $sale->sale_number,
                ]),
            ]);

            return [
                'uuid' => $uuid,
                'status' => 'SUCCESS',
                'server_id' => $sale->id,
                'sale_number' => $sale->sale_number,
                'message' => 'Venta sincronizada y procesada exitosamente en Kardex.',
            ];
        } catch (Exception $e) {
            DB::rollBack();

            $isConflict = str_contains($e->getMessage(), 'Stock insuficiente')
                || str_contains($e->getMessage(), 'menor al permitido');

            $status = $isConflict ? 'CONFLICT' : 'FAILED';

            $syncOp->update([
                'status' => $status,
                'error_message' => $e->getMessage(),
                'retry_count' => $syncOp->retry_count + 1,
            ]);

            if ($isConflict) {
                Conflict::create([
                    'uuid' => (string) Str::uuid(),
                    'entity_type' => 'Sale',
                    'entity_uuid' => $saleUuid,
                    'conflict_type' => 'INSUFFICIENT_STOCK',
                    'server_state' => ['error' => $e->getMessage()],
                    'client_state' => $payload,
                    'status' => 'PENDING',
                    'sync_operation_id' => $syncOp->id,
                ]);
            }

            return [
                'uuid' => $uuid,
                'status' => $status,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Process an offline purchase creation, creating inventory entry in Kardex and lots.
     */
    private function processPurchaseOperation(array $op, User $user, int $branchId, ?SyncOperation $existing): array
    {
        $payload = $op['payload'] ?? [];
        $uuid = $op['uuid'];
        $purchaseUuid = $payload['uuid'] ?? (string) Str::uuid();

        $syncOp = $existing ?? SyncOperation::create([
            'uuid' => $uuid,
            'device_id' => $op['device_id'] ?? null,
            'user_id' => $user->id,
            'entity_type' => 'Purchase',
            'entity_uuid' => $purchaseUuid,
            'operation_type' => $op['operation_type'] ?? 'CREATE',
            'payload' => $payload,
            'status' => 'PROCESSING',
            'client_timestamp' => $op['client_timestamp'] ?? now(),
        ]);

        $purchase = Purchase::where('uuid', $purchaseUuid)->first();
        if ($purchase) {
            if (! $purchase->document_file_path && ! empty($payload['document_file']['base64'])) {
                $filePath = $this->saveBase64Attachment($payload['document_file'], 'purchases');
                if ($filePath) {
                    $purchase->update(['document_file_path' => $filePath]);
                }
            }

            $syncOp->update([
                'status' => 'SUCCESS',
                'processed_at' => now(),
                'payload' => array_merge($payload, [
                    'server_id' => $purchase->id,
                    'purchase_number' => $purchase->purchase_number,
                ]),
            ]);

            return [
                'uuid' => $uuid,
                'status' => 'SUCCESS',
                'server_id' => $purchase->id,
                'purchase_number' => $purchase->purchase_number,
                'message' => 'Compra previamente registrada.',
            ];
        }

        DB::beginTransaction();
        try {
            $supplier = Supplier::find($payload['supplier_id']);
            if (! $supplier) {
                throw new Exception('Proveedor no encontrado en el sistema.');
            }

            $linesData = $payload['lines'] ?? [];
            if (empty($linesData)) {
                throw new Exception('La compra sincronizada no contiene líneas de detalle.');
            }

            $linesTotal = 0;
            $taxMode = $payload['tax_mode'] ?? 'INCLUDED';

            foreach ($linesData as $line) {
                $linesTotal += ((float) ($line['quantity'] ?? 0) * (float) ($line['unit_cost'] ?? 0));
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

            $documentFilePath = $this->saveBase64Attachment($payload['document_file'] ?? null, 'purchases');

            $purchase = Purchase::create([
                'uuid' => $purchaseUuid,
                'company_id' => $user->company_id,
                'branch_id' => $branchId,
                'supplier_id' => $supplier->id,
                'purchase_number' => $purchaseNumber,
                'supplier_document_type' => $payload['supplier_document_type'] ?? null,
                'supplier_document_series' => $payload['supplier_document_series'] ?? null,
                'supplier_document_number' => $payload['supplier_document_number'] ?? null,
                'document_date' => $payload['document_date'] ?? now()->toDateString(),
                'currency_code' => $payload['currency_code'] ?? 'PEN',
                'exchange_rate' => ($payload['currency_code'] ?? 'PEN') === 'USD' ? (float) ($payload['exchange_rate'] ?? 3.80) : 1,
                'subtotal_amount' => round($globalSubtotal, 2),
                'tax_amount' => round($globalTax, 2),
                'total_amount' => round($globalTotal, 2),
                'status' => 'DRAFT',
                'notes' => trim(($payload['notes'] ?? '').' [Sincronizado Offline]'),
                'document_file_path' => $documentFilePath,
                'created_by' => $user->id,
            ]);

            foreach ($linesData as $lineData) {
                $product = Product::find($lineData['product_id']);
                if (! $product) {
                    throw new Exception('Producto no encontrado en el sistema para compra.');
                }

                $quantity = (float) ($lineData['quantity'] ?? 1);
                $unitCost = (float) ($lineData['unit_cost'] ?? 0);
                $baseInput = $quantity * $unitCost;

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
                    'product_id' => $product->id,
                    'ordered_quantity' => $quantity,
                    'unit_cost_original' => $unitCost,
                    'unit_cost_base' => $unitCost,
                    'line_subtotal' => round($lineSubtotal, 2),
                    'tax_amount' => round($lineTax, 2),
                    'line_total' => round($lineFinalTotal, 2),
                    'received_quantity' => 0,
                ]);
            }

            $action = $payload['action'] ?? 'CONFIRM';
            if ($action === 'CONFIRM') {
                $purchase->update([
                    'status' => 'CONFIRMED',
                    'confirmed_at' => now(),
                    'approved_by' => $user->id,
                ]);

                $purchase->load('lines');
                foreach ($purchase->lines as $line) {
                    $line->update([
                        'received_quantity' => $line->ordered_quantity,
                    ]);

                    $lotNumber = 'LOT-'.date('Ymd').'-'.strtoupper(Str::random(4));
                    Lot::create([
                        'uuid' => (string) Str::uuid(),
                        'branch_id' => $branchId,
                        'product_id' => $line->product_id,
                        'lot_number' => $lotNumber,
                        'original_quantity' => $line->received_quantity,
                        'current_quantity' => $line->received_quantity,
                        'unit_cost' => $line->unit_cost_base,
                        'status' => 'ACTIVE',
                    ]);

                    $this->kardexService->recordEntry([
                        'uuid' => (string) Str::uuid(),
                        'product_id' => $line->product_id,
                        'branch_id' => $branchId,
                        'quantity' => (float) $line->received_quantity,
                        'unit_cost' => (float) $line->unit_cost_base,
                        'operation_type' => 'COMPRA',
                        'reference' => 'COMPRA: '.$purchase->purchase_number,
                        'user_id' => $user->id,
                    ]);
                }
            }

            DB::commit();

            $syncOp->update([
                'status' => 'SUCCESS',
                'processed_at' => now(),
                'payload' => array_merge($payload, [
                    'server_id' => $purchase->id,
                    'purchase_number' => $purchase->purchase_number,
                ]),
            ]);

            return [
                'uuid' => $uuid,
                'status' => 'SUCCESS',
                'server_id' => $purchase->id,
                'purchase_number' => $purchase->purchase_number,
                'message' => 'Compra sincronizada y registrada en Kardex.',
            ];
        } catch (Exception $e) {
            DB::rollBack();

            $syncOp->update([
                'status' => 'FAILED',
                'error_message' => $e->getMessage(),
                'retry_count' => $syncOp->retry_count + 1,
            ]);

            return [
                'uuid' => $uuid,
                'status' => 'FAILED',
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Decode and store base64 file attachment to the public disk.
     */
    private function saveBase64Attachment(?array $filePayload, string $directory): ?string
    {
        if (empty($filePayload['base64'])) {
            return null;
        }

        $fileData = $filePayload['base64'];
        $originalName = $filePayload['name'] ?? 'archivo_offline';
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        if (! $extension && ! empty($filePayload['type'])) {
            $mime = $filePayload['type'];
            $extension = match ($mime) {
                'application/pdf' => 'pdf',
                'image/jpeg', 'image/jpg' => 'jpg',
                'image/png' => 'png',
                default => 'pdf',
            };
        }
        $cleanExtension = in_array(strtolower($extension), ['pdf', 'jpg', 'jpeg', 'png']) ? strtolower($extension) : 'pdf';

        if (str_contains($fileData, ',')) {
            [, $fileData] = explode(',', $fileData);
        }

        $decoded = base64_decode($fileData);
        if ($decoded !== false) {
            $filename = trim($directory, '/').'/'.Str::random(40).'.'.$cleanExtension;
            Storage::disk('public')->put($filename, $decoded);

            return $filename;
        }

        return null;
    }
}
