<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\InventoryAdjustment;
use App\Models\InventoryAdjustmentLine;
use App\Models\Lot;
use App\Services\KardexService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class InventoryAdjustmentController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status');
        $type = $request->input('type');

        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $canSeeAllBranches = $isSuperAdmin || $user->hasPermissionTo('view_inventory_general');

        $allowedBranchIds = $canSeeAllBranches
            ? Branch::pluck('id')->toArray()
            : $user->branches()->pluck('branches.id')->toArray();

        if (empty($allowedBranchIds) && ! $canSeeAllBranches && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        $baseQuery = InventoryAdjustment::query()
            ->whereIn('branch_id', $allowedBranchIds);

        $totalAdjustments = (clone $baseQuery)->count();
        $positiveCount = (clone $baseQuery)->where('adjustment_type', 'POSITIVE')->where('status', 'CONFIRMED')->count();
        $negativeCount = (clone $baseQuery)->where('adjustment_type', 'NEGATIVE')->where('status', 'CONFIRMED')->count();
        $draftCount = (clone $baseQuery)->where('status', 'DRAFT')->count();

        $metrics = [
            'total_adjustments' => $totalAdjustments,
            'positive_count' => $positiveCount,
            'negative_count' => $negativeCount,
            'draft_count' => $draftCount,
        ];

        $adjustments = (clone $baseQuery)
            ->with(['branch', 'creator'])
            ->when($search, function ($query, $search) {
                $query->whereLikeAccentInsensitive('adjustment_number', "%{$search}%");
            })
            ->when($status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($type, function ($query, $type) {
                $query->where('adjustment_type', $type);
            })
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('inventory/adjustments/index', [
            'adjustments' => $adjustments,
            'filters' => $request->only(['search', 'status', 'type']),
            'canSeeAllBranches' => $canSeeAllBranches,
            'metrics' => $metrics,
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $canSeeAllBranches = $isSuperAdmin || $user->hasPermissionTo('view_inventory_general');

        $branches = $canSeeAllBranches
            ? Branch::orderBy('name')->get()
            : $user->branches()->orderBy('name')->get();

        if ($branches->isEmpty() && $user->default_branch_id) {
            $branches = Branch::where('id', $user->default_branch_id)->get();
        }

        return Inertia::render('inventory/adjustments/create', [
            'branches' => $branches,
            'canSeeAllBranches' => $canSeeAllBranches,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'exists:branches,id'],
            'adjustment_type' => ['required', 'in:POSITIVE,NEGATIVE'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'lines.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'lines.*.reason_code' => ['required', 'string', 'max:30'],
        ]);

        DB::beginTransaction();
        try {
            $prefix = $validated['adjustment_type'] === 'POSITIVE' ? 'AJP' : 'AJN';
            $adjustmentNumber = $prefix.date('Ymd').'-'.strtoupper(Str::random(5));

            $adjustment = InventoryAdjustment::create([
                'uuid' => (string) Str::uuid(),
                'branch_id' => $validated['branch_id'],
                'adjustment_number' => $adjustmentNumber,
                'operation_date' => now(),
                'adjustment_type' => $validated['adjustment_type'],
                'status' => 'DRAFT',
                'notes' => $validated['notes'] ?? null,
                'created_by' => Auth::id(),
            ]);

            foreach ($validated['lines'] as $lineData) {
                $unitCost = $validated['adjustment_type'] === 'POSITIVE' ? ($lineData['unit_cost'] ?? 0) : 0;
                $lineTotalCost = $lineData['quantity'] * $unitCost;

                InventoryAdjustmentLine::create([
                    'uuid' => (string) Str::uuid(),
                    'inventory_adjustment_id' => $adjustment->id,
                    'product_id' => $lineData['product_id'],
                    'quantity' => $lineData['quantity'],
                    'unit_cost' => $unitCost,
                    'line_total_cost' => $lineTotalCost,
                    'reason_code' => $lineData['reason_code'],
                ]);
            }

            DB::commit();

            return redirect()->route('inventory.adjustments.show', $adjustment->id)
                ->with('success', 'Ajuste en borrador creado con éxito.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al crear el ajuste: '.$e->getMessage());
        }
    }

    public function show(InventoryAdjustment $adjustment)
    {
        $adjustment->load(['branch', 'creator', 'lines.product.inventories', 'confirmedBy']);

        return Inertia::render('inventory/adjustments/show', [
            'adjustment' => $adjustment,
        ]);
    }

    public function confirm(InventoryAdjustment $adjustment, KardexService $kardexService)
    {
        if ($adjustment->status !== 'DRAFT') {
            return back()->with('error', 'Solo los ajustes en borrador pueden ser confirmados.');
        }

        DB::beginTransaction();
        try {
            $adjustment->load('lines');

            foreach ($adjustment->lines as $line) {
                $operationType = $adjustment->adjustment_type === 'POSITIVE' ? 'AJUSTE_ENTRADA' : 'AJUSTE_SALIDA';

                $data = [
                    'branch_id' => $adjustment->branch_id,
                    'product_id' => $line->product_id,
                    'quantity' => $line->quantity,
                    'operation_type' => $operationType,
                    'reference' => 'Ajuste: '.$adjustment->adjustment_number.' - '.$line->reason_code,
                    'user_id' => Auth::id(),
                ];

                if ($adjustment->adjustment_type === 'POSITIVE') {
                    $data['unit_cost'] = $line->unit_cost;
                    $kardexService->recordEntry($data);

                    // Crear Lote para ajuste positivo
                    $lotNumber = 'LOT-ADJ-'.date('Ymd').'-'.strtoupper(Str::random(4));
                    Lot::create([
                        'uuid' => (string) Str::uuid(),
                        'branch_id' => $adjustment->branch_id,
                        'product_id' => $line->product_id,
                        'lot_number' => $lotNumber,
                        'original_quantity' => $line->quantity,
                        'current_quantity' => $line->quantity,
                        'unit_cost' => $line->unit_cost,
                        'status' => 'ACTIVE',
                    ]);
                } else {
                    $kardexService->recordExit($data);

                    // Actualizar el costo de la línea de ajuste para registro histórico (ya que la salida toma el costo promedio real)
                    $inventory = Inventory::where('branch_id', $adjustment->branch_id)
                        ->where('product_id', $line->product_id)
                        ->first();

                    if ($inventory) {
                        $line->update([
                            'unit_cost' => $inventory->average_cost,
                            'line_total_cost' => $inventory->average_cost * $line->quantity,
                        ]);
                    }

                    // Descontar lotes para ajuste negativo (FIFO)
                    $remainingToDeduct = (float) $line->quantity;
                    $lots = Lot::where('branch_id', $adjustment->branch_id)
                        ->where('product_id', $line->product_id)
                        ->where('current_quantity', '>', 0)
                        ->orderBy('created_at', 'asc')
                        ->lockForUpdate()
                        ->get();

                    foreach ($lots as $lot) {
                        if ($remainingToDeduct <= 0) {
                            break;
                        }

                        $availableInLot = (float) $lot->current_quantity;
                        $toDeduct = min($availableInLot, $remainingToDeduct);

                        $lot->current_quantity = $availableInLot - $toDeduct;
                        if ($lot->current_quantity <= 0.000001) {
                            $lot->current_quantity = 0;
                            $lot->status = 'DEPLETED';
                        }
                        $lot->save();

                        $remainingToDeduct -= $toDeduct;
                    }
                }
            }

            $adjustment->update([
                'status' => 'CONFIRMED',
                'confirmed_by' => Auth::id(),
                'confirmed_at' => now(),
            ]);

            DB::commit();

            return back()->with('success', 'Ajuste confirmado y Kardex actualizado exitosamente.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al confirmar el ajuste: '.$e->getMessage());
        }
    }
}
