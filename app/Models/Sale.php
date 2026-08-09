<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'company_id', 'branch_id', 'customer_id',
        'sale_number', 'sale_type', 'operation_date', 'currency_code',
        'exchange_rate', 'subtotal_amount', 'discount_amount', 'tax_amount',
        'total_amount', 'initial_payment_amount', 'credit_amount', 'due_date',
        'status', 'external_document_type', 'external_document_series',
        'external_document_number', 'customer_name_snapshot',
        'customer_document_snapshot', 'notes', 'created_by', 'confirmed_by',
        'approved_by', 'device_id', 'created_offline', 'confirmed_at',
        'cancelled_at', 'cancelled_by', 'cancellation_reason_id',
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'exchange_rate' => 'decimal:6',
        'subtotal_amount' => 'decimal:6',
        'discount_amount' => 'decimal:6',
        'tax_amount' => 'decimal:6',
        'total_amount' => 'decimal:6',
        'initial_payment_amount' => 'decimal:6',
        'credit_amount' => 'decimal:6',
        'due_date' => 'date',
        'created_offline' => 'boolean',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SaleLine::class);
    }
}
