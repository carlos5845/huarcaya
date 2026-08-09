<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryEntryLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_entry_id', 'purchase_line_id', 'product_id',
        'quantity', 'unit_cost_original', 'unit_cost_base', 'total_cost_base',
        'condition', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6',
            'unit_cost_original' => 'decimal:6',
            'unit_cost_base' => 'decimal:6',
            'total_cost_base' => 'decimal:6',
        ];
    }

    public function inventoryEntry(): BelongsTo
    {
        return $this->belongsTo(InventoryEntry::class);
    }

    public function purchaseLine(): BelongsTo
    {
        return $this->belongsTo(PurchaseLine::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
