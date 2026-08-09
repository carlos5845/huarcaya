<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserBranch extends Model
{
    protected $fillable = [
        'user_id', 'branch_id', 'is_default', 'status',
        'assigned_by', 'assigned_at',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'assigned_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
