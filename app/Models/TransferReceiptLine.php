<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferReceiptLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_receipt_id', 'transfer_shipment_line_id',
        'transfer_line_id', 'product_id', 'quantity', 'condition', 'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
    ];

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(TransferReceipt::class, 'transfer_receipt_id');
    }

    public function shipmentLine(): BelongsTo
    {
        return $this->belongsTo(TransferShipmentLine::class, 'transfer_shipment_line_id');
    }

    public function transferLine(): BelongsTo
    {
        return $this->belongsTo(TransferLine::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
