<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\KardexEntry;
use App\Services\FifoKardexSimulatorService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;

class KardexController extends Controller
{
    public function __construct(
        protected FifoKardexSimulatorService $fifoSimulator
    ) {}

    public function index(Request $request)
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
        $method = strtoupper($request->input('method', 'AVERAGE'));
        if (! in_array($method, ['AVERAGE', 'PEPS'])) {
            $method = 'AVERAGE';
        }

        // Si no tiene permiso de ver todas las sucursales, forzar exclusivamente su propia sucursal
        if (! $canSeeAllBranches) {
            $userBranchId = $user->default_branch_id ?? ($allowedBranchIds[0] ?? null);
            $allowedBranchIds = $userBranchId ? [$userBranchId] : [];
            $branchId = $userBranchId;
        }

        $query = KardexEntry::with(['product', 'user', 'branch', 'originalEntry'])
            ->whereIn('branch_id', $allowedBranchIds)
            ->when($branchId && $branchId !== 'ALL', fn ($q) => $q->where('branch_id', $branchId))
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereLikeAccentInsensitive('operation_type', "%{$search}%")
                        ->orWhereLikeAccentInsensitive('reference', "%{$search}%")
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->whereLikeAccentInsensitive('name', "%{$search}%");
                        })
                        ->orWhereHas('product', function ($pq) use ($search) {
                            $pq->whereLikeAccentInsensitive('name', "%{$search}%")
                                ->orWhereLikeAccentInsensitive('internal_code', "%{$search}%")
                                ->orWhereLikeAccentInsensitive('primary_reference', "%{$search}%");
                        });
                });
            })
            ->when($dateFrom, function ($query, $dateFrom) {
                $query->whereDate('operation_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                $query->whereDate('operation_date', '<=', $dateTo);
            });

        if ($method === 'PEPS') {
            $allSimulated = $this->fifoSimulator->simulateQuery($query, 'desc');
            $page = (int) $request->input('page', 1);
            $perPage = 50;
            $sliced = $allSimulated->slice(($page - 1) * $perPage, $perPage)->values();
            $entries = new LengthAwarePaginator(
                $sliced,
                $allSimulated->count(),
                $perPage,
                $page,
                ['path' => $request->url(), 'query' => $request->query()]
            );
        } else {
            $entries = $query->orderBy('sequence_number', 'desc')
                ->paginate(50)
                ->withQueryString();
        }

        $branches = $canSeeAllBranches
            ? Branch::orderBy('name')->get()
            : $user->branches()->orderBy('name')->get();
        if ($branches->isEmpty() && $user->default_branch_id) {
            $branches = Branch::where('id', $user->default_branch_id)->get();
        }

        return Inertia::render('inventory/kardex/index', [
            'entries' => $entries,
            'branches' => $branches,
            'canSeeAllBranches' => $canSeeAllBranches,
            'filters' => array_merge(
                $request->only(['branch_id', 'search', 'date_from', 'date_to']),
                ['method' => $method]
            ),
        ]);
    }
}
