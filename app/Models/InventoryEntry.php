<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'entry_number', 'entry_type', 'operation_date',
        'purchase_id', 'supplier_id', 'source_type', 'source_id',
        'external_document_type', 'external_document_number', 'currency_code',
        'exchange_rate', 'status', 'notes', 'created_by', 'confirmed_by',
        'device_id', 'created_offline', 'confirmed_at', 'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'operation_date' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'exchange_rate' => 'decimal:6',
            'created_offline' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InventoryEntryLine::class);
    }
}
