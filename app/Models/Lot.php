<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lot extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'product_id', 'lot_number',
        'inventory_entry_line_id', 'manufacturing_date', 'expiration_date',
        'original_quantity', 'current_quantity', 'unit_cost', 'status',
    ];

    protected function casts(): array
    {
        return [
            'manufacturing_date' => 'date',
            'expiration_date' => 'date',
            'original_quantity' => 'decimal:6',
            'current_quantity' => 'decimal:6',
            'unit_cost' => 'decimal:6',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function inventoryEntryLine(): BelongsTo
    {
        return $this->belongsTo(InventoryEntryLine::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(LotAllocation::class);
    }
}
