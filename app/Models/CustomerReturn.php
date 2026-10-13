<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerReturn extends Model
{
    use HasFactory;

    public const SUNAT_CATALOG_09 = [
        '01' => 'Anulación de la operación',
        '06' => 'Devolución total',
        '07' => 'Devolución por ítem',
    ];

    protected $fillable = [
        'uuid', 'branch_id', 'customer_id', 'sale_id', 'return_number',
        'operation_date', 'return_type', 'settlement_type', 'refund_payment_method_id',
        'currency_code', 'exchange_rate', 'subtotal_amount', 'tax_amount',
        'total_amount', 'refunded_amount', 'credit_applied_amount', 'status',
        'is_electronic_invoiced', 'sunat_credit_note_type',
        'referenced_document_type', 'referenced_document_series', 'referenced_document_number',
        'credit_note_series', 'credit_note_number', 'electronic_status', 'electronic_payload',
        'notes', 'override_deadline_reason', 'created_by', 'confirmed_by',
        'authorized_by', 'cancelled_by', 'confirmed_at', 'cancelled_at', 'cancellation_reason',
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'exchange_rate' => 'decimal:6',
        'subtotal_amount' => 'decimal:6',
        'tax_amount' => 'decimal:6',
        'total_amount' => 'decimal:6',
        'refunded_amount' => 'decimal:6',
        'credit_applied_amount' => 'decimal:6',
        'is_electronic_invoiced' => 'boolean',
        'electronic_payload' => 'array',
        'confirmed_at' => 'datetime',
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

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(CustomerReturnLine::class);
    }

    public function refundPaymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'refund_payment_method_id');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function authorizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }
}
