<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'movement_type', 'reference_type',
        'reference_id', 'operation_date', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'operation_date' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InventoryMovementLine::class);
    }
}
