<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Company;
use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        protected ReportService $reportService
    ) {}

    /**
     * Obtiene las sucursales autorizadas para el usuario en sesión.
     */
    protected function getAllowedBranchIds(Request $request): array
    {
        $user = $request->user();
        if ($user->hasRole('Super Admin')) {
            return Branch::where('status', 'ACTIVE')->pluck('id')->toArray();
        }

        $ids = $user->branches()->where('branches.status', 'ACTIVE')->pluck('branches.id')->toArray();
        if (empty($ids) && $user->default_branch_id) {
            $ids = [$user->default_branch_id];
        }

        return $ids;
    }

    /**
     * Centro de Reportes del Sistema.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $this->getAllowedBranchIds($request);

        $reportType = $request->input('type', 'sales');

        $branchId = $request->input('branch_id');
        if ($branchId !== null && $branchId !== '' && $branchId !== 'ALL') {
            $branchId = (int) $branchId;
            if (! in_array($branchId, $allowedBranchIds)) {
                abort(403, 'No tienes autorización para consultar reportes de esta sucursal.');
            }
        } else {
            $branchId = null;
        }

        $filters = [
            'date_from' => $request->input('date_from', now()->startOfMonth()->format('Y-m-d')),
            'date_to' => $request->input('date_to', now()->format('Y-m-d')),
            'branch_id' => $branchId ? (string) $branchId : '',
            'search' => $request->input('search'),
        ];

        $report = $this->reportService->getReportData($reportType, $allowedBranchIds, $filters, 15);

        $branches = $isSuperAdmin
            ? Branch::where('status', 'ACTIVE')->orderBy('name')->get(['id', 'name'])
            : $user->branches()->where('branches.status', 'ACTIVE')->orderBy('name')->get(['branches.id', 'branches.name']);

        if ($branches->isEmpty() && $user->default_branch_id) {
            $branches = Branch::where('id', $user->default_branch_id)->get(['id', 'name']);
        }

        return Inertia::render('reports/index', [
            'report_type' => $reportType,
            'report' => $report,
            'branches' => $branches,
            'is_super_admin' => $isSuperAdmin,
            'filters' => $filters,
        ]);
    }

    /**
     * Exportación de cualquier reporte en formato Excel (.xlsx).
     */
    public function exportExcel(Request $request, string $type): StreamedResponse
    {
        $user = $request->user();
        $allowedBranchIds = $this->getAllowedBranchIds($request);

        $branchId = $request->input('branch_id');
        if ($branchId !== null && $branchId !== '' && $branchId !== 'ALL') {
            $branchId = (int) $branchId;
            if (! in_array($branchId, $allowedBranchIds)) {
                abort(403, 'No tienes autorización para exportar datos de esta sucursal.');
            }
        }

        $filters = [
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'branch_id' => $branchId,
            'search' => $request->input('search'),
        ];

        return $this->reportService->exportExcel($type, $allowedBranchIds, $filters);
    }

    /**
     * Renderiza la vista imprimible en A4 (para DocumentPreviewModal sin abrir _blank).
     */
    public function printReport(Request $request, string $type): View
    {
        $user = $request->user();
        $allowedBranchIds = $this->getAllowedBranchIds($request);

        $branchId = $request->input('branch_id');
        if ($branchId !== null && $branchId !== '' && $branchId !== 'ALL') {
            $branchId = (int) $branchId;
            if (! in_array($branchId, $allowedBranchIds)) {
                abort(403, 'No tienes autorización para visualizar reportes de esta sucursal.');
            }
        }

        $filters = [
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'branch_id' => $branchId,
            'search' => $request->input('search'),
        ];

        $report = $this->reportService->getReportData($type, $allowedBranchIds, $filters, 250);

        $company = Company::first();

        $branchName = 'Todas las Sucursales Autorizadas';
        if ($branchId) {
            $b = Branch::find($branchId);
            if ($b) {
                $branchName = $b->name;
            }
        }

        return view('reports.print.general-a4', [
            'report' => $report,
            'company' => $company,
            'filters' => $filters,
            'branchName' => $branchName,
            'generatedAt' => Carbon::now()->format('d/m/Y H:i:s'),
            'user' => $user,
        ]);
    }
}
