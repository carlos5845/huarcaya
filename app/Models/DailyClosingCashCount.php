<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyClosingCashCount extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'daily_closing_version_id', 'payment_method_id',
        'expected_amount', 'counted_amount', 'difference_amount', 'notes',
    ];

    protected $casts = [
        'expected_amount' => 'decimal:6',
        'counted_amount' => 'decimal:6',
        'difference_amount' => 'decimal:6',
    ];

    public function version(): BelongsTo
    {
        return $this->belongsTo(DailyClosingVersion::class, 'daily_closing_version_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }
}
