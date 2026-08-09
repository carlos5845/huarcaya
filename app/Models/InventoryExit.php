<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryExit extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'exit_number', 'operation_date', 'exit_type',
        'status', 'notes', 'created_by', 'confirmed_by', 'approved_by',
        'confirmed_at', 'cancelled_at',
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

    public function lines(): HasMany
    {
        return $this->hasMany(InventoryExitLine::class);
    }
}
