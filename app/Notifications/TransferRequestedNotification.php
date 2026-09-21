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

    public $type; // 'request', 'shipped', 'received'

    /**
     * Create a new notification instance.
     */
    public function __construct(Transfer $transfer, $type = 'request')
    {
        $this->transfer = $transfer;
        $this->type = $type;

        if ($type === 'shipped') {
            $this->customMessage = "Tu solicitud ya est en camino (Gua {$this->transfer->transfer_number}).";
        } elseif ($type === 'received') {
            $this->customMessage = "La sucursal {$this->transfer->destinationBranch->name} ha recepcionado la mercadera (Gua {$this->transfer->transfer_number}).";
        } else {
            $this->customMessage = "La sucursal {$this->transfer->destinationBranch->name} ha solicitado {$this->transfer->lines()->count()} repuesto(s). (Gua {$this->transfer->transfer_number})";
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
            'transfer_id' => $this->transfer->id,
            'transfer_number' => $this->transfer->transfer_number,
            'destination_branch_name' => $this->transfer->destinationBranch->name,
            'items_count' => $this->transfer->lines()->count(),
            'message' => $this->customMessage,
            'type' => $this->type,
        ];
    }
}
