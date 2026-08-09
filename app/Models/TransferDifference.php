<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferDifference extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_id', 'transfer_line_id', 'product_id',
        'difference_quantity', 'resolution_status', 'resolution_notes',
        'resolved_by', 'resolved_at',
    ];

    protected $casts = [
        'difference_quantity' => 'decimal:6',
        'resolved_at' => 'datetime',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(Transfer::class);
    }

    public function transferLine(): BelongsTo
    {
        return $this->belongsTo(TransferLine::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
