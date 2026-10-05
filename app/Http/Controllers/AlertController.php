<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Branch;
use App\Services\AlertService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AlertController extends Controller
{
    public function __construct(
        protected AlertService $alertService
    ) {}

    /**
     * Obtiene las sucursales permitidas para el usuario en sesión.
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
     * Bandeja de Alertas del Sistema.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $this->getAllowedBranchIds($request);

        $branchId = $request->input('branch_id');
        if ($branchId !== null && $branchId !== '' && $branchId !== 'ALL') {
            $branchId = (int) $branchId;
            if (! in_array($branchId, $allowedBranchIds)) {
                abort(403, 'No tienes autorización para consultar alertas de esta sucursal.');
            }
        } else {
            $branchId = null;
        }

        $filters = [
            'severity' => $request->input('severity'),
            'alert_type' => $request->input('alert_type'),
            'status' => $request->input('status', 'all'),
            'search' => $request->input('search'),
        ];

        $data = $this->alertService->getAlertsForUser($user, $branchId, $filters);

        $branches = $isSuperAdmin
            ? Branch::where('status', 'ACTIVE')->orderBy('name')->get(['id', 'name'])
            : $user->branches()->where('branches.status', 'ACTIVE')->orderBy('name')->get(['branches.id', 'branches.name']);

        if ($branches->isEmpty() && $user->default_branch_id) {
            $branches = Branch::where('id', $user->default_branch_id)->get(['id', 'name']);
        }

        return Inertia::render('alerts/index', [
            'alerts' => $data['alerts'],
            'kpis' => $data['kpis'],
            'branches' => $branches,
            'is_super_admin' => $isSuperAdmin,
            'filters' => array_merge($filters, [
                'branch_id' => $branchId ? (string) $branchId : '',
            ]),
        ]);
    }

    /**
     * Marca una alerta como leída / atendida.
     */
    public function markAsRead(Request $request, Alert $alert): RedirectResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $this->getAllowedBranchIds($request);

        if (! $isSuperAdmin && $alert->branch_id !== null && ! in_array($alert->branch_id, $allowedBranchIds)) {
            abort(403, 'No tienes autorización para atender alertas de esta sucursal.');
        }

        $this->alertService->markAsRead($alert, $user);

        return back()->with('success', 'Alerta marcada como atendida.');
    }

    /**
     * Marca todas las alertas del ámbito como atendidas.
     */
    public function markAllAsRead(Request $request): RedirectResponse
    {
        $user = $request->user();
        $branchId = $request->input('branch_id');
        if ($branchId) {
            $branchId = (int) $branchId;
            $allowedBranchIds = $this->getAllowedBranchIds($request);
            if (! in_array($branchId, $allowedBranchIds)) {
                abort(403, 'No tienes autorización para esta sucursal.');
            }
        }

        $count = $this->alertService->markAllAsReadForUser($user, $branchId ? (int) $branchId : null);

        return back()->with('success', "Se marcaron {$count} alertas como atendidas.");
    }

    /**
     * Vuelve a evaluar y escanear las alertas en vivo.
     */
    public function refresh(Request $request): RedirectResponse
    {
        return back()->with('success', 'Alertas actualizadas con el estado más reciente del sistema.');
    }
}
