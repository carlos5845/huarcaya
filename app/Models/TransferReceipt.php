<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransferReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_id', 'transfer_shipment_id', 'receipt_number',
        'receipt_date', 'status', 'notes', 'received_by', 'confirmed_at',
    ];

    protected $casts = [
        'receipt_date' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(Transfer::class);
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(TransferShipment::class, 'transfer_shipment_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(TransferReceiptLine::class);
    }
}
