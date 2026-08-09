<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LotAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_movement_line_id', 'lot_id', 'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6',
        ];
    }

    public function movementLine(): BelongsTo
    {
        return $this->belongsTo(InventoryMovementLine::class, 'inventory_movement_line_id');
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }
}
