<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Inventory extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'product_id',
        'physical_quantity', 'available_quantity', 'average_cost',
        'status', 'last_counted_at',
    ];

    protected function casts(): array
    {
        return [
            'physical_quantity' => 'decimal:6',
            'available_quantity' => 'decimal:6',
            'average_cost' => 'decimal:6',
            'last_counted_at' => 'datetime',
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

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class);
    }
}
