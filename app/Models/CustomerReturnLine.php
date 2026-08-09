<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerReturnLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'customer_return_id', 'sale_line_id', 'product_id',
        'quantity', 'unit_price', 'line_total', 'condition', 'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
        'unit_price' => 'decimal:6',
        'line_total' => 'decimal:6',
    ];

    public function customerReturn(): BelongsTo
    {
        return $this->belongsTo(CustomerReturn::class);
    }

    public function saleLine(): BelongsTo
    {
        return $this->belongsTo(SaleLine::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
