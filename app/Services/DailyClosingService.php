<?php

namespace App\Services;

use App\Models\Conflict;
use App\Models\DailyClosing;
use App\Models\DailyClosingCashCount;
use App\Models\DailyClosingVersion;
use App\Models\PaymentMethod;
use App\Models\PaymentMethodLine;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SyncOperation;
use App\Models\Transfer;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DailyClosingService
{
    /**
     * Compute full metrics of sales, payments, purchases and transfers for a branch on a given date.
     * Also checks for any pending sync operations or unresolved conflicts.
     *
     * @return array<string, mixed>
     */
    public function getDailyMetrics(int $branchId, string $date): array
    {
        // 1. Sales on date
        $salesQuery = Sale::where('branch_id', $branchId)
            ->whereDate('operation_date', $date)
            ->where('status', '!=', 'CANCELLED');

        $salesCount = (int) (clone $salesQuery)->count();
        $totalSales = (float) (clone $salesQuery)->sum('total_amount');
        $cashSales = (float) (clone $salesQuery)->where('payment_type', 'CASH')->sum('total_amount');
        $creditSales = (float) (clone $salesQuery)->where('payment_type', 'CREDIT')->sum('total_amount');
        $subtotal = (float) (clone $salesQuery)->sum('subtotal_amount');
        $tax = (float) (clone $salesQuery)->sum('tax_amount');
        $discount = (float) (clone $salesQuery)->sum('discount_amount');

        // Document breakdown
        $facturasQuery = (clone $salesQuery)->where('external_document_type', 'FACTURA');
        $boletasQuery = (clone $salesQuery)->where('external_document_type', 'BOLETA');
        $notasQuery = (clone $salesQuery)->where(function ($q) {
            $q->whereNull('external_document_type')
                ->orWhereNotIn('external_document_type', ['FACTURA', 'BOLETA']);
        });

        $byDocument = [
            'FACTURA' => [
                'label' => 'Facturas',
                'count' => (int) $facturasQuery->count(),
                'total' => (float) $facturasQuery->sum('total_amount'),
            ],
            'BOLETA' => [
                'label' => 'Boletas',
                'count' => (int) $boletasQuery->count(),
                'total' => (float) $boletasQuery->sum('total_amount'),
            ],
            'NOTA_VENTA' => [
                'label' => 'Notas de Venta / Otros',
                'count' => (int) $notasQuery->count(),
                'total' => (float) $notasQuery->sum('total_amount'),
            ],
        ];

        // 2. Payments by payment method
        $activeMethods = PaymentMethod::where('is_active', true)->orderBy('id')->get();

        $paymentsByMethod = PaymentMethodLine::whereHas('payment', function ($q) use ($branchId, $date) {
            $q->where('branch_id', $branchId)
                ->whereDate('operation_date', $date)
                ->where('status', '!=', 'CANCELLED');
        })
            ->selectRaw('payment_method_id, SUM(amount) as total')
            ->groupBy('payment_method_id')
            ->pluck('total', 'payment_method_id');

        $paymentMethodsData = [];
        $totalExpectedCash = 0.0;

        foreach ($activeMethods as $method) {
            $collectedFromPayments = (float) ($paymentsByMethod[$method->id] ?? 0);

            // Also check for direct cash sales with this payment_method_id without payment record (fallback)
            $directSalesWithoutPayment = (float) Sale::where('branch_id', $branchId)
                ->whereDate('operation_date', $date)
                ->where('status', '!=', 'CANCELLED')
                ->where('payment_type', 'CASH')
                ->where('payment_method_id', $method->id)
                ->whereDoesntHave('receivable.allocations')
                ->sum('total_amount');

            // Avoid double count: if payments exist, use payments; otherwise fallback
            $expected = $collectedFromPayments > 0 ? $collectedFromPayments : $directSalesWithoutPayment;

            $paymentMethodsData[] = [
                'id' => $method->id,
                'name' => $method->name,
                'code' => $method->code,
                'is_cash' => (bool) $method->is_cash,
                'expected_amount' => round($expected, 2),
            ];

            $totalExpectedCash += $expected;
        }

        // 3. Purchases on date
        $purchasesQuery = Purchase::where('branch_id', $branchId)
            ->whereDate('document_date', $date)
            ->whereNotIn('status', ['CANCELLED', 'DRAFT']);

        $purchasesCount = (int) (clone $purchasesQuery)->count();
        $purchasesTotal = (float) (clone $purchasesQuery)->sum('total_amount');

        // 4. Transfers on date
        $transfersSentCount = (int) Transfer::where('source_branch_id', $branchId)
            ->whereDate('request_date', $date)
            ->where('status', '!=', 'CANCELLED')
            ->count();

        $transfersReceivedCount = (int) Transfer::where('destination_branch_id', $branchId)
            ->whereDate('request_date', $date)
            ->where('status', '!=', 'CANCELLED')
            ->count();

        // 5. Verification of pending sync operations and conflicts
        $pendingConflicts = Conflict::pending()->get()->filter(function ($conflict) use ($branchId) {
            return $conflict->branch?->id === $branchId;
        })->count();

        $pendingSyncs = SyncOperation::whereIn('status', ['PENDING', 'FAILED'])
            ->get()
            ->filter(function ($op) use ($branchId) {
                $opBranchId = $op->payload['branch_id'] ?? $op->device?->branch_id;

                return $opBranchId === $branchId;
            })->count();

        $blockingReasons = [];
        if ($pendingSyncs > 0) {
            $blockingReasons[] = "Hay {$pendingSyncs} operación(es) offline pendiente(s) de sincronizar para esta sucursal.";
        }
        if ($pendingConflicts > 0) {
            $blockingReasons[] = "Hay {$pendingConflicts} conflicto(s) de sincronización sin resolver para esta sucursal.";
        }

        $canClose = empty($blockingReasons);

        return [
            'date' => $date,
            'branch_id' => $branchId,
            'sales' => [
                'total_amount' => round($totalSales, 2),
                'count' => $salesCount,
                'cash_amount' => round($cashSales, 2),
                'credit_amount' => round($creditSales, 2),
                'subtotal_amount' => round($subtotal, 2),
                'tax_amount' => round($tax, 2),
                'discount_amount' => round($discount, 2),
                'by_document' => $byDocument,
            ],
            'payment_methods' => $paymentMethodsData,
            'total_expected_cash' => round($totalExpectedCash, 2),
            'purchases' => [
                'count' => $purchasesCount,
                'total_amount' => round($purchasesTotal, 2),
            ],
            'transfers' => [
                'sent_count' => $transfersSentCount,
                'received_count' => $transfersReceivedCount,
            ],
            'pending_conflicts' => $pendingConflicts,
            'pending_syncs' => $pendingSyncs,
            'can_close' => $canClose,
            'blocking_reasons' => $blockingReasons,
        ];
    }

    /**
     * Get existing daily closing or initialize a new OPEN one.
     */
    public function getOrCreateClosing(int $branchId, string $date, ?int $userId = null): DailyClosing
    {
        return DailyClosing::firstOrCreate(
            [
                'branch_id' => $branchId,
                'closing_date' => $date,
            ],
            [
                'uuid' => (string) Str::uuid(),
                'status' => 'OPEN',
                'opened_at' => now(),
                'opened_by' => $userId,
            ]
        );
    }

    /**
     * Save a draft version of the cash count (IN_PROGRESS).
     *
     * @param  array<string, mixed>  $data
     */
    public function saveDraft(DailyClosing $closing, array $data, int $userId): DailyClosingVersion
    {
        return DB::transaction(function () use ($closing, $data, $userId) {
            $metrics = $this->getDailyMetrics($closing->branch_id, $closing->closing_date->format('Y-m-d'));

            $countsInput = $data['counts'] ?? [];
            $nextVersionNumber = ((int) $closing->versions()->max('version_number')) + 1;

            $expectedMap = [];
            foreach ($metrics['payment_methods'] as $pm) {
                $expectedMap[$pm['id']] = (float) $pm['expected_amount'];
            }

            $totalExpected = 0.0;
            $totalCounted = 0.0;

            foreach ($countsInput as $countItem) {
                $methodId = (int) $countItem['payment_method_id'];
                $counted = (float) ($countItem['counted_amount'] ?? 0);
                $expected = $expectedMap[$methodId] ?? 0.0;

                $totalExpected += $expected;
                $totalCounted += $counted;
            }

            $totalDifference = round($totalCounted - $totalExpected, 2);

            $version = DailyClosingVersion::create([
                'uuid' => (string) Str::uuid(),
                'daily_closing_id' => $closing->id,
                'version_number' => $nextVersionNumber,
                'snapshot_data' => $metrics,
                'total_expected' => round($totalExpected, 2),
                'total_counted' => round($totalCounted, 2),
                'total_difference' => $totalDifference,
                'created_by' => $userId,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($countsInput as $countItem) {
                $methodId = (int) $countItem['payment_method_id'];
                $counted = (float) ($countItem['counted_amount'] ?? 0);
                $expected = $expectedMap[$methodId] ?? 0.0;
                $diff = round($counted - $expected, 2);

                DailyClosingCashCount::create([
                    'uuid' => (string) Str::uuid(),
                    'daily_closing_version_id' => $version->id,
                    'payment_method_id' => $methodId,
                    'expected_amount' => round($expected, 2),
                    'counted_amount' => round($counted, 2),
                    'difference_amount' => $diff,
                    'notes' => $countItem['notes'] ?? null,
                ]);
            }

            if ($closing->status === 'OPEN') {
                $closing->update([
                    'status' => 'IN_PROGRESS',
                    'notes' => $data['notes'] ?? $closing->notes,
                ]);
            }

            return $version;
        });
    }

    /**
     * Confirm closing permanently (CLOSED) after verifying there are no pending syncs or conflicts.
     *
     * @param  array<string, mixed>  $data
     */
    public function confirmClosing(DailyClosing $closing, array $data, int $userId): DailyClosing
    {
        $metrics = $this->getDailyMetrics($closing->branch_id, $closing->closing_date->format('Y-m-d'));

        if (! $metrics['can_close']) {
            $msg = implode(' ', $metrics['blocking_reasons']);
            throw new Exception("No se puede confirmar el cierre definitivo: {$msg}");
        }

        return DB::transaction(function () use ($closing, $data, $userId) {
            $this->saveDraft($closing, $data, $userId);

            $closing->update([
                'status' => 'CLOSED',
                'closed_at' => now(),
                'closed_by' => $userId,
                'notes' => $data['notes'] ?? $closing->notes,
            ]);

            return $closing->fresh(['latestVersion.cashCounts.paymentMethod', 'branch', 'openedByUser', 'closedByUser']);
        });
    }
}
