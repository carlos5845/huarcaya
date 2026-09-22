<?php

namespace App\Http\Controllers;

use App\Models\Lot;
use App\Models\Transfer;
use App\Models\TransferShipment;
use App\Models\TransferShipmentLine;
use App\Models\User;
use App\Notifications\TransferRequestedNotification;
use App\Services\KardexService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class TransferShipmentController extends Controller
{
    public function store(Request $request, Transfer $transfer)
    {
        if ($transfer->status !== 'DRAFT') {
            return back()->with('error', 'La transferencia no está en estado borrador.');
        }

        $user = $request->user();

        // Autorización: solo el admin de tienda de la sucursal origen o Super Admin puede despachar
        if (! $user->hasRole('Super Admin')) {
            if (! $user->branches()->where('branches.id', $transfer->source_branch_id)->exists() && $user->default_branch_id !== $transfer->source_branch_id) {
                return back()->with('error', 'No tienes permiso para despachar desde esta sucursal.');
            }
        }

        DB::beginTransaction();
        try {
            // Generar el envío
            $shipmentNumber = 'SHP-'.Str::upper(Str::random(8));

            $shipment = TransferShipment::create([
                'uuid' => (string) Str::uuid(),
                'transfer_id' => $transfer->id,
                'shipment_number' => $shipmentNumber,
                'shipment_date' => now(),
                'status' => 'SHIPPED', // Se envía inmediatamente
                'shipped_by' => $user->id,
                'confirmed_at' => now(),
            ]);

            $kardexService = new KardexService;

            foreach ($transfer->lines as $line) {
                // Registrar el detalle del envío
                TransferShipmentLine::create([
                    'uuid' => (string) Str::uuid(),
                    'transfer_shipment_id' => $shipment->id,
                    'transfer_line_id' => $line->id,
                    'product_id' => $line->product_id,
                    'quantity' => $line->requested_quantity,
                ]);

                // Registrar salida en Kardex (Sucursal origen)
                $kardexEntry = $kardexService->recordExit([
                    'branch_id' => $transfer->source_branch_id,
                    'product_id' => $line->product_id,
                    'quantity' => $line->requested_quantity,
                    'operation_type' => 'TRANSFERENCIA_SALIDA',
                    'reference' => 'TRASLADO: '.$transfer->transfer_number,
                    'user_id' => $user->id,
                ]);

                // Actualizar la línea de transferencia con cantidad despachada y costo unitario congelado de origen
                $unitCost = (float) $kardexEntry->output_unit_cost;
                $line->update([
                    'shipped_quantity' => $line->requested_quantity,
                    'unit_cost' => $unitCost,
                ]);

                // Descontar lotes en la sucursal de origen (FIFO)
                $remainingToDeduct = (float) $line->requested_quantity;
                $lots = Lot::where('branch_id', $transfer->source_branch_id)
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

            // Cambiar estado de la transferencia
            $transfer->update([
                'status' => 'IN_TRANSIT',
            ]);

            // Notify users in the destination branch
            try {
                $transfer->load('destinationBranch');
                $usersToNotify = User::whereHas('branches', function ($query) use ($transfer) {
                    $query->where('branches.id', $transfer->destination_branch_id);
                })->orWhere('default_branch_id', $transfer->destination_branch_id)
                    ->get();

                Notification::send($usersToNotify, new TransferRequestedNotification($transfer, 'shipped'));
            } catch (\Exception $e) {
                Log::error('Notif error shipped: '.$e->getMessage());
            }

            DB::commit();

            return back()->with('success', 'Mercadería despachada exitosamente. La transferencia está en tránsito.');
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al procesar el despacho: '.$e->getMessage());
        }
    }
}
