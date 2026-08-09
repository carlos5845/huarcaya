<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferShipmentLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_shipment_id', 'transfer_line_id', 'product_id',
        'quantity', 'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(TransferShipment::class, 'transfer_shipment_id');
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
