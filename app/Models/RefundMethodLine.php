<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefundMethodLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'refund_id', 'payment_method_id', 'amount',
        'reference_number', 'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:6',
    ];

    public function refund(): BelongsTo
    {
        return $this->belongsTo(Refund::class);
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }
}
