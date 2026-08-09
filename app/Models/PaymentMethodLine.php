<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentMethodLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'payment_id', 'payment_method_id', 'amount',
        'reference_number', 'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:6',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }
}
