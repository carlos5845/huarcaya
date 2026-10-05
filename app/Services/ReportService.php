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
use Illuminate\Support\Facades\DB;
use Spatie\SimpleExcel\SimpleExcelWriter;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportService
{
    /**
     * Retorna la información y filas paginadas de un tipo de reporte.
     */
    public function getReportData(string $reportType, array $allowedBranchIds, array $filters, int $perPage = 15): array
    {
        $branchId = ! empty($filters['branch_id']) && $filters['branch_id'] !== 'ALL'
            ? (int) $filters['branch_id']
            : null;

        $targetBranchIds = $branchId ? [$branchId] : $allowedBranchIds;

        $dateFrom = Carbon::parse($filters['date_from'] ?? now()->startOfMonth())->startOfDay();
        $dateTo = Carbon::parse($filters['date_to'] ?? now())->endOfDay();
        $search = $filters['search'] ?? null;

        return match ($reportType) {
            'branch_inventory' => $this->getBranchInventoryReport($targetBranchIds, $search, $perPage),
            'consolidated_inventory' => $this->getConsolidatedInventoryReport($targetBranchIds, $search, $perPage),
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
     * Exporta el reporte solicitado a un archivo Excel (.xlsx) transmitido vía streaming.
     */
    public function exportExcel(string $reportType, array $allowedBranchIds, array $filters): StreamedResponse
    {
        $branchId = ! empty($filters['branch_id']) && $filters['branch_id'] !== 'ALL'
            ? (int) $filters['branch_id']
            : null;
        $targetBranchIds = $branchId ? [$branchId] : $allowedBranchIds;

        $dateFrom = Carbon::parse($filters['date_from'] ?? now()->startOfMonth())->startOfDay();
        $dateTo = Carbon::parse($filters['date_to'] ?? now())->endOfDay();
        $search = $filters['search'] ?? null;

        $fileName = 'Reporte_'.$reportType.'_'.now()->format('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($reportType, $targetBranchIds, $dateFrom, $dateTo, $search) {
            $writer = SimpleExcelWriter::create('php://output', 'xlsx');

            match ($reportType) {
                'branch_inventory' => $this->exportBranchInventoryRows($writer, $targetBranchIds, $search),
                'consolidated_inventory' => $this->exportConsolidatedInventoryRows($writer, $targetBranchIds, $search),
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
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    // ==========================================
    // 1. REPORTE DE INVENTARIO POR SUCURSAL
    // ==========================================
    protected function getBranchInventoryReport(array $branchIds, ?string $search, int $perPage): array
    {
        $query = Inventory::with(['product.brand', 'product.category', 'product.unit', 'branch'])
            ->whereIn('branch_id', $branchIds);

        if ($search) {
            $query->whereHas('product', function ($q) use ($search) {
                $term = '%'.$search.'%';
                $q->where('name', 'like', $term)
                    ->orWhere('primary_reference', 'like', $term)
                    ->orWhere('internal_code', 'like', $term);
            });
        }

        $totalUnits = (float) (clone $query)->sum('physical_quantity');
        $totalValuation = (float) (clone $query)->sum(DB::raw('physical_quantity * average_cost'));
        $totalItems = (clone $query)->count();

        $rows = $query->orderBy('branch_id')->orderBy('id', 'desc')->paginate($perPage);

        return [
            'type' => 'branch_inventory',
            'title' => 'Inventario por Sucursal',
            'description' => 'Existencias físicas, stock disponible, costos promedio y valorización total por tienda.',
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
                ['key' => 'physical_qty', 'label' => 'Stock Físico', 'align' => 'right'],
                ['key' => 'available_qty', 'label' => 'Stock Disp.', 'align' => 'right'],
                ['key' => 'avg_cost', 'label' => 'Costo Prom. (S/)', 'align' => 'right'],
                ['key' => 'valuation', 'label' => 'Valor Total (S/)', 'align' => 'right'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'branch' => $item->branch?->name ?? '-',
                'code' => $item->product?->primary_reference ?? $item->product?->internal_code ?? '-',
                'product' => $item->product?->name ?? '-',
                'brand' => $item->product?->brand?->name ?? '-',
                'unit' => $item->product?->unit?->code ?? 'NIU',
                'physical_qty' => (float) $item->physical_quantity,
                'available_qty' => (float) $item->available_quantity,
                'avg_cost' => (float) $item->average_cost,
                'valuation' => round((float) $item->physical_quantity * (float) $item->average_cost, 2),
            ]),
        ];
    }

    protected function exportBranchInventoryRows(SimpleExcelWriter $writer, array $branchIds, ?string $search): void
    {
        $query = Inventory::with(['product.brand', 'product.unit', 'branch'])
            ->whereIn('branch_id', $branchIds);

        if ($search) {
            $query->whereHas('product', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        $query->chunk(500, function ($items) use ($writer) {
            foreach ($items as $item) {
                $writer->addRow([
                    'SUCURSAL' => $item->branch?->name ?? 'General',
                    'CODIGO' => $item->product?->primary_reference ?? '-',
                    'PRODUCTO' => $item->product?->name ?? '-',
                    'MARCA' => $item->product?->brand?->name ?? '-',
                    'UNIDAD' => $item->product?->unit?->code ?? 'NIU',
                    'STOCK_FISICO' => (float) $item->physical_quantity,
                    'STOCK_DISPONIBLE' => (float) $item->available_quantity,
                    'COSTO_PROMEDIO' => (float) $item->average_cost,
                    'VALORIZACION_TOTAL' => round((float) $item->physical_quantity * (float) $item->average_cost, 2),
                ]);
            }
        });
    }

    // ==========================================
    // 2. REPORTE DE INVENTARIO CONSOLIDADO
    // ==========================================
    protected function getConsolidatedInventoryReport(array $branchIds, ?string $search, int $perPage): array
    {
        $branches = Branch::whereIn('id', $branchIds)->orderBy('name')->get();

        $query = Product::with(['brand', 'unit', 'inventories' => fn ($q) => $q->whereIn('branch_id', $branchIds)])
            ->where('status', 'ACTIVE');

        if ($search) {
            $term = '%'.$search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('primary_reference', 'like', $term)
                    ->orWhere('internal_code', 'like', $term);
            });
        }

        $totalProducts = (clone $query)->count();
        $totalGlobalUnits = (float) Inventory::whereIn('branch_id', $branchIds)->sum('physical_quantity');
        $totalGlobalVal = (float) Inventory::whereIn('branch_id', $branchIds)->sum(DB::raw('physical_quantity * average_cost'));

        $rows = $query->orderBy('name')->paginate($perPage);

        $cols = [
            ['key' => 'code', 'label' => 'Código'],
            ['key' => 'product', 'label' => 'Producto'],
            ['key' => 'brand', 'label' => 'Marca'],
        ];

        foreach ($branches as $b) {
            $cols[] = ['key' => 'branch_'.$b->id, 'label' => $b->name, 'align' => 'right'];
        }

        $cols[] = ['key' => 'total_qty', 'label' => 'Stock Global', 'align' => 'right'];
        $cols[] = ['key' => 'global_val', 'label' => 'Val. Global (S/)', 'align' => 'right'];

        return [
            'type' => 'consolidated_inventory',
            'title' => 'Inventario Consolidado Multitienda',
            'description' => 'Comparativo de existencias agrupadas por producto a través de todas las sucursales.',
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

                $totalQty = 0;
                $totalVal = 0;

                foreach ($branches as $b) {
                    $inv = $prod->inventories->firstWhere('branch_id', $b->id);
                    $qty = $inv ? (float) $inv->physical_quantity : 0.0;
                    $cost = $inv ? (float) $inv->average_cost : 0.0;
                    $res['branch_'.$b->id] = $qty;
                    $totalQty += $qty;
                    $totalVal += ($qty * $cost);
                }

                $res['total_qty'] = $totalQty;
                $res['global_val'] = round($totalVal, 2);

                return $res;
            }),
        ];
    }

    protected function exportConsolidatedInventoryRows(SimpleExcelWriter $writer, array $branchIds, ?string $search): void
    {
        $branches = Branch::whereIn('id', $branchIds)->orderBy('name')->get();
        $query = Product::with(['brand', 'inventories' => fn ($q) => $q->whereIn('branch_id', $branchIds)])
            ->where('status', 'ACTIVE');

        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        $query->chunk(500, function ($prods) use ($writer, $branches) {
            foreach ($prods as $prod) {
                $row = [
                    'CODIGO' => $prod->primary_reference ?? '-',
                    'PRODUCTO' => $prod->name,
                    'MARCA' => $prod->brand?->name ?? '-',
                ];
                $totalQty = 0;
                foreach ($branches as $b) {
                    $inv = $prod->inventories->firstWhere('branch_id', $b->id);
                    $qty = $inv ? (float) $inv->physical_quantity : 0;
                    $row['SUCURSAL_'.$b->name] = $qty;
                    $totalQty += $qty;
                }
                $row['TOTAL_GLOBAL'] = $totalQty;
                $writer->addRow($row);
            }
        });
    }

    // ==========================================
    // 3. REPORTE DE KARDEX
    // ==========================================
    protected function getKardexReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = KardexEntry::with(['product', 'branch', 'user'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        if ($search) {
            $term = '%'.$search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('reference', 'like', $term)
                    ->orWhere('operation_type', 'like', $term)
                    ->orWhereHas('product', fn ($pq) => $pq->where('name', 'like', $term));
            });
        }

        $totalInputs = (float) (clone $query)->sum('input_quantity');
        $totalOutputs = (float) (clone $query)->sum('output_quantity');

        $rows = $query->orderBy('sequence_number', 'desc')->paginate($perPage);

        return [
            'type' => 'kardex',
            'title' => 'Reporte de Movimientos de Kardex',
            'description' => 'Historial de entradas, salidas y saldos físicos valorizados.',
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
                ['key' => 'input_qty', 'label' => 'Entrada', 'align' => 'right'],
                ['key' => 'output_qty', 'label' => 'Salida', 'align' => 'right'],
                ['key' => 'balance_qty', 'label' => 'Saldo', 'align' => 'right'],
                ['key' => 'balance_cost', 'label' => 'Costo Unit. (S/)', 'align' => 'right'],
                ['key' => 'balance_total', 'label' => 'Total Saldo (S/)', 'align' => 'right'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'sequence' => $item->sequence_number,
                'date' => Carbon::parse($item->operation_date)->format('d/m/Y H:i'),
                'branch' => $item->branch?->name ?? '-',
                'operation' => $item->operation_type,
                'reference' => $item->reference ?? '-',
                'product' => $item->product?->name ?? '-',
                'input_qty' => (float) $item->input_quantity,
                'output_qty' => (float) $item->output_quantity,
                'balance_qty' => (float) $item->balance_quantity,
                'balance_cost' => (float) $item->balance_unit_cost,
                'balance_total' => (float) $item->balance_total_cost,
            ]),
        ];
    }

    protected function exportKardexRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = KardexEntry::with(['product', 'branch', 'user'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        if ($search) {
            $query->whereHas('product', fn ($pq) => $pq->where('name', 'like', "%{$search}%"));
        }

        $query->orderBy('sequence_number', 'asc')->chunk(500, function ($entries) use ($writer) {
            foreach ($entries as $e) {
                $writer->addRow([
                    'SECUENCIA' => $e->sequence_number,
                    'FECHA' => Carbon::parse($e->operation_date)->format('d/m/Y H:i'),
                    'SUCURSAL' => $e->branch?->name ?? 'Central',
                    'OPERACION' => $e->operation_type,
                    'DOCUMENTO' => $e->reference ?? '-',
                    'PRODUCTO' => $e->product?->name ?? '-',
                    'ENTRADA' => (float) $e->input_quantity,
                    'SALIDA' => (float) $e->output_quantity,
                    'SALDO' => (float) $e->balance_quantity,
                    'COSTO_UNIT' => (float) $e->balance_unit_cost,
                    'TOTAL_VAL' => (float) $e->balance_total_cost,
                    'USUARIO' => $e->user?->name ?? 'Sistema',
                ]);
            }
        });
    }

    // ==========================================
    // 4. REPORTE DE SALIDAS DE ALMACÉN
    // ==========================================
    protected function getInventoryExitsReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = InventoryExit::with(['branch', 'lines.product'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        if ($search) {
            $query->where('exit_number', 'like', "%{$search}%");
        }

        $totalExits = (clone $query)->count();
        $rows = $query->orderBy('operation_date', 'desc')->paginate($perPage);

        return [
            'type' => 'inventory_exits',
            'title' => 'Reporte de Salidas de Almacén',
            'description' => 'Mermas, desmedros, consumos internos y ajustes de baja de stock.',
            'kpis' => [
                ['label' => 'Total Comprobantes de Salida', 'value' => number_format($totalExits)],
                ['label' => 'Salidas Confirmadas', 'value' => number_format((clone $query)->where('status', 'CONFIRMED')->count())],
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
        $query = InventoryExit::with(['branch', 'lines.product'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        $query->chunk(300, function ($exits) use ($writer) {
            foreach ($exits as $exit) {
                foreach ($exit->lines as $line) {
                    $writer->addRow([
                        'NUMERO_SALIDA' => $exit->exit_number,
                        'FECHA' => Carbon::parse($exit->operation_date)->format('d/m/Y'),
                        'SUCURSAL' => $exit->branch?->name ?? '-',
                        'TIPO' => $exit->exit_type,
                        'ESTADO' => $exit->status,
                        'PRODUCTO' => $line->product?->name ?? '-',
                        'CANTIDAD' => (float) $line->quantity,
                        'GLOSA' => $exit->notes ?? '-',
                    ]);
                }
            }
        });
    }

    // ==========================================
    // 5. REPORTE DE VENTAS
    // ==========================================
    protected function getSalesReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = Sale::with(['branch', 'customer'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        if ($search) {
            $term = '%'.$search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('sale_number', 'like', $term)
                    ->orWhere('customer_name_snapshot', 'like', $term)
                    ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'like', $term));
            });
        }

        $totalSalesAmount = (float) (clone $query)->where('status', 'CONFIRMED')->sum('total_amount');
        $totalSalesCount = (clone $query)->where('status', 'CONFIRMED')->count();
        $totalCredit = (float) (clone $query)->where('status', 'CONFIRMED')->where('payment_type', 'CREDIT')->sum('total_amount');
        $totalCash = (float) (clone $query)->where('status', 'CONFIRMED')->where('payment_type', 'CASH')->sum('total_amount');

        $rows = $query->orderBy('operation_date', 'desc')->paginate($perPage);

        return [
            'type' => 'sales',
            'title' => 'Reporte Oficial de Ventas',
            'description' => 'Facturación detallada por tipo de comprobante, cliente, condición de pago e impuestos.',
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
                ['key' => 'subtotal', 'label' => 'Subtotal (S/)', 'align' => 'right'],
                ['key' => 'tax', 'label' => 'IGV (S/)', 'align' => 'right'],
                ['key' => 'total', 'label' => 'Total (S/)', 'align' => 'right'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'sale_number' => $item->sale_number,
                'date' => Carbon::parse($item->operation_date)->format('d/m/Y H:i'),
                'branch' => $item->branch?->name ?? '-',
                'doc_type' => $item->external_document_type ?? $item->sale_type,
                'customer' => $item->customer_name_snapshot ?? $item->customer?->name ?? 'Público General',
                'payment_type' => $item->payment_type === 'CREDIT' ? 'Crédito' : 'Contado',
                'status' => $item->status,
                'subtotal' => (float) $item->subtotal_amount,
                'tax' => (float) $item->tax_amount,
                'total' => (float) $item->total_amount,
            ]),
        ];
    }

    protected function exportSalesRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = Sale::with(['branch', 'customer'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        if ($search) {
            $query->where('sale_number', 'like', "%{$search}%");
        }

        $query->orderBy('operation_date', 'asc')->chunk(500, function ($sales) use ($writer) {
            foreach ($sales as $s) {
                $writer->addRow([
                    'NUMERO_VENTA' => $s->sale_number,
                    'FECHA' => Carbon::parse($s->operation_date)->format('d/m/Y H:i'),
                    'SUCURSAL' => $s->branch?->name ?? '-',
                    'TIPO_COMPROBANTE' => $s->external_document_type ?? $s->sale_type,
                    'CLIENTE' => $s->customer_name_snapshot ?? $s->customer?->name ?? 'Venta Libre',
                    'CONDICION' => $s->payment_type,
                    'ESTADO' => $s->status,
                    'SUBTOTAL' => (float) $s->subtotal_amount,
                    'IGV' => (float) $s->tax_amount,
                    'TOTAL' => (float) $s->total_amount,
                ]);
            }
        });
    }

    // ==========================================
    // 6. REPORTE DE COMPRAS
    // ==========================================
    protected function getPurchasesReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = Purchase::with(['branch', 'supplier'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('document_date', [$from, $to]);

        if ($search) {
            $term = '%'.$search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('purchase_number', 'like', $term)
                    ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', $term)->orWhere('tax_id', 'like', $term));
            });
        }

        $totalPurchasesAmount = (float) (clone $query)->where('status', 'CONFIRMED')->sum('total_amount');
        $totalPurchasesCount = (clone $query)->where('status', 'CONFIRMED')->count();

        $rows = $query->orderBy('document_date', 'desc')->paginate($perPage);

        return [
            'type' => 'purchases',
            'title' => 'Reporte de Compras',
            'description' => 'Registro de abastecimiento, proveedores, comprobantes de pago e impuestos.',
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
                ['key' => 'subtotal', 'label' => 'Subtotal (S/)', 'align' => 'right'],
                ['key' => 'tax', 'label' => 'IGV (S/)', 'align' => 'right'],
                ['key' => 'total', 'label' => 'Total (S/)', 'align' => 'right'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'purchase_number' => $item->purchase_number,
                'date' => Carbon::parse($item->document_date)->format('d/m/Y'),
                'branch' => $item->branch?->name ?? '-',
                'supplier' => $item->supplier?->name ?? '-',
                'doc_ref' => ($item->supplier_document_series ?? '').'-'.($item->supplier_document_number ?? ''),
                'status' => $item->status,
                'subtotal' => (float) $item->subtotal_amount,
                'tax' => (float) $item->tax_amount,
                'total' => (float) $item->total_amount,
            ]),
        ];
    }

    protected function exportPurchasesRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = Purchase::with(['branch', 'supplier'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('document_date', [$from, $to]);

        $query->orderBy('document_date', 'asc')->chunk(500, function ($purchases) use ($writer) {
            foreach ($purchases as $p) {
                $writer->addRow([
                    'NUMERO_COMPRA' => $p->purchase_number,
                    'FECHA' => Carbon::parse($p->document_date)->format('d/m/Y'),
                    'SUCURSAL' => $p->branch?->name ?? '-',
                    'PROVEEDOR' => $p->supplier?->name ?? '-',
                    'RUC' => $p->supplier?->tax_id ?? '-',
                    'COMPROBANTE' => ($p->supplier_document_series ?? '').'-'.($p->supplier_document_number ?? ''),
                    'ESTADO' => $p->status,
                    'SUBTOTAL' => (float) $p->subtotal_amount,
                    'IGV' => (float) $p->tax_amount,
                    'TOTAL' => (float) $p->total_amount,
                ]);
            }
        });
    }

    // ==========================================
    // 7. REPORTE DE PAGOS Y COBRANZAS
    // ==========================================
    protected function getPaymentsReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = Payment::with(['branch', 'customer', 'creator', 'methodLines.paymentMethod'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        if ($search) {
            $term = '%'.$search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('payment_number', 'like', $term)
                    ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'like', $term));
            });
        }

        $totalCollected = (float) (clone $query)->where('status', 'ACTIVE')->sum('total_amount');
        $totalPaymentsCount = (clone $query)->where('status', 'ACTIVE')->count();

        $rows = $query->orderBy('operation_date', 'desc')->paginate($perPage);

        return [
            'type' => 'payments',
            'title' => 'Reporte de Cobranzas y Pagos Recibidos',
            'description' => 'Recibos de caja, abonos de créditos y métodos de amortización aplicados.',
            'kpis' => [
                ['label' => 'Total Recibos de Cobro', 'value' => number_format($totalPaymentsCount)],
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
                ['key' => 'total', 'label' => 'Monto (S/)', 'align' => 'right'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'payment_number' => $item->payment_number,
                'date' => Carbon::parse($item->operation_date)->format('d/m/Y H:i'),
                'branch' => $item->branch?->name ?? '-',
                'customer' => $item->customer?->name ?? '-',
                'methods' => $item->methodLines->pluck('paymentMethod.name')->filter()->join(', ') ?: 'Efectivo',
                'collector' => $item->creator?->name ?? 'Sistema',
                'status' => $item->status,
                'total' => (float) $item->total_amount,
            ]),
        ];
    }

    protected function exportPaymentsRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = Payment::with(['branch', 'customer', 'creator', 'methodLines.paymentMethod'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('operation_date', [$from, $to]);

        $query->orderBy('operation_date', 'asc')->chunk(500, function ($payments) use ($writer) {
            foreach ($payments as $p) {
                $writer->addRow([
                    'RECIBO' => $p->payment_number,
                    'FECHA' => Carbon::parse($p->operation_date)->format('d/m/Y H:i'),
                    'SUCURSAL' => $p->branch?->name ?? '-',
                    'CLIENTE' => $p->customer?->name ?? '-',
                    'METODOS' => $p->methodLines->pluck('paymentMethod.name')->filter()->join(', ') ?: 'Efectivo',
                    'COBRADOR' => $p->creator?->name ?? 'Sistema',
                    'ESTADO' => $p->status,
                    'TOTAL' => (float) $p->total_amount,
                ]);
            }
        });
    }

    // ==========================================
    // 8. REPORTE DE CUENTAS POR COBRAR
    // ==========================================
    protected function getReceivablesReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = Receivable::with(['branch', 'customer', 'sale'])
            ->whereIn('branch_id', $branchIds);

        if ($search) {
            $term = '%'.$search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('receivable_number', 'like', $term)
                    ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'like', $term));
            });
        }

        $totalReceivableDebt = (float) (clone $query)->where('status', 'ACTIVE')->sum('balance_amount');
        $overdueDebt = (float) (clone $query)->where('status', 'ACTIVE')->where('due_date', '<', now()->startOfDay())->sum('balance_amount');

        $rows = $query->orderBy('due_date', 'asc')->paginate($perPage);

        return [
            'type' => 'receivables',
            'title' => 'Reporte de Cuentas por Cobrar y Cartera',
            'description' => 'Saldos pendientes de clientes, vencimientos y estado de amortizaciones.',
            'kpis' => [
                ['label' => 'Cartera Total Activa (S/)', 'value' => 'S/ '.number_format($totalReceivableDebt, 2)],
                ['label' => 'Cartera Vencida (S/)', 'value' => 'S/ '.number_format($overdueDebt, 2)],
                ['label' => 'Créditos Activos', 'value' => number_format((clone $query)->where('status', 'ACTIVE')->count())],
            ],
            'columns' => [
                ['key' => 'receivable_number', 'label' => 'N° Crédito'],
                ['key' => 'customer', 'label' => 'Cliente'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'due_date', 'label' => 'Vencimiento'],
                ['key' => 'condition', 'label' => 'Situación'],
                ['key' => 'status', 'label' => 'Estado'],
                ['key' => 'original', 'label' => 'Deuda Inicial (S/)', 'align' => 'right'],
                ['key' => 'paid', 'label' => 'Amortizado (S/)', 'align' => 'right'],
                ['key' => 'balance', 'label' => 'Saldo Deudor (S/)', 'align' => 'right'],
            ],
            'rows' => $rows->through(function ($item) {
                $isOverdue = $item->status === 'ACTIVE' && $item->due_date && Carbon::parse($item->due_date)->lt(now()->startOfDay());

                return [
                    'id' => $item->id,
                    'receivable_number' => $item->receivable_number,
                    'customer' => $item->customer?->name ?? '-',
                    'branch' => $item->branch?->name ?? '-',
                    'due_date' => $item->due_date ? Carbon::parse($item->due_date)->format('d/m/Y') : '-',
                    'condition' => $isOverdue ? 'VENCIDO' : ($item->status === 'PAID' ? 'CANCELADO' : 'VIGENTE'),
                    'status' => $item->status,
                    'original' => (float) $item->total_amount,
                    'paid' => (float) $item->paid_amount,
                    'balance' => (float) $item->balance_amount,
                ];
            }),
        ];
    }

    protected function exportReceivablesRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = Receivable::with(['branch', 'customer'])
            ->whereIn('branch_id', $branchIds);

        $query->orderBy('due_date', 'asc')->chunk(500, function ($recs) use ($writer) {
            foreach ($recs as $r) {
                $isOverdue = $r->status === 'ACTIVE' && $r->due_date && Carbon::parse($r->due_date)->lt(now()->startOfDay());
                $writer->addRow([
                    'NUMERO_CREDITO' => $r->receivable_number,
                    'CLIENTE' => $r->customer?->name ?? '-',
                    'SUCURSAL' => $r->branch?->name ?? '-',
                    'VENCIMIENTO' => $r->due_date ? Carbon::parse($r->due_date)->format('d/m/Y') : '-',
                    'SITUACION' => $isOverdue ? 'VENCIDO' : ($r->status === 'PAID' ? 'CANCELADO' : 'VIGENTE'),
                    'ESTADO' => $r->status,
                    'TOTAL_ORIGINAL' => (float) $r->total_amount,
                    'AMORTIZADO' => (float) $r->paid_amount,
                    'SALDO_PENDIENTE' => (float) $r->balance_amount,
                ]);
            }
        });
    }

    // ==========================================
    // 9. REPORTE DE TRANSFERENCIAS
    // ==========================================
    protected function getTransfersReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = Transfer::with(['sourceBranch', 'destinationBranch', 'creator'])
            ->where(function ($q) use ($branchIds) {
                $q->whereIn('source_branch_id', $branchIds)
                    ->orWhereIn('destination_branch_id', $branchIds);
            })
            ->whereBetween('request_date', [$from, $to]);

        if ($search) {
            $query->where('transfer_number', 'like', "%{$search}%");
        }

        $totalTransfers = (clone $query)->count();
        $completedTransfers = (clone $query)->where('status', 'COMPLETED')->count();

        $rows = $query->orderBy('request_date', 'desc')->paginate($perPage);

        return [
            'type' => 'transfers',
            'title' => 'Reporte de Transferencias Intersucursales',
            'description' => 'Traslados internos de mercadería, estados de despacho y recepción en tiendas.',
            'kpis' => [
                ['label' => 'Total Transferencias', 'value' => number_format($totalTransfers)],
                ['label' => 'Completadas y Recibidas', 'value' => number_format($completedTransfers)],
                ['label' => 'En Tránsito / Pendientes', 'value' => number_format($totalTransfers - $completedTransfers)],
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
        $query = Transfer::with(['sourceBranch', 'destinationBranch', 'creator'])
            ->where(function ($q) use ($branchIds) {
                $q->whereIn('source_branch_id', $branchIds)
                    ->orWhereIn('destination_branch_id', $branchIds);
            })
            ->whereBetween('request_date', [$from, $to]);

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
    protected function getDailyClosingsReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = DailyClosing::with(['branch', 'openedByUser', 'closedByUser', 'latestVersion'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('closing_date', [$from, $to]);

        $closedClosings = DailyClosing::with('latestVersion')
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('closing_date', [$from, $to])
            ->where('status', 'CLOSED')
            ->get();

        $totalSales = (float) $closedClosings->sum(fn ($c) => (float) ($c->latestVersion?->total_expected ?? 0));
        $totalClosings = $closedClosings->count();

        $rows = $query->orderBy('closing_date', 'desc')->paginate($perPage);

        return [
            'type' => 'daily_closings',
            'title' => 'Reporte Histórico de Cierres Diarios',
            'description' => 'Arqueos diarios de caja, ventas registradas, dinero físico reportado y diferencias.',
            'kpis' => [
                ['label' => 'Total Cierres Definitivos', 'value' => number_format($totalClosings)],
                ['label' => 'Total Esperado en Cierres', 'value' => 'S/ '.number_format($totalSales, 2)],
            ],
            'columns' => [
                ['key' => 'date', 'label' => 'Fecha Cierre'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'cashier', 'label' => 'Cajero / Apertura'],
                ['key' => 'confirmer', 'label' => 'Cerrado Por'],
                ['key' => 'status', 'label' => 'Estado'],
                ['key' => 'sales', 'label' => 'Esperado (S/)', 'align' => 'right'],
                ['key' => 'counted', 'label' => 'Físico (S/)', 'align' => 'right'],
                ['key' => 'difference', 'label' => 'Diferencia (S/)', 'align' => 'right'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'date' => Carbon::parse($item->closing_date)->format('d/m/Y'),
                'branch' => $item->branch?->name ?? '-',
                'cashier' => $item->openedByUser?->name ?? '-',
                'confirmer' => $item->closedByUser?->name ?? '-',
                'status' => $item->status,
                'sales' => (float) ($item->latestVersion?->total_expected ?? 0),
                'counted' => (float) ($item->latestVersion?->total_counted ?? 0),
                'difference' => (float) ($item->latestVersion?->total_difference ?? 0),
            ]),
        ];
    }

    protected function exportDailyClosingsRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = DailyClosing::with(['branch', 'openedByUser', 'closedByUser', 'latestVersion'])
            ->whereIn('branch_id', $branchIds)
            ->whereBetween('closing_date', [$from, $to]);

        $query->orderBy('closing_date', 'asc')->chunk(500, function ($closings) use ($writer) {
            foreach ($closings as $c) {
                $writer->addRow([
                    'FECHA' => Carbon::parse($c->closing_date)->format('d/m/Y'),
                    'SUCURSAL' => $c->branch?->name ?? '-',
                    'APERTURA_POR' => $c->openedByUser?->name ?? '-',
                    'CERRADO_POR' => $c->closedByUser?->name ?? '-',
                    'ESTADO' => $c->status,
                    'TOTAL_ESPERADO' => (float) ($c->latestVersion?->total_expected ?? 0),
                    'TOTAL_FISICO' => (float) ($c->latestVersion?->total_counted ?? 0),
                    'DIFERENCIA' => (float) ($c->latestVersion?->total_difference ?? 0),
                ]);
            }
        });
    }

    // ==========================================
    // 11. REPORTE DE OPERACIONES OFFLINE
    // ==========================================
    protected function getOfflineOperationsReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = SyncOperation::with(['device.branch', 'user'])
            ->whereHas('device', fn ($q) => $q->whereIn('branch_id', $branchIds))
            ->whereBetween('created_at', [$from, $to]);

        if ($search) {
            $query->where('entity_type', 'like', "%{$search}%");
        }

        $totalOps = (clone $query)->count();
        $syncedOps = (clone $query)->where('status', 'APPLIED')->count();
        $conflictedOps = (clone $query)->where('status', 'CONFLICT')->count();

        $rows = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return [
            'type' => 'offline_operations',
            'title' => 'Trazabilidad de Operaciones Offline',
            'description' => 'Monitoreo de sincronización, operaciones encoladas por terminales y tiempos de procesamiento.',
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
                'device' => $item->device?->name ?? 'Terminal Offline',
                'branch' => $item->device?->branch?->name ?? '-',
                'user' => $item->user?->name ?? '-',
                'entity' => $item->entity_type,
                'operation' => $item->operation_type,
                'status' => $item->status,
            ]),
        ];
    }

    protected function exportOfflineOperationsRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = SyncOperation::with(['device.branch', 'user'])
            ->whereHas('device', fn ($q) => $q->whereIn('branch_id', $branchIds))
            ->whereBetween('created_at', [$from, $to]);

        $query->orderBy('created_at', 'asc')->chunk(500, function ($ops) use ($writer) {
            foreach ($ops as $op) {
                $writer->addRow([
                    'FECHA' => Carbon::parse($op->client_timestamp ?? $op->created_at)->format('d/m/Y H:i'),
                    'DISPOSITIVO' => $op->device?->name ?? '-',
                    'SUCURSAL' => $op->device?->branch?->name ?? '-',
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
    protected function getConflictsReport(array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search, int $perPage): array
    {
        $query = Conflict::with(['syncOperation.device.branch', 'resolver'])
            ->whereBetween('created_at', [$from, $to]);

        $totalConflicts = (clone $query)->count();
        $resolvedConflicts = (clone $query)->whereIn('status', ['RESOLVED_OVERWRITE', 'RESOLVED_CORRECTED', 'RESOLVED_SERVER_WINS'])->count();

        $rows = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return [
            'type' => 'conflicts',
            'title' => 'Auditoría de Conflictos de Sincronización',
            'description' => 'Historial de discrepancias detectadas, resoluciones tomadas y responsables.',
            'kpis' => [
                ['label' => 'Total Incidentes Registrados', 'value' => number_format($totalConflicts)],
                ['label' => 'Conflictos Resueltos', 'value' => number_format($resolvedConflicts)],
                ['label' => 'Pendientes por Resolver', 'value' => number_format($totalConflicts - $resolvedConflicts)],
            ],
            'columns' => [
                ['key' => 'date', 'label' => 'Fecha Detección'],
                ['key' => 'conflict_type', 'label' => 'Tipo de Conflicto'],
                ['key' => 'branch', 'label' => 'Sucursal'],
                ['key' => 'reason', 'label' => 'Causa / Motivo'],
                ['key' => 'status', 'label' => 'Estado'],
                ['key' => 'resolver', 'label' => 'Resuelto Por'],
            ],
            'rows' => $rows->through(fn ($item) => [
                'id' => $item->id,
                'date' => Carbon::parse($item->created_at)->format('d/m/Y H:i'),
                'conflict_type' => $item->conflict_type,
                'branch' => $item->syncOperation?->device?->branch?->name ?? '-',
                'reason' => $item->reason_description,
                'status' => $item->status,
                'resolver' => $item->resolver?->name ?? '-',
            ]),
        ];
    }

    protected function exportConflictsRows(SimpleExcelWriter $writer, array $branchIds, DateTimeInterface $from, DateTimeInterface $to, ?string $search): void
    {
        $query = Conflict::with(['syncOperation.device.branch', 'resolver'])
            ->whereBetween('created_at', [$from, $to]);

        $query->orderBy('created_at', 'asc')->chunk(500, function ($confs) use ($writer) {
            foreach ($confs as $c) {
                $writer->addRow([
                    'FECHA' => Carbon::parse($c->created_at)->format('d/m/Y H:i'),
                    'TIPO' => $c->conflict_type,
                    'SUCURSAL' => $c->syncOperation?->device?->branch?->name ?? '-',
                    'MOTIVO' => $c->reason_description,
                    'ESTADO' => $c->status,
                    'RESUELTO_POR' => $c->resolver?->name ?? '-',
                ]);
            }
        });
    }
}
