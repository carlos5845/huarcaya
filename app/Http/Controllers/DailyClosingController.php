<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Company;
use App\Models\DailyClosing;
use App\Models\User;
use App\Notifications\DailyClosingDiscrepancyNotification;
use App\Services\DailyClosingService;
use Exception;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

class DailyClosingController extends Controller
{
    public function __construct(
        public DailyClosingService $dailyClosingService
    ) {}

    /**
     * Resolves allowed branch IDs for the current user.
     * Super Admin has access to all active branches.
     * Other roles are scoped to their assigned branches.
     *
     * @return array<int>
     */
    protected function getAllowedBranchIds(Request $request): array
    {
        $user = $request->user();
        if ($user->hasRole('Super Admin')) {
            return Branch::where('status', 'ACTIVE')->pluck('id')->toArray();
        }

        $branches = $user->branches()->where('branches.status', 'ACTIVE')->pluck('branches.id')->toArray();
        if (empty($branches) && $user->default_branch_id) {
            $branches = [$user->default_branch_id];
        }

        return $branches;
    }

    /**
     * Display a listing of daily closings with KPIs and filters.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $this->getAllowedBranchIds($request);

        $query = DailyClosing::with(['branch', 'openedByUser', 'closedByUser', 'latestVersion'])
            ->whereIn('branch_id', $allowedBranchIds)
            ->latest('closing_date');

        // Branch filter
        if ($request->filled('branch_id') && $request->input('branch_id') !== 'ALL') {
            $reqBranchId = (int) $request->input('branch_id');
            if (! in_array($reqBranchId, $allowedBranchIds)) {
                abort(403, 'No tiene permiso para acceder a esta sucursal.');
            }
            $query->where('branch_id', $reqBranchId);
        }

        // Status filter
        if ($request->filled('status') && $request->input('status') !== 'ALL') {
            $query->where('status', $request->input('status'));
        }

        // Date range filter
        if ($request->filled('start_date')) {
            $query->whereDate('closing_date', '>=', $request->input('start_date'));
        }
        if ($request->filled('end_date')) {
            $query->whereDate('closing_date', '<=', $request->input('end_date'));
        }

        $closings = $query->paginate(15)->withQueryString();

        // Calculate KPIs scoped to allowed branches
        $baseKpiQuery = DailyClosing::query()->whereIn('branch_id', $allowedBranchIds);
        if ($request->filled('branch_id') && $request->input('branch_id') !== 'ALL') {
            $baseKpiQuery->where('branch_id', $request->input('branch_id'));
        }
        if ($request->filled('start_date')) {
            $baseKpiQuery->whereDate('closing_date', '>=', $request->input('start_date'));
        }
        if ($request->filled('end_date')) {
            $baseKpiQuery->whereDate('closing_date', '<=', $request->input('end_date'));
        }

        $totalCount = (clone $baseKpiQuery)->count();
        $closedCount = (clone $baseKpiQuery)->where('status', 'CLOSED')->count();
        $openCount = (clone $baseKpiQuery)->whereIn('status', ['OPEN', 'IN_PROGRESS'])->count();

        $branches = Branch::whereIn('id', $allowedBranchIds)->select('id', 'name')->orderBy('name')->get();

        return Inertia::render('closings/index', [
            'closings' => $closings,
            'kpis' => [
                'total' => $totalCount,
                'closed' => $closedCount,
                'pending' => $openCount,
            ],
            'branches' => $branches,
            'is_super_admin' => $isSuperAdmin,
            'filters' => $request->only(['branch_id', 'status', 'start_date', 'end_date']),
        ]);
    }

    /**
     * Show the daily closing and cash count form for a given branch and date.
     */
    public function create(Request $request): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $this->getAllowedBranchIds($request);

        if (empty($allowedBranchIds)) {
            abort(403, 'No tiene ninguna sucursal asignada.');
        }

        if ($isSuperAdmin) {
            $branchId = (int) ($request->input('branch_id') ?? $user->default_branch_id ?? $allowedBranchIds[0]);
        } else {
            $requestedBranch = $request->input('branch_id');
            if ($requestedBranch && ! in_array((int) $requestedBranch, $allowedBranchIds)) {
                abort(403, 'No tiene permiso para gestionar el cierre de esta sucursal.');
            }
            $branchId = (int) ($requestedBranch ?? $user->default_branch_id ?? $allowedBranchIds[0]);
        }

        $date = $request->input('date') ?? now()->toDateString();

