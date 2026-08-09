<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssemblyOrderComponent extends Model
{
    protected $fillable = [
        'uuid', 'assembly_order_id', 'product_id',
        'required_quantity', 'used_quantity', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'required_quantity' => 'decimal:6',
            'used_quantity' => 'decimal:6',
        ];
    }

    public function assemblyOrder(): BelongsTo
    {
        return $this->belongsTo(AssemblyOrder::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
