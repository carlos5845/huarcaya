<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Conflict;
use App\Models\DailyClosing;
use App\Models\DailyClosingCashCount;
use App\Models\DailyClosingVersion;
use App\Models\PaymentMethod;
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
        $branch = Branch::find($branchId);
        $companyId = $branch?->company_id;

        // Expresión SQL ANSI (PostgreSQL & SQLite) para normalizar montos a Soles (PEN)
        $penSalesExpr = fn (string $col) => "COALESCE(SUM(CASE WHEN currency_code = 'USD' THEN {$col} * COALESCE(exchange_rate, 1) ELSE {$col} END), 0)";

        // 1. Sales on date (strictly CONFIRMED sales only — excludes DRAFT and CANCELLED)
        $salesQuery = Sale::where('branch_id', $branchId)
            ->whereDate('operation_date', $date)
            ->where('status', 'CONFIRMED');

        $salesCount = (int) (clone $salesQuery)->count();
        $totalSales = (float) ((clone $salesQuery)->selectRaw($penSalesExpr('total_amount').' as agg')->value('agg') ?? 0);
        // Al Contado (payment_type = CASH: incluye Efectivo, Yape, Plin, Transferencia, POS) vs Al Crédito (CREDIT)
        $cashSales = (float) ((clone $salesQuery)->where('payment_type', 'CASH')->selectRaw($penSalesExpr('total_amount').' as agg')->value('agg') ?? 0);
        $creditSales = (float) ((clone $salesQuery)->where('payment_type', 'CREDIT')->selectRaw($penSalesExpr('total_amount').' as agg')->value('agg') ?? 0);
        $subtotal = (float) ((clone $salesQuery)->selectRaw($penSalesExpr('subtotal_amount').' as agg')->value('agg') ?? 0);
        $tax = (float) ((clone $salesQuery)->selectRaw($penSalesExpr('tax_amount').' as agg')->value('agg') ?? 0);
        $discount = (float) ((clone $salesQuery)->selectRaw($penSalesExpr('discount_amount').' as agg')->value('agg') ?? 0);

        // Document breakdown using COALESCE(NULLIF(external_document_type, ''), sale_type)
        $docTypeExpr = "COALESCE(NULLIF(external_document_type, ''), sale_type)";
        $facturasQuery = (clone $salesQuery)->whereRaw("{$docTypeExpr} = ?", ['FACTURA']);
        $boletasQuery = (clone $salesQuery)->whereRaw("{$docTypeExpr} = ?", ['BOLETA']);
        $notasQuery = (clone $salesQuery)->whereRaw("({$docTypeExpr} IS NULL OR {$docTypeExpr} NOT IN (?, ?))", ['FACTURA', 'BOLETA']);

        $byDocument = [
            'FACTURA' => [
                'label' => 'Facturas',
                'count' => (int) (clone $facturasQuery)->count(),
                'total' => round((float) ((clone $facturasQuery)->selectRaw($penSalesExpr('total_amount').' as agg')->value('agg') ?? 0), 2),
            ],
            'BOLETA' => [
                'label' => 'Boletas',
                'count' => (int) (clone $boletasQuery)->count(),
                'total' => round((float) ((clone $boletasQuery)->selectRaw($penSalesExpr('total_amount').' as agg')->value('agg') ?? 0), 2),
            ],
            'NOTA_VENTA' => [
                'label' => 'Notas de Venta / Otros',
                'count' => (int) (clone $notasQuery)->count(),
                'total' => round((float) ((clone $notasQuery)->selectRaw($penSalesExpr('total_amount').' as agg')->value('agg') ?? 0), 2),
            ],
        ];

        // 2. Payments & Refunds by payment method (normalized to PEN & scoped to branch's company)
        $activeMethodsQuery = PaymentMethod::where('is_active', true)->orderBy('id');
        if ($companyId) {
            $activeMethodsQuery->where('company_id', $companyId);
        }
        $activeMethods = $activeMethodsQuery->get();

        $paymentsByMethod = DB::table('payment_method_lines')
            ->join('payments', 'payment_method_lines.payment_id', '=', 'payments.id')
            ->where('payments.branch_id', $branchId)
            ->whereDate('payments.operation_date', $date)
            ->where('payments.status', 'CONFIRMED')
            ->selectRaw("payment_method_lines.payment_method_id, SUM(CASE WHEN payments.currency_code = 'USD' THEN payment_method_lines.amount * COALESCE(payments.exchange_rate, 1) ELSE payment_method_lines.amount END) as total")
            ->groupBy('payment_method_lines.payment_method_id')
            ->pluck('total', 'payment_method_id');

        $refundsByMethod = DB::table('refund_method_lines')
            ->join('refunds', 'refund_method_lines.refund_id', '=', 'refunds.id')
            ->where('refunds.branch_id', $branchId)
            ->whereDate('refunds.operation_date', $date)
            ->where('refunds.status', 'CONFIRMED')
            ->selectRaw("refund_method_lines.payment_method_id, SUM(CASE WHEN refunds.currency_code = 'USD' THEN refund_method_lines.amount * COALESCE(refunds.exchange_rate, 1) ELSE refund_method_lines.amount END) as total")
            ->groupBy('refund_method_lines.payment_method_id')
            ->pluck('total', 'payment_method_id');

        $paymentMethodsData = [];
        $totalExpectedCash = 0.0;
        $totalRefundsAmount = 0.0;

        foreach ($activeMethods as $method) {
            $collectedFromPayments = (float) ($paymentsByMethod[$method->id] ?? 0);

            // Fallback strictly for legacy/CONFIRMED cash sales that do not have any payment allocation
            $directSalesWithoutPayment = (float) (Sale::where('branch_id', $branchId)
                ->whereDate('operation_date', $date)
                ->where('status', 'CONFIRMED')
                ->where('payment_type', 'CASH')
                ->where('payment_method_id', $method->id)
                ->whereDoesntHave('receivable.allocations')
                ->selectRaw($penSalesExpr('total_amount').' as agg')
                ->value('agg') ?? 0);

            // Avoid double count if payments exist without receivable allocations; fallback only when no payments exist for this method
            $grossExpected = $collectedFromPayments > 0 ? $collectedFromPayments : $directSalesWithoutPayment;
            $refundedForMethod = (float) ($refundsByMethod[$method->id] ?? 0);
            $expected = round($grossExpected - $refundedForMethod, 2);

            $paymentMethodsData[] = [
                'id' => $method->id,
                'name' => $method->name,
                'code' => $method->code,
                'is_cash' => (bool) $method->is_cash,
                'gross_amount' => round($grossExpected, 2),
                'refunded_amount' => round($refundedForMethod, 2),
                'expected_amount' => $expected,
            ];

            $totalExpectedCash += $expected;
            $totalRefundsAmount += $refundedForMethod;
        }

        // 3. Purchases on date (normalized to PEN)
        $purchasesQuery = Purchase::where('branch_id', $branchId)
            ->whereDate('document_date', $date)
            ->whereNotIn('status', ['CANCELLED', 'DRAFT']);

        $purchasesCount = (int) (clone $purchasesQuery)->count();
        $purchasesTotal = (float) ((clone $purchasesQuery)->selectRaw($penSalesExpr('total_amount').' as agg')->value('agg') ?? 0);

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

        $pendingSyncs = SyncOperation::where('status', 'PENDING')
            ->get()
            ->filter(function ($op) use ($branchId) {
                $opBranchId = $op->payload['branch_id'] ?? $op->device?->branch_id;

                return (int) $opBranchId === (int) $branchId;
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
            'total_refunds_amount' => round($totalRefundsAmount, 2),
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

            // Index user-submitted counts by payment_method_id so no active method can be omitted
            $countedMap = [];
            foreach ($countsInput as $countItem) {
                $methodId = (int) $countItem['payment_method_id'];
                $countedMap[$methodId] = [
                    'counted_amount' => (float) ($countItem['counted_amount'] ?? 0),
                    'notes' => $countItem['notes'] ?? null,
                ];
            }

            $totalExpected = 0.0;
            $totalCounted = 0.0;
            $resolvedCounts = [];

            foreach ($metrics['payment_methods'] as $pm) {
                $methodId = (int) $pm['id'];
                $expected = (float) $pm['expected_amount'];
                $counted = $countedMap[$methodId]['counted_amount'] ?? 0.0;
                $notes = $countedMap[$methodId]['notes'] ?? null;

                $totalExpected += $expected;
                $totalCounted += $counted;

                $resolvedCounts[] = [
                    'payment_method_id' => $methodId,
                    'expected_amount' => round($expected, 2),
                    'counted_amount' => round($counted, 2),
                    'difference_amount' => round($counted - $expected, 2),
                    'notes' => $notes,
                ];
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

            foreach ($resolvedCounts as $countRow) {
                DailyClosingCashCount::create([
                    'uuid' => (string) Str::uuid(),
                    'daily_closing_version_id' => $version->id,
                    'payment_method_id' => $countRow['payment_method_id'],
                    'expected_amount' => $countRow['expected_amount'],
                    'counted_amount' => $countRow['counted_amount'],
                    'difference_amount' => $countRow['difference_amount'],
                    'notes' => $countRow['notes'],
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
