<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Transfer;
use App\Models\TransferLine;
use App\Models\User;
use App\Notifications\TransferRequestedNotification;
use App\Services\KardexService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TransferController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('Super Admin');

        $allowedBranchIds = $isSuperAdmin
            ? Branch::pluck('id')->toArray()
            : $user->branches()->pluck('branches.id')->toArray();

        if (empty($allowedBranchIds) && ! $isSuperAdmin && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        $transfers = Transfer::with(['sourceBranch', 'destinationBranch', 'lines.product'])
            ->where('company_id', $user->company_id)
            ->where(function ($query) use ($allowedBranchIds, $isSuperAdmin) {
                if (! $isSuperAdmin) {
                    $query->whereIn('source_branch_id', $allowedBranchIds)
                        ->orWhereIn('destination_branch_id', $allowedBranchIds);
                }
            })
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return Inertia::render('transfers/index', [
            'transfers' => $transfers,
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

        $allBranches = Branch::orderBy('name')->get();

        return Inertia::render('transfers/create', [
            'myBranches' => $branches,
            'allBranches' => $allBranches,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'source_branch_id' => 'required|exists:branches,id',
            'destination_branch_id' => 'required|exists:branches,id|different:source_branch_id',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.product_id' => 'required|exists:products,id',
            'lines.*.requested_quantity' => 'required|numeric|min:0.01',
        ]);

        $companyId = Auth::user()->company_id;

        // Validar que el origen tenga suficiente stock
        foreach ($validated['lines'] as $line) {
            $product = Product::findOrFail($line['product_id']);
            $inventory = $product->inventories()->where('branch_id', $validated['source_branch_id'])->first();

            $available = $inventory ? $inventory->available_quantity : 0;
            if ($available < $line['requested_quantity']) {
                throw ValidationException::withMessages([
                    'lines' => "No hay stock suficiente para el producto '{$product->name}' en la sucursal de origen. Disponible: {$available}",
                ]);
            }
        }

        DB::beginTransaction();
        try {
            // Generate TR-000001 format
            $latestTransfer = Transfer::where('company_id', $companyId)->orderBy('id', 'desc')->first();
            $nextNumber = $latestTransfer ? intval(str_replace('TR-', '', $latestTransfer->transfer_number)) + 1 : 1;
            $transferNumber = 'TR-'.str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

            $transfer = Transfer::create([
                'uuid' => (string) Str::uuid(),
                'company_id' => $companyId,
                'source_branch_id' => $validated['source_branch_id'],
                'destination_branch_id' => $validated['destination_branch_id'],
                'transfer_number' => $transferNumber,
                'request_date' => now(),
                'status' => 'DRAFT',
                'notes' => $validated['notes'],
                'created_by' => Auth::id(),
            ]);

            foreach ($validated['lines'] as $line) {
                TransferLine::create([
                    'uuid' => (string) Str::uuid(),
                    'transfer_id' => $transfer->id,
                    'product_id' => $line['product_id'],
                    'requested_quantity' => $line['requested_quantity'],
                    'shipped_quantity' => 0,
                    'received_quantity' => 0,
                ]);
            }

            // Notify users in the source branch
            try {
                $transfer->load('destinationBranch');
                $usersToNotify = User::whereHas('branches', function ($query) use ($transfer) {
                    $query->where('branches.id', $transfer->source_branch_id);
                })->orWhere('default_branch_id', $transfer->source_branch_id)
                    ->get();

                Notification::send($usersToNotify, new TransferRequestedNotification($transfer, 'request'));
            } catch (\Exception $e) {
                Log::error('Notif error request: '.$e->getMessage());
            }

            DB::commit();

            return redirect()->route('transfers.show', $transfer->id)->with('success', 'Transferencia solicitada con éxito.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Ocurrió un error al crear la transferencia: '.$e->getMessage());
        }
    }

    public function show(Request $request, Transfer $transfer)
    {
        $transfer->load(['sourceBranch', 'destinationBranch', 'lines.product.brand', 'lines.product.unit', 'creator']);

        $user = $request->user();

        $is_source = $user->hasRole('Super Admin') || $user->branches()->where('branch_id', $transfer->source_branch_id)->exists();
        $is_destination = $user->hasRole('Super Admin') || $user->branches()->where('branch_id', $transfer->destination_branch_id)->exists();

        return Inertia::render('transfers/show', [
            'transfer' => $transfer,
            'can_dispatch' => $user->can('dispatch', $transfer),
            'can_receive' => $user->can('receive', $transfer),
            'is_source' => $is_source,
            'is_destination' => $is_destination,
        ]);
    }

    public function cancel(Request $request, Transfer $transfer)
    {
        $user = $request->user();

        // Check auth
        if (! $user->hasRole('Super Admin')) {
            if (! $user->branches()->where('branches.id', $transfer->source_branch_id)->exists() && $user->default_branch_id !== $transfer->source_branch_id) {
                return back()->with('error', 'No tienes permiso para cancelar esta transferencia.');
            }
        }

        if ($transfer->status === 'COMPLETED' || $transfer->status === 'CANCELLED') {
            return back()->with('error', 'No se puede cancelar una transferencia que ya fue completada o cancelada.');
        }

        DB::beginTransaction();
        try {
            if ($transfer->status === 'IN_TRANSIT') {
                $kardexService = new KardexService;
                foreach ($transfer->lines as $line) {
                    // Si ya se despachó, devolvemos el stock a la sucursal de origen
                    $kardexService->recordEntry([
                        'branch_id' => $transfer->source_branch_id,
                        'product_id' => $line->product_id,
                        'quantity' => $line->shipped_quantity,
                        'unit_cost' => $line->product->cost_price ?? 0,
                        'operation_type' => 'TRANSFERENCIA_CANCELADA',
                        'reference' => 'CANCELACIÓN: '.$transfer->transfer_number,
                        'user_id' => $user->id,
                    ]);
                }
            }

            $transfer->update([
                'status' => 'CANCELLED',
                'notes' => $transfer->notes.'
(Cancelado el '.now()->format('Y-m-d H:i').' por '.$user->name.')',
            ]);

            DB::commit();

            return back()->with('success', 'La transferencia ha sido cancelada.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al cancelar la transferencia: '.$e->getMessage());
        }
    }
}
