<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'inventory_count_id', 'adjustment_number',
        'operation_date', 'adjustment_type', 'status', 'notes',
        'created_by', 'confirmed_by', 'approved_by', 'confirmed_at', 'cancelled_at',
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function inventoryCount(): BelongsTo
    {
        return $this->belongsTo(InventoryCount::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InventoryAdjustmentLine::class);
    }
}
