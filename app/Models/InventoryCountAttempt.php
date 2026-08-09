<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryCountAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_count_id', 'inventory_count_line_id',
        'attempt_number', 'counted_quantity', 'counted_by', 'counted_at',
    ];

    protected $casts = [
        'counted_quantity' => 'decimal:6',
        'counted_at' => 'datetime',
    ];

    public function inventoryCount(): BelongsTo
    {
        return $this->belongsTo(InventoryCount::class);
    }

    public function line(): BelongsTo
    {
        return $this->belongsTo(InventoryCountLine::class, 'inventory_count_line_id');
    }
}
