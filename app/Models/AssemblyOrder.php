<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssemblyOrder extends Model
{
    protected $fillable = [
        'uuid', 'branch_id', 'kit_version_id', 'order_number',
        'status', 'expected_quantity', 'actual_quantity',
        'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'expected_quantity' => 'decimal:6',
            'actual_quantity' => 'decimal:6',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function kitVersion(): BelongsTo
    {
        return $this->belongsTo(KitVersion::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function components(): HasMany
    {
        return $this->hasMany(AssemblyOrderComponent::class);
    }
}
