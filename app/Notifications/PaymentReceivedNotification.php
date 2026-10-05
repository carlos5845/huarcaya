<?php

namespace App\Notifications;

use App\Models\Payment;
use App\Models\Receivable;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PaymentReceivedNotification extends Notification
{
    use Queueable;

    public $payment;

    public $receivable;

    public $title;

    public $message;

    /**
     * Create a new notification instance.
     */
    public function __construct(Payment $payment, Receivable $receivable)
    {
        $this->payment = $payment;
        $this->receivable = $receivable;

        $customerName = $receivable->customer->legal_name ?? 'Cliente';
        $amount = number_format((float) $payment->total_amount, 2);
        $currency = $payment->currency_code === 'USD' ? '$' : 'S/';
        $isPaid = $receivable->balance_amount <= 0;

        $this->title = $isPaid ? 'Deuda Cancelada' : 'Abono Registrado';
        $saleNumber = $receivable->sale->sale_number ?? "CR-{$receivable->id}";

        if ($isPaid) {
            $this->message = "Se completó el pago total de {$currency} {$amount} por {$customerName} (Comprobante {$saleNumber}).";
        } else {
            $remaining = number_format((float) $receivable->balance_amount, 2);
            $this->message = "{$customerName} abonó {$currency} {$amount} (Venta {$saleNumber}). Saldo restante: {$currency} {$remaining}.";
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
            'message' => $this->message,
            'action_url' => "/receivables/{$this->receivable->id}",
            'category' => 'sales',
            'severity' => $this->receivable->balance_amount <= 0 ? 'success' : 'info',
            'receivable_id' => $this->receivable->id,
            'payment_id' => $this->payment->id,
            'customer_name' => $this->receivable->customer->legal_name ?? null,
            'amount' => (float) $this->payment->total_amount,
            'type' => 'payment_received',
        ];
    }
}
