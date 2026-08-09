<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryCount extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'count_number', 'count_type',
        'scheduled_date', 'start_date', 'end_date', 'status', 'notes',
        'created_by', 'confirmed_by', 'confirmed_at', 'cancelled_at',
    ];

    protected $casts = [
        'scheduled_date' => 'datetime',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InventoryCountLine::class);
    }
}
