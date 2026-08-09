<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryMovementLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_movement_id', 'product_id',
        'direction', 'quantity', 'unit_cost', 'total_cost',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6',
            'unit_cost' => 'decimal:6',
            'total_cost' => 'decimal:6',
        ];
    }

    public function movement(): BelongsTo
    {
        return $this->belongsTo(InventoryMovement::class, 'inventory_movement_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function lotAllocations(): HasMany
    {
        return $this->hasMany(LotAllocation::class);
    }
}
