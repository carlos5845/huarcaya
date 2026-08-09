<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryExitLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_exit_id', 'product_id', 'quantity',
        'unit_cost', 'line_total_cost', 'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
        'unit_cost' => 'decimal:6',
        'line_total_cost' => 'decimal:6',
    ];

    public function inventoryExit(): BelongsTo
    {
        return $this->belongsTo(InventoryExit::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
