<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransferShipment extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_id', 'shipment_number', 'shipment_date',
        'status', 'tracking_number', 'carrier_name', 'notes',
        'shipped_by', 'confirmed_at',
    ];

    protected $casts = [
        'shipment_date' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(Transfer::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(TransferShipmentLine::class);
    }
}
