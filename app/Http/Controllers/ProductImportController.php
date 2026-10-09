<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\ImportBatch;
use App\Services\ProductImportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProductImportController extends Controller
{
    public function __construct(
        protected ProductImportService $importService
    ) {}

    /**
     * Muestra la vista principal de importación masiva y el historial de lotes.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $companyId = $user->company_id;

        $isSuperAdmin = $user->hasRole('Super Admin') || $user->can('manage_branches');
        $branches = $isSuperAdmin
            ? Branch::where('company_id', $companyId)->where('status', 'ACTIVE')->orderBy('name')->get(['id', 'name', 'code'])
            : $user->branches()->where('branches.status', 'ACTIVE')->orderBy('name')->get(['branches.id', 'branches.name', 'branches.code']);

        $defaultBranchId = $user->default_branch_id ?? $branches->first()?->id;

        $recentBatches = ImportBatch::with('creator:id,name,username')
            ->where('company_id', $companyId)
            ->where('entity_type', 'PRODUCTS')
            ->orderBy('id', 'desc')
            ->limit(10)
            ->get();

        return Inertia::render('catalog/import/index', [
            'branches' => $branches,
            'defaultBranchId' => $defaultBranchId,
            'recentBatches' => $recentBatches,
        ]);
    }

    /**
     * Descarga la plantilla oficial en formato XLSX para importación de repuestos.
     */
    public function downloadTemplate(): BinaryFileResponse
    {
        $path = $this->importService->generateTemplate();

        return response()->download($path, 'plantilla_importacion_repuestos.xlsx');
    }

    /**
     * Analiza y valida el archivo cargado sin persistir productos (Dry-run / Preview).
     */
    public function preview(Request $request)
    {
        $request->validate([
            'file' => 'required|file|extensions:xlsx,csv,txt,xls|max:20480',
            'branch_id' => 'nullable|integer',
        ]);

        $user = $request->user();

        try {
            $analysis = $this->importService->analyze(
                $request->file('file'),
                $user->company_id,
                $request->filled('branch_id') ? (int) $request->branch_id : null
            );

            return response()->json([
                'success' => true,
                'data' => $analysis,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Ejecuta la importación del archivo confirmado.
     */
    public function store(Request $request)
    {
        $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'duplicate_strategy' => 'required|string|in:UPDATE_AND_ADD_STOCK,ONLY_NEW,OVERWRITE_STOCK',
            'temp_file_token' => 'nullable|string',
            'file' => 'nullable|file|extensions:xlsx,csv,txt,xls|max:20480',
            'file_name' => 'nullable|string',
        ]);

        if (! $request->filled('temp_file_token') && ! $request->hasFile('file')) {
            return back()->with('error', 'Debes adjuntar o previsualizar un archivo antes de importar.');
        }

        $user = $request->user();
        $branchId = (int) $request->branch_id;

        // Validar que la sucursal pertenezca a la empresa del usuario
        $branch = Branch::where('id', $branchId)
            ->where('company_id', $user->company_id)
            ->first();

        if (! $branch) {
            return back()->with('error', 'La sucursal seleccionada no pertenece a tu empresa o no es válida.');
        }

        try {
            $filePath = $this->importService->resolveFilePath(
                $request->input('temp_file_token'),
                $request->file('file')
            );

            $result = $this->importService->executeImport(
                $filePath,
                $user->company_id,
                $branchId,
                $user->id,
                $request->input('duplicate_strategy', 'UPDATE_AND_ADD_STOCK'),
                $request->input('file_name')
            );

            $message = "Importación procesada. Total: {$result['total']} repuestos. Creados: {$result['created']}, Actualizados: {$result['updated']}, Omitidos: {$result['skipped']}, Observados: {$result['failed']}.";

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'result' => $result,
                ]);
            }

            return back()->with('success', $message);
        } catch (\Throwable $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al procesar la importación: '.$e->getMessage(),
                ], 500);
            }

            return back()->with('error', 'Error al procesar la importación: '.$e->getMessage());
        }
    }

    /**
     * Descarga el reporte de filas fallidas / observadas en formato Excel.
     */
    public function downloadErrors(ImportBatch $batch, Request $request)
    {
        $user = $request->user();

        if ($batch->company_id !== $user->company_id) {
            abort(403, 'No tienes autorización para acceder a este lote.');
        }

        $path = $this->importService->generateErrorsFile($batch);

        if (! $path || ! file_exists($path)) {
            return back()->with('info', 'Este lote no contiene filas con observaciones para descargar.');
        }

        return response()->download($path, "errores_lote_{$batch->id}.xlsx")->deleteFileAfterSend();
    }
}
