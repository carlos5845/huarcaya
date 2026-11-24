<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Conflict;
use App\Models\DailyClosing;
use App\Models\Inventory;
use App\Models\InventoryExit;
use App\Models\KardexEntry;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\SyncOperation;
use App\Models\Transfer;
use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Spatie\SimpleExcel\SimpleExcelWriter;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportService
{
    /**
     * Retorna la información y filas paginadas de un tipo de reporte.
     */
    public function getReportData(string $reportType, array $allowedBranchIds, array $filters, int $perPage = 15): array
    {
        $branchId = ! empty($filters['branch_id']) && strtoupper((string) $filters['branch_id']) !== 'ALL'
            ? (int) $filters['branch_id']
            : null;

        $targetBranchIds = $branchId ? [$branchId] : $allowedBranchIds;
        $companyId = ! empty($filters['company_id']) ? (int) $filters['company_id'] : null;

        $dateFrom = Carbon::parse(! empty($filters['date_from']) ? $filters['date_from'] : now()->startOfMonth()->format('Y-m-d'))->startOfDay();
        $dateTo = Carbon::parse(! empty($filters['date_to']) ? $filters['date_to'] : now()->format('Y-m-d'))->endOfDay();
        $search = isset($filters['search']) && trim((string) $filters['search']) !== ''
            ? trim((string) $filters['search'])
            : null;

        return match ($reportType) {
            'branch_inventory' => $this->getBranchInventoryReport($targetBranchIds, $companyId, $search, $perPage),
            'consolidated_inventory' => $this->getConsolidatedInventoryReport($targetBranchIds, $companyId, $search, $perPage),
            'kardex' => $this->getKardexReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
            'inventory_exits' => $this->getInventoryExitsReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
            'sales' => $this->getSalesReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
            'purchases' => $this->getPurchasesReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
            'payments' => $this->getPaymentsReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
            'receivables' => $this->getReceivablesReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
            'transfers' => $this->getTransfersReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
            'daily_closings' => $this->getDailyClosingsReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
            'offline_operations' => $this->getOfflineOperationsReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
            'conflicts' => $this->getConflictsReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
            default => $this->getSalesReport($targetBranchIds, $dateFrom, $dateTo, $search, $perPage),
        };
    }

    /**
     * Exporta el reporte solicitado a un archivo Excel (.xlsx) físico temporal y lo entrega como descarga limpia.
     */
    public function exportExcel(string $reportType, array $allowedBranchIds, array $filters): BinaryFileResponse
    {
        $branchId = ! empty($filters['branch_id']) && strtoupper((string) $filters['branch_id']) !== 'ALL'
            ? (int) $filters['branch_id']
            : null;

        $targetBranchIds = $branchId ? [$branchId] : $allowedBranchIds;
        $companyId = ! empty($filters['company_id']) ? (int) $filters['company_id'] : null;

        $dateFrom = Carbon::parse(! empty($filters['date_from']) ? $filters['date_from'] : now()->startOfMonth()->format('Y-m-d'))->startOfDay();
        $dateTo = Carbon::parse(! empty($filters['date_to']) ? $filters['date_to'] : now()->format('Y-m-d'))->endOfDay();
        $search = isset($filters['search']) && trim((string) $filters['search']) !== ''
            ? trim((string) $filters['search'])
            : null;

        $fileName = 'Reporte_'.$reportType.'_'.now()->format('Ymd_His').'.xlsx';
        $tempPath = tempnam(sys_get_temp_dir(), 'rep_').'.xlsx';

        $writer = SimpleExcelWriter::create($tempPath);

        match ($reportType) {
            'branch_inventory' => $this->exportBranchInventoryRows($writer, $targetBranchIds, $companyId, $search),
            'consolidated_inventory' => $this->exportConsolidatedInventoryRows($writer, $targetBranchIds, $companyId, $search),
            'kardex' => $this->exportKardexRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
            'inventory_exits' => $this->exportInventoryExitsRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
            'sales' => $this->exportSalesRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
            'purchases' => $this->exportPurchasesRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
            'payments' => $this->exportPaymentsRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
            'receivables' => $this->exportReceivablesRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
            'transfers' => $this->exportTransfersRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
            'daily_closings' => $this->exportDailyClosingsRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
            'offline_operations' => $this->exportOfflineOperationsRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
            'conflicts' => $this->exportConflictsRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
            default => $this->exportSalesRows($writer, $targetBranchIds, $dateFrom, $dateTo, $search),
        };

        $writer->close();

        return response()->download($tempPath, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
            'X-Content-Type-Options' => 'nosniff',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Búsqueda insensible a mayúsculas/minúsculas compatible con PostgreSQL 18.6 y SQLite.
     */
    protected function whereLikeInsensitive(Builder $query, string $column, string $search, bool $or = false): Builder
    {
        $pattern = '%'.mb_strtolower($search, 'UTF-8').'%';
        $method = $or ? 'orWhereRaw' : 'whereRaw';

        return $query->{$method}("LOWER({$column}) LIKE ?", [$pattern]);
    }

    /**
     * Filtra operaciones de sincronización por sucursal soportando tanto dispositivos físicos
     * como operaciones PWA desde navegador (donde device_id es NULL y la sucursal viene en payload o usuario).
     */
    protected function applySyncOperationBranchFilter(Builder $query, array $branchIds): Builder
    {
        if (empty($branchIds)) {
            return $query->whereRaw('1 = 0');
        }

        $branchIdsInt = array_values(array_map('intval', $branchIds));
        $branchIdsStr = array_values(array_map('strval', $branchIdsInt));
        $driver = DB::connection()->getDriverName();

        return $query->where(function (Builder $q) use ($branchIdsInt, $branchIdsStr, $driver) {
            $q->whereHas('device', fn (Builder $dq) => $dq->whereIn('branch_id', $branchIdsInt));

            if ($driver === 'pgsql') {
                $placeholders = implode(',', array_fill(0, count($branchIdsStr), '?'));
                $q->orWhereRaw("payload->>'branch_id' IN ({$placeholders})", $branchIdsStr);
                $q->orWhere(function (Builder $fallback) use ($branchIdsInt) {
                    $fallback->whereNull('device_id')
                        ->whereRaw("(payload->>'branch_id' IS NULL OR payload->>'branch_id' = '')")
                        ->whereHas('user', fn (Builder $uq) => $uq->whereIn('default_branch_id', $branchIdsInt));
                });
            } else {
                $placeholders = implode(',', array_fill(0, count($branchIdsStr), '?'));
                $q->orWhereRaw("CAST(json_extract(payload, '$.branch_id') AS TEXT) IN ({$placeholders})", $branchIdsStr);
                $q->orWhere(function (Builder $fallback) use ($branchIdsInt) {
                    $fallback->whereNull('device_id')
                        ->whereRaw("json_extract(payload, '$.branch_id') IS NULL")
                        ->whereHas('user', fn (Builder $uq) => $uq->whereIn('default_branch_id', $branchIdsInt));
                });
            }
        });
    }

    /**
     * Resuelve el nombre de la sucursal asociada a una operación offline o conflicto.
     */
    protected function resolveSyncBranchName(?SyncOperation $syncOp, ?array $fallbackState = null): string
    {
        if ($syncOp?->device?->branch?->name) {
            return $syncOp->device->branch->name;
        }

        $branchId = $fallbackState['branch_id']
            ?? ($syncOp?->payload['branch_id'] ?? null)
            ?? $syncOp?->user?->default_branch_id;

        if ($branchId && is_numeric($branchId)) {
            static $branchCache = [];
            $id = (int) $branchId;
            if (! array_key_exists($id, $branchCache)) {
                $branchCache[$id] = Branch::find($id)?->name ?? '-';
            }

            return $branchCache[$id];
        }

        return '-';
    }

    // ==========================================
    // 1. REPORTE DE INVENTARIO POR SUCURSAL
    // ==========================================
    protected function buildBranchInventoryQuery(array $branchIds, ?int $companyId, ?string $search): Builder
    {
        $query = Inventory::with(['product.brand', 'product.category', 'product.unit', 'branch'])
            ->whereIn('branch_id', $branchIds)
            ->whereHas('product', function (Builder $pq) use ($companyId, $search) {
                $pq->where('status', 'ACTIVE');
                if ($companyId) {
                    $pq->where('company_id', $companyId);
                }
                if ($search) {
                    $pq->where(function (Builder $sq) use ($search) {
                        $this->whereLikeInsensitive($sq, 'name', $search);
                        $this->whereLikeInsensitive($sq, 'primary_reference', $search, true);
                        $this->whereLikeInsensitive($sq, 'internal_code', $search, true);
                        $sq->orWhereHas('brand', fn (Builder $bq) => $this->whereLikeInsensitive($bq, 'name', $search));
                    });
                }
            });

        return $query;
    }

    protected function getBranchInventoryReport(array $branchIds, ?int $companyId, ?string $search, int $perPage): array
    {
        $query = $this->buildBranchInventoryQuery($branchIds, $companyId, $search);

        $totalUnits = (float) (clone $query)->sum('physical_quantity');
        $totalValuation = (float) (clone $query)->sum(DB::raw('physical_quantity * average_cost'));
        $totalItems = (clone $query)->count();

        $rows = $query->orderBy('branch_id')->orderBy('id', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'branch_inventory',
            'title' => 'Inventario por Sucursal',
            'description' => 'Existencias físicas, stock disponible, costos promedio y valorización total por tienda (foto actual).',
            'uses_date_range' => false,
            'kpis' => [
                ['label' => 'Total Ítems Registrados', 'value' => number_format($totalItems)],
                ['label' => 'Unidades Físicas en Stock', 'value' => number_format($totalUnits, 2)],
                ['label' => 'Valorización Total (S/)', 'value' => 'S/ '.number_format($totalValuation, 2)],
            ],
            'columns' => [
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'code', 'label' => 'Código / Referencia'],
                ['key' => 'product', 'label' => 'Producto'],
                ['key' => 'brand', 'label' => 'Marca'],
                ['key' => 'unit', 'label' => 'U.M.'],
                ['key' => 'physical_qty', 'label' => 'Stock Físico', 'align' => 'right', 'format' => 'number'],
                ['key' => 'available_qty', 'label' => 'Stock Disp.', 'align' => 'right', 'format' => 'number'],
                ['key' => 'avg_cost', 'label' => 'Costo Prom. (S/)', 'align' => 'right', 'format' => 'currency'],
                ['key' => 'valuation', 'label' => 'Valor Total (S/)', 'align' => 'right', 'format' => 'currency'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'branch' => $item->branch?->name ?? '-',
                'code' => $item->product?->primary_reference ?? $item->product?->internal_code ?? '-',
                'product' => $item->product?->name ?? '-',
                'brand' => $item->product?->brand?->name ?? '-',
                'unit' => $item->product?->unit?->code ?? 'NIU',
                'physical_qty' => round((float) $item->physical_quantity, 2),
                'available_qty' => round((float) $item->available_quantity, 2),
                'avg_cost' => round((float) $item->average_cost, 2),
                'valuation' => round((float) $item->physical_quantity * (float) $item->average_cost, 2),
            ]),
        ];
    }

    protected function exportBranchInventoryRows(SimpleExcelWriter $writer, array $branchIds, ?int $companyId, ?string $search): void
    {
        $query = $this->buildBranchInventoryQuery($branchIds, $companyId, $search);

        $query->orderBy('branch_id')->orderBy('id', 'desc')->chunk(500, function ($items) use ($writer) {
            foreach ($items as $item) {
                $writer->addRow([
                    'SUCURSAL' => $item->branch?->name ?? 'General',
                    'CODIGO' => $item->product?->primary_reference ?? $item->product?->internal_code ?? '-',
                    'PRODUCTO' => $item->product?->name ?? '-',
                    'MARCA' => $item->product?->brand?->name ?? '-',
                    'UNIDAD' => $item->product?->unit?->code ?? 'NIU',
                    'STOCK_FISICO' => round((float) $item->physical_quantity, 2),
                    'STOCK_DISPONIBLE' => round((float) $item->available_quantity, 2),
                    'COSTO_PROMEDIO' => round((float) $item->average_cost, 2),
                    'VALORIZACION_TOTAL' => round((float) $item->physical_quantity * (float) $item->average_cost, 2),
                ]);
            }
        });
    }

    // ==========================================
    // 2. REPORTE DE INVENTARIO CONSOLIDADO
    // ==========================================
    protected function buildConsolidatedInventoryQuery(array $branchIds, ?int $companyId, ?string $search): Builder
    {
        $query = Product::with(['brand', 'unit', 'inventories' => fn ($q) => $q->whereIn('branch_id', $branchIds)])
            ->where('status', 'ACTIVE');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $this->whereLikeInsensitive($q, 'name', $search);
                $this->whereLikeInsensitive($q, 'primary_reference', $search, true);
                $this->whereLikeInsensitive($q, 'internal_code', $search, true);
                $q->orWhereHas('brand', fn (Builder $bq) => $this->whereLikeInsensitive($bq, 'name', $search));
            });
        }

        return $query;
    }

    protected function getConsolidatedInventoryReport(array $branchIds, ?int $companyId, ?string $search, int $perPage): array
    {
        $branches = Branch::whereIn('id', $branchIds)->orderBy('name')->get();
        $query = $this->buildConsolidatedInventoryQuery($branchIds, $companyId, $search);

        $totalProducts = (clone $query)->count();
        $filteredProductIds = (clone $query)->select('id');

        $totalGlobalUnits = (float) Inventory::whereIn('branch_id', $branchIds)
            ->whereIn('product_id', $filteredProductIds)
            ->sum('physical_quantity');

        $totalGlobalVal = (float) Inventory::whereIn('branch_id', $branchIds)
            ->whereIn('product_id', $filteredProductIds)
            ->sum(DB::raw('physical_quantity * average_cost'));

        $rows = $query->orderBy('name')->paginate($perPage)->withQueryString();

        $cols = [
            ['key' => 'code', 'label' => 'Código'],
            ['key' => 'product', 'label' => 'Producto'],
            ['key' => 'brand', 'label' => 'Marca'],
        ];

        foreach ($branches as $b) {
            $cols[] = ['key' => 'branch_'.$b->id, 'label' => $b->name, 'align' => 'right', 'format' => 'number'];
        }

        $cols[] = ['key' => 'total_qty', 'label' => 'Stock Global', 'align' => 'right', 'format' => 'number'];
        $cols[] = ['key' => 'global_val', 'label' => 'Val. Global (S/)', 'align' => 'right', 'format' => 'currency'];

        return [
            'type' => 'consolidated_inventory',
            'title' => 'Inventario Consolidado Multitienda',
            'description' => 'Comparativo de existencias agrupadas por producto a través de las sucursales seleccionadas (foto actual).',
            'uses_date_range' => false,
            'kpis' => [
                ['label' => 'Catálogo Activo', 'value' => number_format($totalProducts)],
                ['label' => 'Stock Global Total', 'value' => number_format($totalGlobalUnits, 2)],
                ['label' => 'Valorización Global', 'value' => 'S/ '.number_format($totalGlobalVal, 2)],
            ],
            'columns' => $cols,
            'rows' => $rows->through(function ($prod) use ($branches) {
                $res = [
                    'id' => $prod->id,
                    'code' => $prod->primary_reference ?? $prod->internal_code ?? '-',
                    'product' => $prod->name,
                    'brand' => $prod->brand?->name ?? '-',
                ];

                $totalQty = 0.0;
                $totalVal = 0.0;

                foreach ($branches as $b) {
                    $inv = $prod->inventories->firstWhere('branch_id', $b->id);
                    $qty = $inv ? (float) $inv->physical_quantity : 0.0;
                    $cost = $inv ? (float) $inv->average_cost : 0.0;
                    $res['branch_'.$b->id] = round($qty, 2);
                    $totalQty += $qty;
                    $totalVal += ($qty * $cost);
                }

                $res['total_qty'] = round($totalQty, 2);
                $res['global_val'] = round($totalVal, 2);

                return $res;
            }),
        ];
    }

    protected function exportConsolidatedInventoryRows(SimpleExcelWriter $writer, array $branchIds, ?int $companyId, ?string $search): void
    {
        $branches = Branch::whereIn('id', $branchIds)->orderBy('name')->get();
        $query = $this->buildConsolidatedInventoryQuery($branchIds, $companyId, $search);

        $query->orderBy('name')->chunk(500, function ($prods) use ($writer, $branches) {
            foreach ($prods as $prod) {
                $row = [
                    'CODIGO' => $prod->primary_reference ?? $prod->internal_code ?? '-',
                    'PRODUCTO' => $prod->name,
                    'MARCA' => $prod->brand?->name ?? '-',
                ];
                $totalQty = 0.0;
                $totalVal = 0.0;
                foreach ($branches as $b) {
                    $inv = $prod->inventories->firstWhere('branch_id', $b->id);
                    $qty = $inv ? (float) $inv->physical_quantity : 0.0;
                    $cost = $inv ? (float) $inv->average_cost : 0.0;
                    $row['SUCURSAL_'.$b->name] = round($qty, 2);
                    $totalQty += $qty;
                    $totalVal += ($qty * $cost);
                }
                $row['TOTAL_GLOBAL'] = round($totalQty, 2);
                $row['VALORIZACION_GLOBAL'] = round($totalVal, 2);
                $writer->addRow($row);
            }
        });
    }

    // ==========================================
    // 3. REPORTE DE KARDEX
    // ==========================================
    protected function buildKardexQuery(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): Builder
    {
        $query = KardexEntry::with(['product', 'branch', 'user'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $this->whereLikeInsensitive($q, 'reference', $search);
                $this->whereLikeInsensitive($q, 'operation_type', $search, true);
                $q->orWhereHas('product', function (Builder $pq) use ($search) {
                    $this->whereLikeInsensitive($pq, 'name', $search);
                    $this->whereLikeInsensitive($pq, 'primary_reference', $search, true);
                    $this->whereLikeInsensitive($pq, 'internal_code', $search, true);
                });
            });
        }

        return $query;
    }

    protected function getKardexReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = $this->buildKardexQuery($branchIds, $from, $to, $search);

        $totalInputs = (float) (clone $query)->sum('input_quantity');
        $totalOutputs = (float) (clone $query)->sum('output_quantity');

        $rows = $query->orderBy('sequence_number', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'kardex',
            'title' => 'Reporte de Movimientos de Kardex',
            'description' => 'Historial de entradas, salidas y saldos físicos valorizados.',
            'uses_date_range' => true,
            'kpis' => [
                ['label' => 'Total Entradas (Unid.)', 'value' => number_format($totalInputs, 2)],
                ['label' => 'Total Salidas (Unid.)', 'value' => number_format($totalOutputs, 2)],
                ['label' => 'Operaciones en Período', 'value' => number_format($rows->total())],
            ],
            'columns' => [
                ['key' => 'sequence', 'label' => 'N° Sec.'],
                ['key' => 'date', 'label' => 'Fecha'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'operation', 'label' => 'Operación'],
                ['key' => 'reference', 'label' => 'Doc. Ref.'],
                ['key' => 'product', 'label' => 'Producto'],
                ['key' => 'input_qty', 'label' => 'Entrada', 'align' => 'right', 'format' => 'number'],
                ['key' => 'output_qty', 'label' => 'Salida', 'align' => 'right', 'format' => 'number'],
                ['key' => 'balance_qty', 'label' => 'Saldo', 'align' => 'right', 'format' => 'number'],
                ['key' => 'balance_cost', 'label' => 'Costo Unit. (S/)', 'align' => 'right', 'format' => 'currency'],
                ['key' => 'balance_total', 'label' => 'Total Saldo (S/)', 'align' => 'right', 'format' => 'currency'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'sequence' => $item->sequence_number,
                'date' => Carbon::parse($item->operation_date)->format('d/m/Y H:i'),
                'branch' => $item->branch?->name ?? '-',
                'operation' => $item->operation_type,
                'reference' => $item->reference ?? '-',
                'product' => $item->product?->name ?? '-',
                'input_qty' => round((float) $item->input_quantity, 2),
                'output_qty' => round((float) $item->output_quantity, 2),
                'balance_qty' => round((float) $item->balance_quantity, 2),
                'balance_cost' => round((float) $item->balance_unit_cost, 2),
                'balance_total' => round((float) $item->balance_total_cost, 2),
            ]),
        ];
    }

    protected function exportKardexRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = $this->buildKardexQuery($branchIds, $from, $to, $search);

        $query->orderBy('sequence_number', 'asc')->chunk(500, function ($entries) use ($writer) {
            foreach ($entries as $e) {
                $writer->addRow([
                    'SECUENCIA' => $e->sequence_number,
                    'FECHA' => Carbon::parse($e->operation_date)->format('d/m/Y H:i'),
                    'SUCURSAL' => $e->branch?->name ?? 'Central',
                    'OPERACION' => $e->operation_type,
                    'DOCUMENTO' => $e->reference ?? '-',
                    'PRODUCTO' => $e->product?->name ?? '-',
                    'ENTRADA' => round((float) $e->input_quantity, 2),
                    'SALIDA' => round((float) $e->output_quantity, 2),
                    'SALDO' => round((float) $e->balance_quantity, 2),
                    'COSTO_UNIT' => round((float) $e->balance_unit_cost, 2),
                    'TOTAL_VAL' => round((float) $e->balance_total_cost, 2),
                    'USUARIO' => $e->user?->name ?? 'Sistema',
                ]);
            }
        });
    }

    // ==========================================
    // 4. REPORTE DE SALIDAS DE ALMACÉN
    // ==========================================
    protected function buildInventoryExitsQuery(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): Builder
    {
        $query = InventoryExit::with(['branch', 'lines.product'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $this->whereLikeInsensitive($q, 'exit_number', $search);
                $this->whereLikeInsensitive($q, 'exit_type', $search, true);
                $this->whereLikeInsensitive($q, 'notes', $search, true);
                $q->orWhereHas('lines.product', fn (Builder $pq) => $this->whereLikeInsensitive($pq, 'name', $search));
            });
        }

        return $query;
    }

    protected function getInventoryExitsReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = $this->buildInventoryExitsQuery($branchIds, $from, $to, $search);

        $totalExits = (clone $query)->count();
        $confirmedExits = (clone $query)->where('status', 'CONFIRMED')->count();
        $rows = $query->orderBy('operation_date', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'inventory_exits',
            'title' => 'Reporte de Salidas de Almacén',
            'description' => 'Mermas, desmedros, consumos internos y ajustes de baja de stock.',
            'uses_date_range' => true,
            'kpis' => [
                ['label' => 'Total Comprobantes de Salida', 'value' => number_format($totalExits)],
                ['label' => 'Salidas Confirmadas', 'value' => number_format($confirmedExits)],
            ],
            'columns' => [
                ['key' => 'exit_number', 'label' => 'N° Salida'],
                ['key' => 'date', 'label' => 'Fecha'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'type', 'label' => 'Tipo de Salida'],
                ['key' => 'status', 'label' => 'Estado'],
                ['key' => 'items_count', 'label' => 'Ítems', 'align' => 'right'],
                ['key' => 'notes', 'label' => 'Motivo / Glosa'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'exit_number' => $item->exit_number,
                'date' => Carbon::parse($item->operation_date)->format('d/m/Y'),
                'branch' => $item->branch?->name ?? '-',
                'type' => $item->exit_type,
                'status' => $item->status,
                'items_count' => $item->lines->count(),
                'notes' => $item->notes ?? '-',
            ]),
        ];
    }

    protected function exportInventoryExitsRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = $this->buildInventoryExitsQuery($branchIds, $from, $to, $search);

        $query->orderBy('operation_date', 'asc')->chunk(300, function ($exits) use ($writer) {
            foreach ($exits as $exit) {
                if ($exit->lines->isEmpty()) {
                    $writer->addRow([
                        'NUMERO_SALIDA' => $exit->exit_number,
                        'FECHA' => Carbon::parse($exit->operation_date)->format('d/m/Y'),
                        'SUCURSAL' => $exit->branch?->name ?? '-',
                        'TIPO' => $exit->exit_type,
                        'ESTADO' => $exit->status,
                        'PRODUCTO' => '-',
                        'CANTIDAD' => 0,
                        'GLOSA' => $exit->notes ?? '-',
                    ]);

                    continue;
                }

                foreach ($exit->lines as $line) {
                    $writer->addRow([
                        'NUMERO_SALIDA' => $exit->exit_number,
                        'FECHA' => Carbon::parse($exit->operation_date)->format('d/m/Y'),
                        'SUCURSAL' => $exit->branch?->name ?? '-',
                        'TIPO' => $exit->exit_type,
                        'ESTADO' => $exit->status,
                        'PRODUCTO' => $line->product?->name ?? '-',
                        'CANTIDAD' => round((float) $line->quantity, 2),
                        'GLOSA' => $exit->notes ?? '-',
                    ]);
                }
            }
        });
    }

    // ==========================================
    // 5. REPORTE DE VENTAS
    // ==========================================
    protected function buildSalesQuery(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): Builder
    {
        $query = Sale::with(['branch', 'customer'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $this->whereLikeInsensitive($q, 'sale_number', $search);
                $this->whereLikeInsensitive($q, 'customer_name_snapshot', $search, true);
                $this->whereLikeInsensitive($q, 'customer_document_snapshot', $search, true);
                $q->orWhereHas('customer', function (Builder $cq) use ($search) {
                    $this->whereLikeInsensitive($cq, 'legal_name', $search);
                    $this->whereLikeInsensitive($cq, 'document_number', $search, true);
                });
            });
        }

        return $query;
    }

    protected function getSalesReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = $this->buildSalesQuery($branchIds, $from, $to, $search);

        $totalSalesAmount = (float) (clone $query)->where('status', 'CONFIRMED')->sum('total_amount');
        $totalSalesCount = (clone $query)->where('status', 'CONFIRMED')->count();
        $totalCredit = (float) (clone $query)->where('status', 'CONFIRMED')->where('payment_type', 'CREDIT')->sum('total_amount');
        $totalCash = (float) (clone $query)->where('status', 'CONFIRMED')->where('payment_type', 'CASH')->sum('total_amount');

        $rows = $query->orderBy('operation_date', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'sales',
            'title' => 'Reporte Oficial de Ventas',
            'description' => 'Facturación detallada por tipo de comprobante, cliente, condición de pago e impuestos.',
            'uses_date_range' => true,
            'kpis' => [
                ['label' => 'Ventas Confirmadas', 'value' => number_format($totalSalesCount)],
                ['label' => 'Total Facturado (S/)', 'value' => 'S/ '.number_format($totalSalesAmount, 2)],
                ['label' => 'Total al Contado', 'value' => 'S/ '.number_format($totalCash, 2)],
                ['label' => 'Total al Crédito', 'value' => 'S/ '.number_format($totalCredit, 2)],
            ],
            'columns' => [
                ['key' => 'sale_number', 'label' => 'N° Venta'],
                ['key' => 'date', 'label' => 'Fecha'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'doc_type', 'label' => 'Comprobante'],
                ['key' => 'customer', 'label' => 'Cliente'],
                ['key' => 'payment_type', 'label' => 'Condición'],
                ['key' => 'status', 'label' => 'Estado'],
                ['key' => 'subtotal', 'label' => 'Subtotal (S/)', 'align' => 'right', 'format' => 'currency'],
                ['key' => 'tax', 'label' => 'IGV (S/)', 'align' => 'right', 'format' => 'currency'],
                ['key' => 'total', 'label' => 'Total (S/)', 'align' => 'right', 'format' => 'currency'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'sale_number' => $item->sale_number,
                'date' => Carbon::parse($item->operation_date)->format('d/m/Y H:i'),
                'branch' => $item->branch?->name ?? '-',
                'doc_type' => $item->external_document_type ?? $item->sale_type,
                'customer' => $item->customer_name_snapshot ?: ($item->customer?->legal_name ?? 'Público General'),
                'payment_type' => $item->payment_type === 'CREDIT' ? 'Crédito' : 'Contado',
                'status' => $item->status,
                'subtotal' => round((float) $item->subtotal_amount, 2),
                'tax' => round((float) $item->tax_amount, 2),
                'total' => round((float) $item->total_amount, 2),
            ]),
        ];
    }

    protected function exportSalesRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = $this->buildSalesQuery($branchIds, $from, $to, $search);

        $query->orderBy('operation_date', 'asc')->chunk(500, function ($sales) use ($writer) {
            foreach ($sales as $s) {
                $writer->addRow([
                    'NUMERO_VENTA' => $s->sale_number,
                    'FECHA' => Carbon::parse($s->operation_date)->format('d/m/Y H:i'),
                    'SUCURSAL' => $s->branch?->name ?? '-',
                    'TIPO_COMPROBANTE' => $s->external_document_type ?? $s->sale_type,
                    'CLIENTE' => $s->customer_name_snapshot ?: ($s->customer?->legal_name ?? 'Público General'),
                    'DOCUMENTO_CLIENTE' => $s->customer_document_snapshot ?: ($s->customer?->document_number ?? '-'),
                    'CONDICION' => $s->payment_type === 'CREDIT' ? 'Crédito' : 'Contado',
                    'ESTADO' => $s->status,
                    'SUBTOTAL' => round((float) $s->subtotal_amount, 2),
                    'IGV' => round((float) $s->tax_amount, 2),
                    'TOTAL' => round((float) $s->total_amount, 2),
                ]);
            }
        });
    }

    // ==========================================
    // 6. REPORTE DE COMPRAS
    // ==========================================
    protected function buildPurchasesQuery(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): Builder
    {
        $fromDate = Carbon::instance($from)->toDateString();
        $toDate = Carbon::instance($to)->toDateString();

        $query = Purchase::with(['branch', 'supplier'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('document_date', [$fromDate, $toDate]);

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $this->whereLikeInsensitive($q, 'purchase_number', $search);
                $this->whereLikeInsensitive($q, 'supplier_document_number', $search, true);
                $q->orWhereHas('supplier', function (Builder $sq) use ($search) {
                    $this->whereLikeInsensitive($sq, 'legal_name', $search);
                    $this->whereLikeInsensitive($sq, 'trade_name', $search, true);
                    $this->whereLikeInsensitive($sq, 'document_number', $search, true);
                });
            });
        }

        return $query;
    }

    protected function getPurchasesReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = $this->buildPurchasesQuery($branchIds, $from, $to, $search);

        $totalPurchasesAmount = (float) (clone $query)->where('status', 'CONFIRMED')->sum('total_amount');
        $totalPurchasesCount = (clone $query)->where('status', 'CONFIRMED')->count();

        $rows = $query->orderBy('document_date', 'desc')->orderBy('id', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'purchases',
            'title' => 'Reporte de Compras',
            'description' => 'Registro de abastecimiento, proveedores, comprobantes de pago e impuestos.',
            'uses_date_range' => true,
            'kpis' => [
                ['label' => 'Total Compras Confirmadas', 'value' => number_format($totalPurchasesCount)],
                ['label' => 'Monto Total Comprado (S/)', 'value' => 'S/ '.number_format($totalPurchasesAmount, 2)],
            ],
            'columns' => [
                ['key' => 'purchase_number', 'label' => 'N° Compra'],
                ['key' => 'date', 'label' => 'Fecha Doc.'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'supplier', 'label' => 'Proveedor'],
                ['key' => 'doc_ref', 'label' => 'Comprobante Prov.'],
                ['key' => 'status', 'label' => 'Estado'],
                ['key' => 'subtotal', 'label' => 'Subtotal (S/)', 'align' => 'right', 'format' => 'currency'],
                ['key' => 'tax', 'label' => 'IGV (S/)', 'align' => 'right', 'format' => 'currency'],
                ['key' => 'total', 'label' => 'Total (S/)', 'align' => 'right', 'format' => 'currency'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'purchase_number' => $item->purchase_number,
                'date' => Carbon::parse($item->document_date)->format('d/m/Y'),
                'branch' => $item->branch?->name ?? '-',
                'supplier' => $item->supplier?->legal_name ?? '-',
                'doc_ref' => trim(($item->supplier_document_series ?? '').'-'.($item->supplier_document_number ?? ''), '-') ?: '-',
                'status' => $item->status,
                'subtotal' => round((float) $item->subtotal_amount, 2),
                'tax' => round((float) $item->tax_amount, 2),
                'total' => round((float) $item->total_amount, 2),
            ]),
        ];
    }

    protected function exportPurchasesRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = $this->buildPurchasesQuery($branchIds, $from, $to, $search);

        $query->orderBy('document_date', 'asc')->chunk(500, function ($purchases) use ($writer) {
            foreach ($purchases as $p) {
                $writer->addRow([
                    'NUMERO_COMPRA' => $p->purchase_number,
                    'FECHA' => Carbon::parse($p->document_date)->format('d/m/Y'),
                    'SUCURSAL' => $p->branch?->name ?? '-',
                    'PROVEEDOR' => $p->supplier?->legal_name ?? '-',
                    'RUC_DOCUMENTO' => $p->supplier?->document_number ?? '-',
                    'COMPROBANTE' => trim(($p->supplier_document_series ?? '').'-'.($p->supplier_document_number ?? ''), '-') ?: '-',
                    'ESTADO' => $p->status,
                    'SUBTOTAL' => round((float) $p->subtotal_amount, 2),
                    'IGV' => round((float) $p->tax_amount, 2),
                    'TOTAL' => round((float) $p->total_amount, 2),
                ]);
            }
        });
    }

    // ==========================================
    // 7. REPORTE DE PAGOS Y COBRANZAS
    // ==========================================
    protected function buildPaymentsQuery(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): Builder
    {
        $query = Payment::with(['branch', 'customer', 'creator', 'methodLines.method'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $this->whereLikeInsensitive($q, 'payment_number', $search);
                $q->orWhereHas('customer', function (Builder $cq) use ($search) {
                    $this->whereLikeInsensitive($cq, 'legal_name', $search);
                    $this->whereLikeInsensitive($cq, 'document_number', $search, true);
                });
                $q->orWhereHas('creator', fn (Builder $uq) => $this->whereLikeInsensitive($uq, 'name', $search));
            });
        }

        return $query;
    }

    protected function getPaymentsReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = $this->buildPaymentsQuery($branchIds, $from, $to, $search);

        $validStatuses = ['CONFIRMED', 'ACTIVE'];
        $totalCollected = (float) (clone $query)->whereIn('status', $validStatuses)->sum('total_amount');
        $totalPaymentsCount = (clone $query)->whereIn('status', $validStatuses)->count();

        $rows = $query->orderBy('operation_date', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'payments',
            'title' => 'Reporte de Cobranzas y Pagos Recibidos',
            'description' => 'Recibos de caja, abonos de créditos y métodos de amortización aplicados.',
            'uses_date_range' => true,
            'kpis' => [
                ['label' => 'Total Recibos Confirmados', 'value' => number_format($totalPaymentsCount)],
                ['label' => 'Total Cobrado (S/)', 'value' => 'S/ '.number_format($totalCollected, 2)],
            ],
            'columns' => [
                ['key' => 'payment_number', 'label' => 'N° Recibo'],
                ['key' => 'date', 'label' => 'Fecha'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'customer', 'label' => 'Cliente'],
                ['key' => 'methods', 'label' => 'Métodos de Pago'],
                ['key' => 'collector', 'label' => 'Cobrador'],
                ['key' => 'status', 'label' => 'Estado'],
                ['key' => 'total', 'label' => 'Monto (S/)', 'align' => 'right', 'format' => 'currency'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'payment_number' => $item->payment_number,
                'date' => Carbon::parse($item->operation_date)->format('d/m/Y H:i'),
                'branch' => $item->branch?->name ?? '-',
                'customer' => $item->customer?->legal_name ?? '-',
                'methods' => $item->methodLines->pluck('method.name')->filter()->join(', ') ?: 'Efectivo',
                'collector' => $item->creator?->name ?? 'Sistema',
                'status' => $item->status,
                'total' => round((float) $item->total_amount, 2),
            ]),
        ];
    }

    protected function exportPaymentsRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = $this->buildPaymentsQuery($branchIds, $from, $to, $search);

        $query->orderBy('operation_date', 'asc')->chunk(500, function ($payments) use ($writer) {
            foreach ($payments as $p) {
                $writer->addRow([
                    'RECIBO' => $p->payment_number,
                    'FECHA' => Carbon::parse($p->operation_date)->format('d/m/Y H:i'),
                    'SUCURSAL' => $p->branch?->name ?? '-',
                    'CLIENTE' => $p->customer?->legal_name ?? '-',
                    'DOCUMENTO_CLIENTE' => $p->customer?->document_number ?? '-',
                    'METODOS' => $p->methodLines->pluck('method.name')->filter()->join(', ') ?: 'Efectivo',
                    'COBRADOR' => $p->creator?->name ?? 'Sistema',
                    'ESTADO' => $p->status,
                    'TOTAL' => round((float) $p->total_amount, 2),
                ]);
            }
        });
    }

    // ==========================================
    // 8. REPORTE DE CUENTAS POR COBRAR
    // ==========================================
    protected function buildReceivablesQuery(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): Builder
    {
        $query = Receivable::with(['branch', 'customer', 'sale'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('issue_date', [$from, $to]);

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $q->whereHas('sale', fn (Builder $sq) => $this->whereLikeInsensitive($sq, 'sale_number', $search))
                    ->orWhereHas('customer', function (Builder $cq) use ($search) {
                        $this->whereLikeInsensitive($cq, 'legal_name', $search);
                        $this->whereLikeInsensitive($cq, 'document_number', $search, true);
                    });
                $this->whereLikeInsensitive($q, 'notes', $search, true);
            });
        }

        return $query;
    }

    protected function getReceivablesReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = $this->buildReceivablesQuery($branchIds, $from, $to, $search);

        $today = now()->startOfDay();
        $totalReceivableDebt = (float) (clone $query)
            ->where('status', 'ACTIVE')
            ->where('balance_amount', '>=', 0.01)
            ->sum('balance_amount');

        $overdueDebt = (float) (clone $query)
            ->where('status', 'ACTIVE')
            ->where('balance_amount', '>=', 0.01)
            ->where('due_date', '<', $today)
            ->sum('balance_amount');

        $activeCount = (clone $query)
            ->where('status', 'ACTIVE')
            ->where('balance_amount', '>=', 0.01)
            ->count();

        $rows = $query->orderBy('due_date', 'asc')->orderBy('id', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'receivables',
            'title' => 'Reporte de Cuentas por Cobrar y Cartera',
            'description' => 'Saldos pendientes de clientes, vencimientos y estado de amortizaciones según fecha de emisión.',
            'uses_date_range' => true,
            'kpis' => [
                ['label' => 'Cartera Total Activa (S/)', 'value' => 'S/ '.number_format($totalReceivableDebt, 2)],
                ['label' => 'Cartera Vencida (S/)', 'value' => 'S/ '.number_format($overdueDebt, 2)],
                ['label' => 'Créditos Activos', 'value' => number_format($activeCount)],
            ],
            'columns' => [
                ['key' => 'receivable_number', 'label' => 'N° Venta / Crédito'],
                ['key' => 'issue_date', 'label' => 'Emisión'],
                ['key' => 'customer', 'label' => 'Cliente'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'due_date', 'label' => 'Vencimiento'],
                ['key' => 'condition', 'label' => 'Situación'],
                ['key' => 'status', 'label' => 'Estado'],
                ['key' => 'original', 'label' => 'Deuda Inicial (S/)', 'align' => 'right', 'format' => 'currency'],
                ['key' => 'paid', 'label' => 'Amortizado (S/)', 'align' => 'right', 'format' => 'currency'],
                ['key' => 'balance', 'label' => 'Saldo Deudor (S/)', 'align' => 'right', 'format' => 'currency'],
            ],
            'rows' => $rows->through(function ($item) use ($today) {
                $original = (float) $item->original_amount;
                $balance = max(0.0, (float) $item->balance_amount);
                $paid = max(0.0, round($original - $balance, 2));
                $isOverdue = $item->status === 'ACTIVE' && $balance >= 0.01 && $item->due_date && Carbon::parse($item->due_date)->lt($today);

                return [
                    'id' => $item->id,
                    'receivable_number' => $item->sale?->sale_number ?? 'CXC-'.str_pad((string) $item->id, 6, '0', STR_PAD_LEFT),
                    'issue_date' => $item->issue_date ? Carbon::parse($item->issue_date)->format('d/m/Y') : '-',
                    'customer' => $item->customer?->legal_name ?? '-',
                    'branch' => $item->branch?->name ?? '-',
                    'due_date' => $item->due_date ? Carbon::parse($item->due_date)->format('d/m/Y') : '-',
                    'condition' => $item->status === 'CANCELLED'
                        ? 'ANULADO'
                        : ($isOverdue ? 'VENCIDO' : ($item->status === 'PAID' || $balance < 0.01 ? 'CANCELADO' : 'VIGENTE')),
                    'status' => $item->status,
                    'original' => round($original, 2),
                    'paid' => $paid,
                    'balance' => round($balance, 2),
                ];
            }),
        ];
    }

    protected function exportReceivablesRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = $this->buildReceivablesQuery($branchIds, $from, $to, $search);
        $today = now()->startOfDay();

        $query->orderBy('due_date', 'asc')->chunk(500, function ($recs) use ($writer, $today) {
            foreach ($recs as $r) {
                $original = (float) $r->original_amount;
                $balance = max(0.0, (float) $r->balance_amount);
                $paid = max(0.0, round($original - $balance, 2));
                $isOverdue = $r->status === 'ACTIVE' && $balance >= 0.01 && $r->due_date && Carbon::parse($r->due_date)->lt($today);

                $writer->addRow([
                    'NUMERO_CREDITO' => $r->sale?->sale_number ?? 'CXC-'.str_pad((string) $r->id, 6, '0', STR_PAD_LEFT),
                    'FECHA_EMISION' => $r->issue_date ? Carbon::parse($r->issue_date)->format('d/m/Y') : '-',
                    'CLIENTE' => $r->customer?->legal_name ?? '-',
                    'DOCUMENTO_CLIENTE' => $r->customer?->document_number ?? '-',
                    'SUCURSAL' => $r->branch?->name ?? '-',
                    'VENCIMIENTO' => $r->due_date ? Carbon::parse($r->due_date)->format('d/m/Y') : '-',
                    'SITUACION' => $r->status === 'CANCELLED'
                        ? 'ANULADO'
                        : ($isOverdue ? 'VENCIDO' : ($r->status === 'PAID' || $balance < 0.01 ? 'CANCELADO' : 'VIGENTE')),
                    'ESTADO' => $r->status,
                    'TOTAL_ORIGINAL' => round($original, 2),
                    'AMORTIZADO' => $paid,
                    'SALDO_PENDIENTE' => round($balance, 2),
                ]);
            }
        });
    }

    // ==========================================
    // 9. REPORTE DE TRANSFERENCIAS
    // ==========================================
    protected function buildTransfersQuery(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): Builder
    {
        $query = Transfer::with(['sourceBranch', 'destinationBranch', 'creator'])
            ->where(function (Builder $q) use ($branchIds) {
                $q->whereIn('source_branch_id', $branchIds)
                    ->orWhereIn('destination_branch_id', $branchIds);
            })
            ->whereBetween('request_date', [$from, $to]);

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $this->whereLikeInsensitive($q, 'transfer_number', $search);
                $this->whereLikeInsensitive($q, 'notes', $search, true);
                $q->orWhereHas('sourceBranch', fn (Builder $bq) => $this->whereLikeInsensitive($bq, 'name', $search))
                    ->orWhereHas('destinationBranch', fn (Builder $bq) => $this->whereLikeInsensitive($bq, 'name', $search))
                    ->orWhereHas('creator', fn (Builder $uq) => $this->whereLikeInsensitive($uq, 'name', $search));
            });
        }

        return $query;
    }

    protected function getTransfersReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = $this->buildTransfersQuery($branchIds, $from, $to, $search);

        $totalTransfers = (clone $query)->count();
        $completedTransfers = (clone $query)->where('status', 'COMPLETED')->count();
        $pendingTransfers = (clone $query)->whereIn('status', ['DRAFT', 'PENDING', 'IN_TRANSIT', 'PARTIAL'])->count();

        $rows = $query->orderBy('request_date', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'transfers',
            'title' => 'Reporte de Transferencias Intersucursales',
            'description' => 'Traslados internos de mercadería, estados de despacho y recepción en tiendas.',
            'uses_date_range' => true,
            'kpis' => [
                ['label' => 'Total Transferencias', 'value' => number_format($totalTransfers)],
                ['label' => 'Completadas y Recibidas', 'value' => number_format($completedTransfers)],
                ['label' => 'En Tránsito / Pendientes', 'value' => number_format($pendingTransfers)],
            ],
            'columns' => [
                ['key' => 'transfer_number', 'label' => 'N° Traslado'],
                ['key' => 'date', 'label' => 'Fecha'],
                ['key' => 'source', 'label' => 'Origen'],
                ['key' => 'destination', 'label' => 'Destino'],
                ['key' => 'creator', 'label' => 'Solicitante'],
                ['key' => 'status', 'label' => 'Estado'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'transfer_number' => $item->transfer_number,
                'date' => Carbon::parse($item->request_date)->format('d/m/Y H:i'),
                'source' => $item->sourceBranch?->name ?? '-',
                'destination' => $item->destinationBranch?->name ?? '-',
                'creator' => $item->creator?->name ?? '-',
                'status' => $item->status,
            ]),
        ];
    }

    protected function exportTransfersRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = $this->buildTransfersQuery($branchIds, $from, $to, $search);

        $query->orderBy('request_date', 'asc')->chunk(500, function ($trs) use ($writer) {
            foreach ($trs as $t) {
                $writer->addRow([
                    'NUMERO' => $t->transfer_number,
                    'FECHA' => Carbon::parse($t->request_date)->format('d/m/Y H:i'),
                    'ORIGEN' => $t->sourceBranch?->name ?? '-',
                    'DESTINO' => $t->destinationBranch?->name ?? '-',
                    'SOLICITANTE' => $t->creator?->name ?? '-',
                    'ESTADO' => $t->status,
                ]);
            }
        });
    }

    // ==========================================
    // 10. REPORTE DE CIERRES DIARIOS
    // ==========================================
    protected function buildDailyClosingsQuery(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): Builder
    {
        $fromDate = Carbon::instance($from)->toDateString();
        $toDate = Carbon::instance($to)->toDateString();

        $query = DailyClosing::with(['branch', 'openedByUser', 'closedByUser', 'latestVersion'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('closing_date', [$fromDate, $toDate]);

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $this->whereLikeInsensitive($q, 'status', $search);
                $this->whereLikeInsensitive($q, 'notes', $search, true);
                $q->orWhereHas('branch', fn (Builder $bq) => $this->whereLikeInsensitive($bq, 'name', $search))
                    ->orWhereHas('openedByUser', fn (Builder $uq) => $this->whereLikeInsensitive($uq, 'name', $search))
                    ->orWhereHas('closedByUser', fn (Builder $uq) => $this->whereLikeInsensitive($uq, 'name', $search));
            });
        }

        return $query;
    }

    protected function getDailyClosingsReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = $this->buildDailyClosingsQuery($branchIds, $from, $to, $search);

        $closedClosings = (clone $query)->where('status', 'CLOSED')->get();
        $totalExpected = (float) $closedClosings->sum(fn ($c) => (float) ($c->latestVersion?->total_expected ?? 0));
        $totalClosings = $closedClosings->count();

        $rows = $query->orderBy('closing_date', 'desc')->orderBy('id', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'daily_closings',
            'title' => 'Reporte Histórico de Cierres Diarios',
            'description' => 'Arqueos diarios de caja, ventas registradas, dinero físico reportado y diferencias.',
            'uses_date_range' => true,
            'kpis' => [
                ['label' => 'Total Cierres Definitivos', 'value' => number_format($totalClosings)],
                ['label' => 'Total Esperado en Cierres', 'value' => 'S/ '.number_format($totalExpected, 2)],
            ],
            'columns' => [
                ['key' => 'date', 'label' => 'Fecha Cierre'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'cashier', 'label' => 'Cajero / Apertura'],
                ['key' => 'confirmer', 'label' => 'Cerrado Por'],
                ['key' => 'status', 'label' => 'Estado'],
                ['key' => 'sales', 'label' => 'Esperado (S/)', 'align' => 'right', 'format' => 'currency'],
                ['key' => 'counted', 'label' => 'Físico (S/)', 'align' => 'right', 'format' => 'currency'],
                ['key' => 'difference', 'label' => 'Diferencia (S/)', 'align' => 'right', 'format' => 'currency'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'date' => Carbon::parse($item->closing_date)->format('d/m/Y'),
                'branch' => $item->branch?->name ?? '-',
                'cashier' => $item->openedByUser?->name ?? '-',
                'confirmer' => $item->closedByUser?->name ?? '-',
                'status' => $item->status,
                'sales' => round((float) ($item->latestVersion?->total_expected ?? 0), 2),
                'counted' => round((float) ($item->latestVersion?->total_counted ?? 0), 2),
                'difference' => round((float) ($item->latestVersion?->total_difference ?? 0), 2),
            ]),
        ];
    }

    protected function exportDailyClosingsRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = $this->buildDailyClosingsQuery($branchIds, $from, $to, $search);

        $query->orderBy('closing_date', 'asc')->chunk(500, function ($closings) use ($writer) {
            foreach ($closings as $c) {
                $writer->addRow([
                    'FECHA' => Carbon::parse($c->closing_date)->format('d/m/Y'),
                    'SUCURSAL' => $c->branch?->name ?? '-',
                    'APERTURA_POR' => $c->openedByUser?->name ?? '-',
                    'CERRADO_POR' => $c->closedByUser?->name ?? '-',
                    'ESTADO' => $c->status,
                    'TOTAL_ESPERADO' => round((float) ($c->latestVersion?->total_expected ?? 0), 2),
                    'TOTAL_FISICO' => round((float) ($c->latestVersion?->total_counted ?? 0), 2),
                    'DIFERENCIA' => round((float) ($c->latestVersion?->total_difference ?? 0), 2),
                ]);
            }
        });
    }

    // ==========================================
    // 11. REPORTE DE OPERACIONES OFFLINE
    // ==========================================
    protected function buildOfflineOperationsQuery(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): Builder
    {
        $query = SyncOperation::with(['device.branch', 'user'])
            ->whereBetween('created_at', [$from, $to]);

        $this->applySyncOperationBranchFilter($query, $branchIds);

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $this->whereLikeInsensitive($q, 'entity_type', $search);
                $this->whereLikeInsensitive($q, 'operation_type', $search, true);
                $this->whereLikeInsensitive($q, 'status', $search, true);
                $q->orWhereHas('user', fn (Builder $uq) => $this->whereLikeInsensitive($uq, 'name', $search));
            });
        }

        return $query;
    }

    protected function getOfflineOperationsReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = $this->buildOfflineOperationsQuery($branchIds, $from, $to, $search);

        $totalOps = (clone $query)->count();
        $syncedOps = (clone $query)->whereIn('status', ['SUCCESS', 'APPLIED'])->count();
        $conflictedOps = (clone $query)->where('status', 'CONFLICT')->count();

        $rows = $query->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'offline_operations',
            'title' => 'Trazabilidad de Operaciones Offline',
            'description' => 'Monitoreo de sincronización, operaciones encoladas por terminales y tiempos de procesamiento.',
            'uses_date_range' => true,
            'kpis' => [
                ['label' => 'Total Operaciones Registradas', 'value' => number_format($totalOps)],
                ['label' => 'Aplicadas Exitosamente', 'value' => number_format($syncedOps)],
                ['label' => 'Conflictos Generados', 'value' => number_format($conflictedOps)],
            ],
            'columns' => [
                ['key' => 'date', 'label' => 'Fecha Cliente'],
                ['key' => 'device', 'label' => 'Dispositivo / Terminal'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'user', 'label' => 'Usuario'],
                ['key' => 'entity', 'label' => 'Entidad'],
                ['key' => 'operation', 'label' => 'Acción'],
                ['key' => 'status', 'label' => 'Estado'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'date' => Carbon::parse($item->client_timestamp ?? $item->created_at)->format('d/m/Y H:i'),
                'device' => $item->device?->name ?? 'Navegador PWA',
                'branch' => $this->resolveSyncBranchName($item),
                'user' => $item->user?->name ?? '-',
                'entity' => $item->entity_type,
                'operation' => $item->operation_type,
                'status' => $item->status,
            ]),
        ];
    }

    protected function exportOfflineOperationsRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = $this->buildOfflineOperationsQuery($branchIds, $from, $to, $search);

        $query->orderBy('created_at', 'asc')->chunk(500, function ($ops) use ($writer) {
            foreach ($ops as $op) {
                $writer->addRow([
                    'FECHA' => Carbon::parse($op->client_timestamp ?? $op->created_at)->format('d/m/Y H:i'),
                    'DISPOSITIVO' => $op->device?->name ?? 'Navegador PWA',
                    'SUCURSAL' => $this->resolveSyncBranchName($op),
                    'USUARIO' => $op->user?->name ?? '-',
                    'ENTIDAD' => $op->entity_type,
                    'ACCION' => $op->operation_type,
                    'ESTADO' => $op->status,
                ]);
            }
        });
    }

    // ==========================================
    // 12. REPORTE DE CONFLICTOS
    // ==========================================
    protected function buildConflictsQuery(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): Builder
    {
        $query = Conflict::with(['syncOperation.device.branch', 'syncOperation.user', 'resolver'])
            ->whereBetween('created_at', [$from, $to]);

        if (empty($branchIds)) {
            $query->whereRaw('1 = 0');
        } else {
            $branchIdsStr = array_values(array_map(fn ($id) => (string) (int) $id, $branchIds));
            $driver = DB::connection()->getDriverName();

            $query->where(function (Builder $q) use ($branchIds, $branchIdsStr, $driver) {
                $q->whereHas('syncOperation', fn (Builder $sq) => $this->applySyncOperationBranchFilter($sq, $branchIds));

                $placeholders = implode(',', array_fill(0, count($branchIdsStr), '?'));
                if ($driver === 'pgsql') {
                    $q->orWhereRaw("client_state->>'branch_id' IN ({$placeholders})", $branchIdsStr);
                } else {
                    $q->orWhereRaw("CAST(json_extract(client_state, '$.branch_id') AS TEXT) IN ({$placeholders})", $branchIdsStr);
                }
            });
        }

        if ($search) {
            $query->where(function (Builder $q) use ($search) {
                $this->whereLikeInsensitive($q, 'conflict_type', $search);
                $this->whereLikeInsensitive($q, 'entity_type', $search, true);
                $this->whereLikeInsensitive($q, 'resolution_notes', $search, true);
                $this->whereLikeInsensitive($q, 'status', $search, true);
            });
        }

        return $query;
    }

    protected function getConflictsReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = $this->buildConflictsQuery($branchIds, $from, $to, $search);

        $totalConflicts = (clone $query)->count();
        $resolvedConflicts = (clone $query)->whereIn('status', ['RESOLVED', 'RESOLVED_FORCE', 'REJECTED'])->count();
        $pendingConflicts = (clone $query)->whereIn('status', ['PENDING', 'UNRESOLVED'])->count();

        $rows = $query->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();

        return [
            'type' => 'conflicts',
            'title' => 'Auditoría de Conflictos de Sincronización',
            'description' => 'Historial de discrepancias detectadas, resoluciones tomadas y responsables.',
            'uses_date_range' => true,
            'kpis' => [
                ['label' => 'Total Incidentes Registrados', 'value' => number_format($totalConflicts)],
                ['label' => 'Conflictos Resueltos', 'value' => number_format($resolvedConflicts)],
                ['label' => 'Pendientes por Resolver', 'value' => number_format($pendingConflicts)],
            ],
            'columns' => [
                ['key' => 'date', 'label' => 'Fecha Detección'],
                ['key' => 'conflict_type', 'label' => 'Tipo de Conflicto'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'reason', 'label' => 'Causa / Notas'],
                ['key' => 'status', 'label' => 'Estado'],
                ['key' => 'resolver', 'label' => 'Resuelto Por'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'date' => Carbon::parse($item->created_at)->format('d/m/Y H:i'),
                'conflict_type' => $item->conflict_type,
                'branch' => $this->resolveSyncBranchName($item->syncOperation, is_array($item->client_state) ? $item->client_state : null),
                'reason' => $item->resolution_notes ?: ($item->syncOperation?->error_message ?? '-'),
                'status' => $item->status,
                'resolver' => $item->resolver?->name ?? '-',
            ]),
        ];
    }

    protected function exportConflictsRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = $this->buildConflictsQuery($branchIds, $from, $to, $search);

        $query->orderBy('created_at', 'asc')->chunk(500, function ($confs) use ($writer) {
            foreach ($confs as $c) {
                $writer->addRow([
                    'FECHA' => Carbon::parse($c->created_at)->format('d/m/Y H:i'),
                    'TIPO' => $c->conflict_type,
                    'SUCURSAL' => $this->resolveSyncBranchName($c->syncOperation, is_array($c->client_state) ? $c->client_state : null),
                    'MOTIVO_NOTAS' => $c->resolution_notes ?: ($c->syncOperation?->error_message ?? '-'),
                    'ESTADO' => $c->status,
                    'RESUELTO_POR' => $c->resolver?->name ?? '-',
                ]);
            }
        });
    }
}
