<?php

namespace App\Http\Controllers;

use App\Models\InventoryAdjustment;
use App\Models\InventoryAdjustmentLine;
use App\Models\Product;
use App\Models\Branch;
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
        
        $allowedBranchIds = $isSuperAdmin 
            ? Branch::pluck('id')->toArray() 
            : $user->branches()->pluck('branches.id')->toArray();

        if (empty($allowedBranchIds) && !$isSuperAdmin && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        $adjustments = InventoryAdjustment::with(['branch', 'creator'])
            ->whereIn('branch_id', $allowedBranchIds)
            ->when($search, function ($query, $search) {
                $query->where('adjustment_number', 'like', "%{$search}%");
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
            'isSuperAdmin' => $isSuperAdmin,
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');

        $branches = $isSuperAdmin 
            ? Branch::orderBy('name')->get() 
            : $user->branches()->orderBy('name')->get();

        if ($branches->isEmpty() && $user->default_branch_id) {
            $branches = Branch::where('id', $user->default_branch_id)->get();
        }

        return Inertia::render('inventory/adjustments/create', [
            'branches' => $branches,
            'isSuperAdmin' => $isSuperAdmin,
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
            $adjustmentNumber = $prefix . date('Ymd') . '-' . strtoupper(Str::random(5));

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
            return back()->with('error', 'Error al crear el ajuste: ' . $e->getMessage());
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
                    'reference' => 'Ajuste: ' . $adjustment->adjustment_number . ' - ' . $line->reason_code,
                    'user_id' => Auth::id(),
                ];

                if ($adjustment->adjustment_type === 'POSITIVE') {
                    $data['unit_cost'] = $line->unit_cost;
                    $kardexService->recordEntry($data);
                } else {
                    $kardexService->recordExit($data);
                    
                    // Actualizar el costo de la línea de ajuste para registro histórico (ya que la salida toma el costo promedio real)
                    $inventory = \App\Models\Inventory::where('branch_id', $adjustment->branch_id)
                        ->where('product_id', $line->product_id)
                        ->first();
                        
                    if ($inventory) {
                        $line->update([
                            'unit_cost' => $inventory->average_cost,
                            'line_total_cost' => $inventory->average_cost * $line->quantity,
                        ]);
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
            return back()->with('error', 'Error al confirmar el ajuste: ' . $e->getMessage());
        }
    }
}
