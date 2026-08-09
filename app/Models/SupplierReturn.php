<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'supplier_id', 'purchase_id', 'return_number',
        'operation_date', 'return_type', 'status', 'notes',
        'created_by', 'confirmed_by', 'confirmed_at', 'cancelled_at',
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SupplierReturnLine::class);
    }
}
