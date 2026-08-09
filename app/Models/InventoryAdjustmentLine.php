<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryAdjustmentLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_adjustment_id', 'product_id',
        'quantity', 'unit_cost', 'line_total_cost', 'reason_code', 'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
        'unit_cost' => 'decimal:6',
        'line_total_cost' => 'decimal:6',
    ];

    public function inventoryAdjustment(): BelongsTo
    {
        return $this->belongsTo(InventoryAdjustment::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
