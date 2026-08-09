<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryCountLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_count_id', 'product_id',
        'system_quantity', 'counted_quantity', 'difference_quantity', 'notes',
    ];

    protected $casts = [
        'system_quantity' => 'decimal:6',
        'counted_quantity' => 'decimal:6',
        'difference_quantity' => 'decimal:6',
    ];

    public function inventoryCount(): BelongsTo
    {
        return $this->belongsTo(InventoryCount::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(InventoryCountAttempt::class);
    }
}
