<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Receivable extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'customer_id', 'sale_id', 'reference_type',
        'reference_id', 'issue_date', 'due_date', 'currency_code',
        'original_amount', 'balance_amount', 'status', 'notes', 'created_by',
    ];

    protected $casts = [
        'issue_date' => 'datetime',
        'due_date' => 'date',
        'original_amount' => 'decimal:6',
        'balance_amount' => 'decimal:6',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }
}
