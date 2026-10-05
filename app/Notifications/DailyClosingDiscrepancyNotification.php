<?php

namespace App\Notifications;

use App\Models\DailyClosing;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DailyClosingDiscrepancyNotification extends Notification
{
    use Queueable;

    public $closing;

    public $title;

    public $message;

    public $difference;

    /**
     * Create a new notification instance.
     */
    public function __construct(DailyClosing $closing, float $difference)
    {
        $this->closing = $closing;
        $this->difference = $difference;

        $branchName = $closing->branch->name ?? 'Sucursal';
        $formattedDiff = number_format(abs($difference), 2);
        $diffType = $difference < 0 ? 'Faltante' : 'Sobrante';

        $this->title = "Descuadre en Cierre ({$diffType})";
        $this->message = "El cierre de {$branchName} del día {$closing->closing_date->format('d/m/Y')} reportó una diferencia de S/ {$formattedDiff} ({$diffType}).";
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
            'message' => $this->message,
            'action_url' => "/closings/{$this->closing->id}",
            'category' => 'closings',
            'severity' => 'warning',
            'closing_id' => $this->closing->id,
            'branch_name' => $this->closing->branch->name ?? null,
            'difference' => $this->difference,
            'type' => 'closing_discrepancy',
        ];
    }
}
