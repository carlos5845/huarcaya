<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Company;
use App\Models\KardexEntry;
use App\Services\FifoKardexSimulatorService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Spatie\SimpleExcel\SimpleExcelWriter;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KardexReportController extends Controller
{
    public function __construct(
        protected FifoKardexSimulatorService $fifoSimulator
    ) {}

    /**
     * Construye la consulta base respetando permisos de sucursal y filtros.
     */
    protected function getFilteredQuery(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $canSeeAllBranches = $isSuperAdmin || $user->hasPermissionTo('view_inventory_general');

        $allowedBranchIds = $canSeeAllBranches
            ? Branch::pluck('id')->toArray()
            : $user->branches()->pluck('branches.id')->toArray();

        if (empty($allowedBranchIds) && ! $canSeeAllBranches && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        $branchId = $request->input('branch_id');
        $search = $request->input('search');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        if (! $canSeeAllBranches) {
            $userBranchId = $user->default_branch_id ?? ($allowedBranchIds[0] ?? null);
            $allowedBranchIds = $userBranchId ? [$userBranchId] : [];
            $branchId = $userBranchId;
        }

        return KardexEntry::with(['product.unit', 'user', 'branch'])
            ->whereIn('branch_id', $allowedBranchIds)
            ->when($branchId && $branchId !== 'ALL', fn ($q) => $q->where('branch_id', $branchId))
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereLikeAccentInsensitive('operation_type', "%{$search}%")
                        ->orWhereLikeAccentInsensitive('reference', "%{$search}%")
                        ->orWhereHas('user', fn ($uq) => $uq->whereLikeAccentInsensitive('name', "%{$search}%"))
                        ->orWhereHas('product', function ($pq) use ($search) {
                            $pq->whereLikeAccentInsensitive('name', "%{$search}%")
                                ->orWhereLikeAccentInsensitive('internal_code', "%{$search}%")
                                ->orWhereLikeAccentInsensitive('primary_reference', "%{$search}%");
                        });
                });
            })
            ->when($dateFrom, fn ($q) => $q->whereDate('operation_date', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('operation_date', '<=', $dateTo));
    }

    /**
     * Mapea un tipo de operación interna al código de la Tabla 12 de SUNAT.
     */
    protected function mapSunatOperationType(string $type): string
    {
        $upper = strtoupper($type);
        if (str_contains($upper, 'COMPRA')) {
            return '01';
        } // Venta nacional / Compra
        if (str_contains($upper, 'VENTA')) {
            return '02';
        } // Venta
        if (str_contains($upper, 'TRANSFERENCIA')) {
            return '11';
        } // Transferencia entre almacenes
        if (str_contains($upper, 'DEVOLUCION') || str_contains($upper, 'DEV')) {
            return '05';
        } // Devolución
        if (str_contains($upper, 'MERMA') || str_contains($upper, 'DANO') || str_contains($upper, 'DANADA')) {
            return '13';
        } // Mermas / Desmedros
        if (str_contains($upper, 'INICIAL')) {
            return '16';
        } // Saldo Inicial
        if (str_contains($upper, 'AJUSTE')) {
            return '99';
        } // Otros

        return '99';
    }

    /**
     * Exportación en Excel oficial Formato 13.1 SUNAT.
     */
    public function exportExcel(Request $request)
    {
        $method = strtoupper($request->input('method', 'PEPS'));
        $query = $this->getFilteredQuery($request)->orderBy('sequence_number', 'asc');
        $entries = $query->get();

        if ($method === 'PEPS') {
            $entries = $this->fifoSimulator->simulate($entries);
        }

        $company = Company::find($request->user()->company_id) ?? Company::first();
        $timestamp = now()->format('Ymd_His');
        $filename = "formato_13_1_kardex_{$method}_{$timestamp}.xlsx";

        $tempPath = tempnam(sys_get_temp_dir(), 'kardex_').'.xlsx';
        $writer = SimpleExcelWriter::create($tempPath);

        foreach ($entries as $entry) {
            $inputQty = $method === 'PEPS' ? $entry->fifo_input_quantity : (float) $entry->input_quantity;
            $inputCost = $method === 'PEPS' ? $entry->fifo_input_unit_cost : (float) $entry->input_unit_cost;
            $inputTotal = $method === 'PEPS' ? $entry->fifo_input_total_cost : (float) $entry->input_total_cost;

            $outputQty = $method === 'PEPS' ? $entry->fifo_output_quantity : (float) $entry->output_quantity;
            $outputCost = $method === 'PEPS' ? $entry->fifo_output_unit_cost : (float) $entry->output_unit_cost;
            $outputTotal = $method === 'PEPS' ? $entry->fifo_output_total_cost : (float) $entry->output_total_cost;

            $balanceQty = $method === 'PEPS' ? $entry->fifo_balance_quantity : (float) $entry->balance_quantity;
            $balanceCost = $method === 'PEPS' ? $entry->fifo_balance_unit_cost : (float) $entry->balance_unit_cost;
            $balanceTotal = $method === 'PEPS' ? $entry->fifo_balance_total_cost : (float) $entry->balance_total_cost;

            $writer->addRow([
                'N_SECUENCIA' => $entry->sequence_number,
                'FECHA' => Carbon::parse($entry->operation_date)->format('d/m/Y H:i'),
                'SUCURSAL' => $entry->branch?->name ?? 'Central',
                'TIPO_OPERACION_SUNAT' => $this->mapSunatOperationType($entry->operation_type),
                'OPERACION_INTERNA' => $entry->operation_type,
                'REFERENCIA_DOC' => $entry->reference ?? 'S/N',
                'CODIGO_EXISTENCIA' => $entry->product?->primary_reference ?? '-',
                'DESCRIPCION_PRODUCTO' => $entry->product?->name ?? '-',
                'UNIDAD_MEDIDA' => $entry->product?->unit?->code ?? 'NIU',
                'METODO_VALUACION' => $method === 'PEPS' ? 'PEPS / FIFO' : 'PROMEDIO PONDERADO',

                // Entradas
                'ENTRADA_CANTIDAD' => $inputQty > 0 ? $inputQty : 0,
                'ENTRADA_COSTO_UNITARIO' => $inputQty > 0 ? $inputCost : 0,
                'ENTRADA_TOTAL' => $inputQty > 0 ? $inputTotal : 0,

                // Salidas
                'SALIDA_CANTIDAD' => $outputQty > 0 ? $outputQty : 0,
                'SALIDA_COSTO_UNITARIO' => $outputQty > 0 ? $outputCost : 0,
                'SALIDA_TOTAL' => $outputQty > 0 ? $outputTotal : 0,

                // Saldos
                'SALDO_CANTIDAD' => $balanceQty,
                'SALDO_COSTO_UNITARIO' => $balanceCost,
                'SALDO_TOTAL' => $balanceTotal,

                'USUARIO' => $entry->user?->name ?? 'Sistema',
            ]);
        }

        $writer->close();

        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Generación y descarga del archivo de texto plano para el validador PLE SUNAT (Libro 13.1).
     * Nomenclatura: LE[RUC][AÑO][MES]00130100001111.txt
     */
    public function exportPle(Request $request): StreamedResponse
    {
        $method = strtoupper($request->input('method', 'PEPS'));
        $query = $this->getFilteredQuery($request)->orderBy('sequence_number', 'asc');
        $entries = $query->get();

        if ($method === 'PEPS') {
            $entries = $this->fifoSimulator->simulate($entries);
        }

        $company = Company::find($request->user()->company_id) ?? Company::first();
        $ruc = preg_replace('/\D/', '', $company?->document_number ?? '20123456789');
        $year = now()->format('Y');
        $month = now()->format('m');

        // Nomenclatura oficial: LE + RUC (11) + AÑO (4) + MES (2) + 00 + 130100 + 00 + 1 + 1 + 1 + 1 + .txt
        $filename = "LE{$ruc}{$year}{$month}00130100001111.txt";

        return response()->streamDownload(function () use ($entries, $method, $year, $month) {
            $handle = fopen('php://output', 'w');

            foreach ($entries as $index => $entry) {
                $periodo = "{$year}{$month}00";
                $cuo = str_pad((string) $entry->sequence_number, 10, '0', STR_PAD_LEFT);
                $correlativoAsiento = 'M'.str_pad((string) ($index + 1), 5, '0', STR_PAD_LEFT);
                $estabCode = '0000'; // Establecimiento anexo / 0000 principal
                $catalogo = '9'; // 9: Otros / Catálogo interno propio
                $tipoExistencia = '01'; // 01: Mercadería
                $codigoPropio = $entry->product?->primary_reference ?? 'SKU-'.$entry->product_id;
                $catalogoSunat = '';
                $codigoSunat = '';
                $fechaEmision = Carbon::parse($entry->operation_date)->format('d/m/Y');
                $tipoDoc = '00'; // Documento interno o sin comprobante
                $serie = '-';
                $numero = preg_replace('/[^A-Za-z0-9]/', '', $entry->reference ?? '1');
                $tipoOperacion = $this->mapSunatOperationType($entry->operation_type);
                $descripcion = Str::limit($entry->product?->name ?? 'Repuesto', 80, '');
                $unidadMedida = $entry->product?->unit?->code ?? 'NIU';
                $metodoCode = $method === 'PEPS' ? '1' : '2'; // 1: PEPS, 2: Promedio ponderado

                $inQty = $method === 'PEPS' ? $entry->fifo_input_quantity : (float) $entry->input_quantity;
                $inCost = $method === 'PEPS' ? $entry->fifo_input_unit_cost : (float) $entry->input_unit_cost;
                $inTotal = $method === 'PEPS' ? $entry->fifo_input_total_cost : (float) $entry->input_total_cost;

                $outQty = $method === 'PEPS' ? $entry->fifo_output_quantity : (float) $entry->output_quantity;
                $outCost = $method === 'PEPS' ? $entry->fifo_output_unit_cost : (float) $entry->output_unit_cost;
                $outTotal = $method === 'PEPS' ? $entry->fifo_output_total_cost : (float) $entry->output_total_cost;

                $balQty = $method === 'PEPS' ? $entry->fifo_balance_quantity : (float) $entry->balance_quantity;
                $balCost = $method === 'PEPS' ? $entry->fifo_balance_unit_cost : (float) $entry->balance_unit_cost;
                $balTotal = $method === 'PEPS' ? $entry->fifo_balance_total_cost : (float) $entry->balance_total_cost;

                $estadoOp = '1';

                // Campos estándar PLE 13.1 delimitados por | y terminando en |
                $line = implode('|', [
                    $periodo,
                    $cuo,
                    $correlativoAsiento,
                    $estabCode,
                    $catalogo,
                    $tipoExistencia,
                    $codigoPropio,
                    $catalogoSunat,
                    $codigoSunat,
                    $fechaEmision,
                    $tipoDoc,
                    $serie,
                    $numero,
                    $tipoOperacion,
                    $descripcion,
                    $unidadMedida,
                    $metodoCode,
                    number_format($inQty, 2, '.', ''),
                    number_format($inCost, 4, '.', ''),
                    number_format($inTotal, 2, '.', ''),
                    number_format($outQty, 2, '.', ''),
                    number_format($outCost, 4, '.', ''),
                    number_format($outTotal, 2, '.', ''),
                    number_format($balQty, 2, '.', ''),
                    number_format($balCost, 4, '.', ''),
                    number_format($balTotal, 2, '.', ''),
                    $estadoOp,
                ])."|\r\n";

                fwrite($handle, $line);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/plain; charset=iso-8859-1',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
