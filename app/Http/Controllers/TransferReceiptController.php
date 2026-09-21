<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReceiveTransferRequest;
use App\Models\Transfer;
use App\Models\TransferReceipt;
use App\Models\TransferReceiptLine;
use App\Models\User;
use App\Notifications\TransferRequestedNotification;
use App\Services\KardexService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class TransferReceiptController extends Controller
{
    public function store(ReceiveTransferRequest $request, $id)
    {
        try {
            DB::beginTransaction();

            $transfer = Transfer::where('id', $id)->lockForUpdate()->firstOrFail();

            if ($transfer->status !== 'IN_TRANSIT') {
                DB::rollBack();

                return back()->with('error', 'La transferencia no est en trnsito.');
            }

            $user = $request->user();
            $shipment = $transfer->shipments()->latest()->first();

            if (! $shipment) {
                DB::rollBack();

                return back()->with('error', 'No hay ningn envo registrado para esta transferencia.');
            }

            $receiptNumber = 'RCT-'.Str::upper(Str::random(8));

            $receipt = TransferReceipt::create([
                'uuid' => (string) Str::uuid(),
                'transfer_id' => $transfer->id,
                'transfer_shipment_id' => $shipment->id,
                'receipt_number' => $receiptNumber,
                'receipt_date' => now(),
                'status' => 'RECEIVED',
                'received_by' => $user->id,
                'confirmed_at' => now(),
                'notes' => $request->input('notes'),
            ]);

            $kardexService = new KardexService;
            $hasDiscrepancy = false;

            $inputLines = collect($request->input('lines'))->keyBy('id');
            $transferLines = $transfer->lines()->lockForUpdate()->get();

            foreach ($transferLines as $line) {
                if (! $inputLines->has($line->id)) {
                    continue;
                }

                $input = $inputLines[$line->id];
                $received = (float) $input['received_quantity'];
                $damaged = (float) $input['damaged_quantity'];
                $missing = (float) $input['missing_quantity'];

                if ($damaged > 0 || $missing > 0) {
                    $hasDiscrepancy = true;
                }

                $line->update([
                    'received_quantity' => $received,
                    'damaged_quantity' => $damaged,
                    'missing_quantity' => $missing,
                ]);

                $shipmentLine = $shipment->lines()->where('transfer_line_id', $line->id)->first();

                if ($received > 0) {
                    TransferReceiptLine::create([
                        'uuid' => (string) Str::uuid(),
                        'transfer_receipt_id' => $receipt->id,
                        'transfer_shipment_line_id' => $shipmentLine ? $shipmentLine->id : null,
                        'transfer_line_id' => $line->id,
                        'product_id' => $line->product_id,
                        'quantity' => $received,
                        'condition' => 'GOOD',
                    ]);

                    $kardexService->recordEntry([
                        'branch_id' => $transfer->destination_branch_id,
                        'product_id' => $line->product_id,
                        'quantity' => $received,
                        'unit_cost' => $line->unit_cost > 0 ? $line->unit_cost : ($line->product->cost_price ?? 0),
                        'operation_type' => 'TRANSFERENCIA_ENTRADA',
                        'reference' => 'RECEPCIN: '.$transfer->transfer_number,
                        'user_id' => $user->id,
                    ]);
                }

                if ($damaged > 0) {
                    TransferReceiptLine::create([
                        'uuid' => (string) Str::uuid(),
                        'transfer_receipt_id' => $receipt->id,
                        'transfer_shipment_line_id' => $shipmentLine ? $shipmentLine->id : null,
                        'transfer_line_id' => $line->id,
                        'product_id' => $line->product_id,
                        'quantity' => $damaged,
                        'condition' => 'DAMAGED',
                    ]);

                    // Movimiento espejo para kardex (Entra y luego sale como merma)
                    $kardexService->recordEntry([
                        'branch_id' => $transfer->destination_branch_id,
                        'product_id' => $line->product_id,
                        'quantity' => $damaged,
                        'unit_cost' => $line->unit_cost > 0 ? $line->unit_cost : ($line->product->cost_price ?? 0),
                        'operation_type' => 'TRANSFERENCIA_ENTRADA_DANADA',
                        'reference' => 'RECEPCIN CON DAOS: '.$transfer->transfer_number,
                        'user_id' => $user->id,
                    ]);

                    $kardexService->recordExit([
                        'branch_id' => $transfer->destination_branch_id,
                        'product_id' => $line->product_id,
                        'quantity' => $damaged,
                        'operation_type' => 'AJUSTE_MERMA_RECEPCION',
                        'reference' => 'BAJA POR DAO: '.$transfer->transfer_number,
                        'user_id' => $user->id,
                    ]);
                }

                if ($missing > 0) {
                    TransferReceiptLine::create([
                        'uuid' => (string) Str::uuid(),
                        'transfer_receipt_id' => $receipt->id,
                        'transfer_shipment_line_id' => $shipmentLine ? $shipmentLine->id : null,
                        'transfer_line_id' => $line->id,
                        'product_id' => $line->product_id,
                        'quantity' => $missing,
                        'condition' => 'MISSING',
                    ]);
                }
            }

            $transfer->update([
                'status' => $hasDiscrepancy ? 'WITH_DISCREPANCY' : 'COMPLETED',
                'reception_notes' => $request->input('notes'),
                'received_by_user_id' => $user->id,
                'received_at' => now(),
            ]);
            // Notify users in the source branch
            try {
                $transfer->load('sourceBranch');
                $usersToNotify = User::whereHas('branches', function ($query) use ($transfer) {
                    $query->where('branches.id', $transfer->source_branch_id);
                })->orWhere('default_branch_id', $transfer->source_branch_id)
                    ->get();

                Notification::send($usersToNotify, new TransferRequestedNotification($transfer, 'received'));
            } catch (\Exception $e) {
                Log::error('Notif error received: '.$e->getMessage());
            }

            DB::commit();

            return back()->with('success', 'Mercadera recibida exitosamente. '.($hasDiscrepancy ? 'Con discrepancias.' : ''));
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Error al procesar la recepcin: '.$e->getMessage());
        }
    }
}
