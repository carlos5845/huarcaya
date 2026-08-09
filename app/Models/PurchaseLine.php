<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'purchase_id', 'product_id', 'ordered_quantity',
        'unit_cost_original', 'unit_cost_base', 'line_subtotal',
        'tax_amount', 'line_total', 'received_quantity', 'cancelled_quantity', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'ordered_quantity' => 'decimal:6',
            'unit_cost_original' => 'decimal:6',
            'unit_cost_base' => 'decimal:6',
            'line_subtotal' => 'decimal:6',
            'tax_amount' => 'decimal:6',
            'line_total' => 'decimal:6',
            'received_quantity' => 'decimal:6',
            'cancelled_quantity' => 'decimal:6',
        ];
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function inventoryEntryLines(): HasMany
    {
        return $this->hasMany(InventoryEntryLine::class);
    }
}
