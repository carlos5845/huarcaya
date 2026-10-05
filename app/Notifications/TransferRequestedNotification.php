<?php

namespace App\Notifications;

use App\Models\Transfer;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TransferRequestedNotification extends Notification
{
    use Queueable;

    public $transfer;

    public $customMessage;

    public $title;

    public $type; // 'request', 'shipped', 'received'

    /**
     * Create a new notification instance.
     */
    public function __construct(Transfer $transfer, $type = 'request')
    {
        $this->transfer = $transfer;
        $this->type = $type;

        $sourceName = $transfer->sourceBranch->name ?? 'Sucursal Origen';
        $destName = $transfer->destinationBranch->name ?? 'Sucursal Destino';
        $itemsCount = $this->transfer->lines()->count();

        if ($type === 'shipped') {
            $this->title = 'Traslado en Camino';
            $this->customMessage = "La guía {$this->transfer->transfer_number} con {$itemsCount} repuesto(s) ha sido despachada desde {$sourceName} hacia {$destName}.";
        } elseif ($type === 'received') {
            $this->title = 'Mercadería Recepcionada';
            $this->customMessage = "La sucursal {$destName} recepcionó la mercadería de la guía {$this->transfer->transfer_number}.";
        } else {
            $this->title = 'Solicitud de Traslado';
            $this->customMessage = "La sucursal {$destName} ha solicitado {$itemsCount} repuesto(s) a {$sourceName} (Guía {$this->transfer->transfer_number}).";
        }
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->customMessage,
            'action_url' => "/transfers/{$this->transfer->id}",
            'category' => 'transfers',
            'severity' => $this->type === 'received' ? 'success' : 'info',
            'transfer_id' => $this->transfer->id,
            'transfer_number' => $this->transfer->transfer_number,
            'destination_branch_name' => $this->transfer->destinationBranch->name ?? null,
            'items_count' => $this->transfer->lines()->count(),
            'type' => $this->type,
        ];
    }
}
