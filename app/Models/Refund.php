<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Refund extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'customer_id', 'customer_return_id',
        'refund_number', 'operation_date', 'currency_code', 'exchange_rate',
        'total_amount', 'status', 'notes', 'created_by', 'cancelled_at',
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'exchange_rate' => 'decimal:6',
        'total_amount' => 'decimal:6',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function customerReturn(): BelongsTo
    {
        return $this->belongsTo(CustomerReturn::class);
    }

    public function methodLines(): HasMany
    {
        return $this->hasMany(RefundMethodLine::class);
    }
}
