<?php

namespace App\Notifications;

use App\Models\Branch;
use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class StockAlertNotification extends Notification
{
    use Queueable;

    public $product;

    public $branch;

    public $currentStock;

    public $minStock;

    public $title;

    public $message;

    /**
     * Create a new notification instance.
     */
    public function __construct(Product $product, Branch $branch, float $currentStock, float $minStock)
    {
        $this->product = $product;
        $this->branch = $branch;
        $this->currentStock = $currentStock;
        $this->minStock = $minStock;

        $isOutOfStock = $currentStock <= 0;
        $this->title = $isOutOfStock ? 'Repuesto Agotado' : 'Stock Mínimo Alcanzado';

        $formattedCurrent = floor($currentStock) == $currentStock ? (string) (int) $currentStock : number_format($currentStock, 2);
        $formattedMin = floor($minStock) == $minStock ? (string) (int) $minStock : number_format($minStock, 2);

        if ($isOutOfStock) {
            $this->message = "El repuesto '{$product->name}' (SKU: {$product->sku}) se ha agotado en la sucursal {$branch->name}.";
        } else {
            $this->message = "El repuesto '{$product->name}' en {$branch->name} tiene solo {$formattedCurrent} unidades (Mínimo requerido: {$formattedMin}).";
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
            'action_url' => '/inventory',
            'category' => 'inventory',
            'severity' => $this->currentStock <= 0 ? 'critical' : 'warning',
            'product_id' => $this->product->id,
            'sku' => $this->product->sku,
            'branch_id' => $this->branch->id,
            'current_stock' => $this->currentStock,
            'min_stock' => $this->minStock,
            'type' => 'stock_alert',
        ];
    }
}
