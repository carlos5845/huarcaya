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
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportController extends Controller
{
    public function __construct(
        protected ReportService $reportService
    ) {}

    /**
     * Obtiene las sucursales autorizadas para el usuario en sesión (acotadas a su empresa).
     */
    protected function getAllowedBranchIds(Request $request): array
    {
        $user = $request->user();
        if ($user->hasRole('Super Admin')) {
            return Branch::where('company_id', $user->company_id)
                ->where('status', 'ACTIVE')
                ->pluck('id')
                ->toArray();
        }

        $ids = $user->branches()
            ->where('branches.company_id', $user->company_id)
            ->where('branches.status', 'ACTIVE')
            ->pluck('branches.id')
            ->toArray();

        if (empty($ids) && $user->default_branch_id) {
            $ids = [$user->default_branch_id];
        }

        return $ids;
    }

    /**
     * Normaliza y valida el parámetro branch_id del request (retorna null si es 'ALL' o vacío).
     */
    protected function resolveBranchFilter(Request $request, array $allowedBranchIds, string $forbiddenMessage): ?int
    {
        $raw = $request->input('branch_id');
        if ($raw === null || $raw === '' || strtoupper((string) $raw) === 'ALL') {
            return null;
        }

        $branchId = (int) $raw;
        if (! in_array($branchId, $allowedBranchIds, true)) {
            abort(403, $forbiddenMessage);
        }

        return $branchId;
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
        $branchId = $this->resolveBranchFilter(
            $request,
            $allowedBranchIds,
            'No tienes autorización para consultar reportes de esta sucursal.'
        );

        $filters = [
            'company_id' => $user->company_id,
            'date_from' => $request->input('date_from', now()->startOfMonth()->format('Y-m-d')),
            'date_to' => $request->input('date_to', now()->format('Y-m-d')),
            'branch_id' => $branchId ? (string) $branchId : '',
            'search' => $request->input('search'),
        ];

        $report = $this->reportService->getReportData($reportType, $allowedBranchIds, $filters, 15);

        $branches = $isSuperAdmin
            ? Branch::where('company_id', $user->company_id)->where('status', 'ACTIVE')->orderBy('name')->get(['id', 'name'])
            : $user->branches()->where('branches.company_id', $user->company_id)->where('branches.status', 'ACTIVE')->orderBy('name')->get(['branches.id', 'branches.name']);

        if ($branches->isEmpty() && $user->default_branch_id) {
            $branches = Branch::where('id', $user->default_branch_id)->get(['id', 'name']);
        }

        return Inertia::render('reports/index', [
            'report_type' => $reportType,
            'report' => $report,
            'branches' => $branches,
            'is_super_admin' => $isSuperAdmin,
            'can_select_branch' => $isSuperAdmin || $branches->count() > 1,
            'filters' => [
                'date_from' => $filters['date_from'],
                'date_to' => $filters['date_to'],
                'branch_id' => $filters['branch_id'],
                'search' => $filters['search'],
            ],
        ]);
    }

    /**
     * Exportación de cualquier reporte en formato Excel (.xlsx).
     */
    public function exportExcel(Request $request, string $type): BinaryFileResponse
    {
        $user = $request->user();
        $allowedBranchIds = $this->getAllowedBranchIds($request);
        $branchId = $this->resolveBranchFilter(
            $request,
            $allowedBranchIds,
            'No tienes autorización para exportar datos de esta sucursal.'
        );

        $filters = [
            'company_id' => $user->company_id,
            'date_from' => $request->input('date_from', now()->startOfMonth()->format('Y-m-d')),
            'date_to' => $request->input('date_to', now()->format('Y-m-d')),
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
        $branchId = $this->resolveBranchFilter(
            $request,
            $allowedBranchIds,
            'No tienes autorización para visualizar reportes de esta sucursal.'
        );

        $filters = [
            'company_id' => $user->company_id,
            'date_from' => $request->input('date_from', now()->startOfMonth()->format('Y-m-d')),
            'date_to' => $request->input('date_to', now()->format('Y-m-d')),
            'branch_id' => $branchId,
            'search' => $request->input('search'),
        ];

        $report = $this->reportService->getReportData($type, $allowedBranchIds, $filters, 250);

        $company = $user->company ?? Company::first();

        $branchName = 'Todas las Sucursales Autorizadas';
        if ($branchId !== null) {
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
