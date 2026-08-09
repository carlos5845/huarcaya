<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPrice extends Model
{
    protected $fillable = [
        'uuid', 'product_id', 'branch_id', 'price_type',
        'currency_code', 'amount', 'effective_from',
        'effective_to', 'version', 'status', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:6',
            'effective_from' => 'datetime',
            'effective_to' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
