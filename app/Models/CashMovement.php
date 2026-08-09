<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'cash_register_id', 'movement_type', 'amount', 'currency_code',
        'operation_date', 'reference_type', 'reference_id', 'notes', 'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:6',
        'operation_date' => 'datetime',
    ];

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }
}