        $closing = $this->dailyClosingService->getOrCreateClosing($branchId, $date, $user->id);
        $closing->load(['branch', 'openedByUser', 'closedByUser', 'latestVersion.cashCounts.paymentMethod']);

        $metrics = $this->dailyClosingService->getDailyMetrics($branchId, $date);

        $branches = Branch::whereIn('id', $allowedBranchIds)->select('id', 'name')->orderBy('name')->get();

        return Inertia::render('closings/create', [
            'closing' => $closing,
            'metrics' => $metrics,
            'branches' => $branches,
            'is_super_admin' => $isSuperAdmin,
            'selectedBranchId' => $branchId,
            'selectedDate' => $date,
        ]);
    }

    /**
     * Save draft or confirm definitive closing.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'closing_date' => 'required|date',
            'action' => 'required|in:draft,confirm',
            'notes' => 'nullable|string|max:1000',
            'counts' => 'required|array',
            'counts.*.payment_method_id' => 'required|exists:payment_methods,id',
            'counts.*.counted_amount' => 'required|numeric|min:0',
            'counts.*.notes' => 'nullable|string|max:255',
        ]);

        $allowedBranchIds = $this->getAllowedBranchIds($request);
        if (! in_array((int) $validated['branch_id'], $allowedBranchIds)) {
            abort(403, 'No tiene permiso para realizar el cierre de esta sucursal.');
        }

        $user = $request->user();
        $closing = $this->dailyClosingService->getOrCreateClosing(
            (int) $validated['branch_id'],
            $validated['closing_date'],
            $user->id
        );

        if ($closing->status === 'CLOSED') {
            return back()->with('error', 'Este cierre ya se encuentra confirmado y cerrado definitivamente.');
        }

        try {
            if ($validated['action'] === 'confirm') {
                $closing = $this->dailyClosingService->confirmClosing($closing, $validated, $user->id);

                // Si existe descuadre (diferencia != 0), notificar a administradores y personal de sucursal
                try {
                    $diff = (float) $closing->difference_amount;
                    if (abs($diff) >= 0.01) {
                        $closing->load('branch');
                        $branchUsers = User::whereHas('branches', function ($query) use ($closing) {
                            $query->where('branches.id', $closing->branch_id);
                        })->orWhere('default_branch_id', $closing->branch_id)->get();

                        $adminUsers = User::role('Super Admin')->get();
                        $usersToNotify = $branchUsers->merge($adminUsers)->unique('id');

                        Notification::send($usersToNotify, new DailyClosingDiscrepancyNotification($closing, $diff));
                    }
                } catch (Exception $notifEx) {
                    Log::error('Error sending closing discrepancy notification: '.$notifEx->getMessage());
                }

                return redirect()->route('closings.show', $closing->id)
                    ->with('success', '¡Cierre diario confirmado exitosamente!');
            }

            // Save draft
            $this->dailyClosingService->saveDraft($closing, $validated, $user->id);

            return back()->with('success', 'Borrador de arqueo de caja guardado exitosamente.');
        } catch (Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Display a specific audited daily closing.
     */
    public function show(Request $request, DailyClosing $closing): Response
    {
        $allowedBranchIds = $this->getAllowedBranchIds($request);
        if (! in_array($closing->branch_id, $allowedBranchIds)) {
            abort(403, 'No tiene permiso para ver el cierre de esta sucursal.');
        }

        $closing->load([
            'branch',
            'openedByUser',
            'closedByUser',
            'versions.creator',
            'versions.cashCounts.paymentMethod',
            'latestVersion.cashCounts.paymentMethod',
        ]);

        return Inertia::render('closings/show', [
            'closing' => $closing,
        ]);
    }

    /**
     * Render the 80mm thermal ticket for the daily closing.
     */
    public function printTicket(Request $request, DailyClosing $closing)
    {
        $allowedBranchIds = $this->getAllowedBranchIds($request);
        if (! in_array($closing->branch_id, $allowedBranchIds)) {
            abort(403, 'No tiene permiso para ver el comprobante de esta sucursal.');
        }

        $closing->load([
            'branch',
            'openedByUser',
            'closedByUser',
            'latestVersion.cashCounts.paymentMethod',
            'latestVersion.creator',
        ]);

        $company = Company::find($closing->branch->company_id) ?? Company::first();

        return view('closings.print.ticket-80mm', [
            'closing' => $closing,
            'company' => $company,
        ]);
    }
}
