<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'company_id', 'document_type', 'document_number',
        'legal_name', 'trade_name', 'phone', 'email', 'address',
        'status', 'store_credit_balance', 'created_by',
    ];

    protected $casts = [
        'store_credit_balance' => 'decimal:6',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function receivables(): HasMany
    {
        return $this->hasMany(Receivable::class);
    }

    public function getNameAttribute(): string
    {
        return $this->trade_name ?: ($this->legal_name ?? '');
    }
}
