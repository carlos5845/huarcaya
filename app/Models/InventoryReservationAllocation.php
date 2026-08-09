<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryReservationAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_reservation_id', 'product_id',
        'requested_quantity', 'allocated_quantity', 'status',
    ];

    protected function casts(): array
    {
        return [
            'requested_quantity' => 'decimal:6',
            'allocated_quantity' => 'decimal:6',
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(InventoryReservation::class, 'inventory_reservation_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
