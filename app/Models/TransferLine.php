<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_id', 'product_id',
        'requested_quantity', 'shipped_quantity', 'received_quantity',
        'damaged_quantity', 'missing_quantity', 'unit_cost', 'notes',
    ];

    protected $casts = [
        'requested_quantity' => 'decimal:6',
        'shipped_quantity' => 'decimal:6',
        'received_quantity' => 'decimal:6',
        'damaged_quantity' => 'decimal:6',
        'missing_quantity' => 'decimal:6',
        'unit_cost' => 'decimal:4',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(Transfer::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
