<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Conflict;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Product;
use App\Services\ConflictResolutionService;
use Exception;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConflictController extends Controller
{
    public function __construct(
        public ConflictResolutionService $conflictResolutionService
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
     * Authorizes that the user is allowed to view or act upon the conflict.
     */
    protected function authorizeConflictAccess(Request $request, Conflict $conflict): void
    {
        $user = $request->user();
        if ($user->hasRole('Super Admin')) {
            return;
        }

        $allowedBranchIds = $this->getAllowedBranchIds($request);
        $conflictBranchId = $conflict->branch?->id;

        if ($conflictBranchId && ! in_array($conflictBranchId, $allowedBranchIds)) {
            abort(403, 'No tiene permiso para acceder a los conflictos de esta sucursal.');
        }
    }

    /**
     * Display a listing of synchronization conflicts with KPIs and filters.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $this->getAllowedBranchIds($request);
        $allowedBranchValues = array_unique(array_merge(
            array_map('intval', $allowedBranchIds),
            array_map('strval', $allowedBranchIds)
        ));

        $query = Conflict::with(['syncOperation.user', 'syncOperation.device.branch', 'resolver'])
            ->latest();

        // 1. Branch scoping for non-Super Admin
        if (! $isSuperAdmin) {
            $query->where(function ($q) use ($allowedBranchValues, $allowedBranchIds) {
                $q->whereIn('client_state->branch_id', $allowedBranchValues)
                    ->orWhereHas('syncOperation.device', function ($dq) use ($allowedBranchIds) {
                        $dq->whereIn('branch_id', $allowedBranchIds);
                    });
            });
        }

        // 2. Status Filter
        $status = $request->input('status', 'PENDING');
        if ($status === 'PENDING') {
            $query->pending();
        } elseif ($status === 'RESOLVED') {
            $query->resolved();
        } elseif ($status === 'REJECTED') {
            $query->rejected();
        } elseif ($status !== 'ALL') {
            $query->where('status', $status);
        }

        // 3. Conflict Type Filter
        if ($request->filled('conflict_type') && $request->input('conflict_type') !== 'ALL') {
            $query->where('conflict_type', $request->input('conflict_type'));
        }

        // 4. Search Filter
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('uuid', 'ilike', "%{$search}%")
                    ->orWhere('entity_uuid', 'ilike', "%{$search}%")
                    ->orWhere('resolution_notes', 'ilike', "%{$search}%")
                    ->orWhereHas('syncOperation.user', function ($uq) use ($search) {
                        $uq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    });
            });
        }

        // 5. Date Range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        // 6. Branch Filter from request
        if ($request->filled('branch_id') && $request->input('branch_id') !== 'ALL') {
            $bId = (int) $request->input('branch_id');
            if (! in_array($bId, $allowedBranchIds)) {
                abort(403, 'No tiene permiso para acceder a esta sucursal.');
            }
            $query->where(function ($q) use ($bId) {
                $q->whereIn('client_state->branch_id', [$bId, (string) $bId])
                    ->orWhereHas('syncOperation.device', function ($dq) use ($bId) {
                        $dq->where('branch_id', $bId);
                    });
            });
        }

        $conflicts = $query->paginate(15)->withQueryString();

        // Compute metrics scoped to user's allowed branches
        $baseMetricsQuery = Conflict::query();
        if (! $isSuperAdmin) {
            $baseMetricsQuery->where(function ($q) use ($allowedBranchValues, $allowedBranchIds) {
                $q->whereIn('client_state->branch_id', $allowedBranchValues)
                    ->orWhereHas('syncOperation.device', function ($dq) use ($allowedBranchIds) {
                        $dq->whereIn('branch_id', $allowedBranchIds);
                    });
            });
        }

        $metrics = [
            'pending_count' => (clone $baseMetricsQuery)->pending()->count(),
            'resolved_count' => (clone $baseMetricsQuery)->resolved()->count(),
            'rejected_count' => (clone $baseMetricsQuery)->rejected()->count(),
            'total_count' => (clone $baseMetricsQuery)->count(),
        ];

        $branches = Branch::whereIn('id', $allowedBranchIds)->select('id', 'name', 'code')->orderBy('name')->get();

        return Inertia::render('conflicts/index', [
            'conflicts' => $conflicts,
            'metrics' => $metrics,
            'branches' => $branches,
            'is_super_admin' => $isSuperAdmin,
            'filters' => [
                'status' => $status,
                'conflict_type' => $request->input('conflict_type', 'ALL'),
                'branch_id' => $request->input('branch_id', 'ALL'),
                'search' => $request->input('search', ''),
                'date_from' => $request->input('date_from', ''),
                'date_to' => $request->input('date_to', ''),
            ],
        ]);
    }

    /**
     * Show detailed side-by-side comparison of a conflict.
     */
    public function show(Request $request, Conflict $conflict): Response
    {
        $this->authorizeConflictAccess($request, $conflict);

        $conflict->load(['syncOperation.user', 'syncOperation.device.branch', 'resolver']);

        $clientState = $conflict->client_state ?? [];
        $branchId = (int) ($clientState['branch_id'] ?? $conflict->branch?->id ?? 1);
        $branch = Branch::find($branchId);

        $serverContext = [
            'branch' => $branch ? ['id' => $branch->id, 'name' => $branch->name, 'code' => $branch->code] : null,
            'products' => [],
            'customer' => null,
        ];

        // Enrich product details and current server inventory
        if (! empty($clientState['lines']) && is_array($clientState['lines'])) {
            foreach ($clientState['lines'] as $line) {
                $pId = $line['product_id'] ?? null;
                if (! $pId && ! empty($line['product_uuid'])) {
                    $prod = Product::where('uuid', $line['product_uuid'])->first();
                    $pId = $prod?->id;
                }

                if ($pId) {
                    $prod = Product::find($pId);
                    $inv = Inventory::where('branch_id', $branchId)->where('product_id', $pId)->first();

                    $serverContext['products'][$pId] = [
                        'id' => $pId,
                        'name' => $prod?->name ?? 'Producto Desconocido',
                        'primary_reference' => $prod?->primary_reference ?? 'S/R',
                        'status' => $prod?->status ?? 'INACTIVE',
                        'price' => $prod?->sale_price ?? 0,
                        'current_physical_stock' => $inv ? (float) $inv->physical_quantity : 0.0,
                        'current_available_stock' => $inv ? (float) $inv->available_quantity : 0.0,
                    ];
                }
            }
        }

        // Enrich customer if present
        $custUuid = $clientState['customer_uuid'] ?? null;
        $custDoc = $clientState['customer_document'] ?? null;
        if ($custUuid || $custDoc) {
            $customer = Customer::where('uuid', $custUuid)
                ->orWhere('document_number', $custDoc)
                ->first();

            if ($customer) {
                $serverContext['customer'] = [
                    'id' => $customer->id,
                    'legal_name' => $customer->legal_name,
                    'document_number' => $customer->document_number,
                    'status' => $customer->status,
                ];
            }
        }

        return Inertia::render('conflicts/show', [
            'conflict' => $conflict,
            'serverContext' => $serverContext,
        ]);
    }

    /**
     * Reject an offline conflict.
     */
    public function reject(Request $request, Conflict $conflict)
    {
        $this->authorizeConflictAccess($request, $conflict);

        $validated = $request->validate([
            'notes' => 'required|string|min:5|max:1000',
        ], [
            'notes.required' => 'Debe ingresar una justificación o nota de resolución.',
            'notes.min' => 'La justificación debe tener al menos 5 caracteres.',
        ]);

        try {
            $this->conflictResolutionService->reject($conflict, $request->user(), $validated['notes']);

            return redirect()->back()->with('success', 'El conflicto ha sido rechazado y descartado correctamente.');
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Error al rechazar el conflicto: '.$e->getMessage());
        }
    }

    /**
     * Resolve a conflict with corrected data and reprocess.
     */
    public function correct(Request $request, Conflict $conflict)
    {
        $this->authorizeConflictAccess($request, $conflict);

        $validated = $request->validate([
            'payload' => 'required|array',
            'notes' => 'required|string|min:5|max:1000',
        ], [
            'payload.required' => 'El cuerpo de datos corregido es requerido.',
            'notes.required' => 'Debe ingresar una justificación para la corrección.',
            'notes.min' => 'La justificación debe tener al menos 5 caracteres.',
        ]);

        try {
            $result = $this->conflictResolutionService->resolveWithCorrection(
                $conflict,
                $validated['payload'],
                $request->user(),
                $validated['notes']
            );

            if (($result['status'] ?? '') === 'SUCCESS') {
                return redirect()->route('conflicts.show', $conflict->id)
                    ->with('success', 'Conflicto resuelto exitosamente con los datos corregidos.');
            }

            return redirect()->back()->with('error', 'El reprocesamiento no tuvo éxito: '.($result['message'] ?? 'Error desconocido'));
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Error al corregir el conflicto: '.$e->getMessage());
        }
    }

    /**
     * Authorize exception with automatic Kardex regularization.
     */
    public function force(Request $request, Conflict $conflict)
    {
        $this->authorizeConflictAccess($request, $conflict);

        $validated = $request->validate([
            'notes' => 'required|string|min:5|max:1000',
        ], [
            'notes.required' => 'Debe ingresar la justificación obligatoria para autorizar la excepción.',
            'notes.min' => 'La justificación debe tener al menos 5 caracteres.',
        ]);

        try {
            $result = $this->conflictResolutionService->resolveWithForceAuthorization(
                $conflict,
                $request->user(),
                $validated['notes']
            );

            if (($result['status'] ?? '') === 'SUCCESS') {
                return redirect()->route('conflicts.show', $conflict->id)
                    ->with('success', 'Excepción autorizada. Se regularizó el inventario en Kardex y la operación se procesó con éxito.');
            }

            return redirect()->back()->with('error', 'No se pudo forzar la operación: '.($result['message'] ?? 'Error desconocido'));
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Error al autorizar la excepción: '.$e->getMessage());
        }
    }
}
