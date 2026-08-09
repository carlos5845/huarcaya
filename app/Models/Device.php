<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Device extends Model
{
    protected $fillable = [
        'uuid', 'branch_id', 'name', 'type', 'status',
        'last_seen_at', 'last_synced_at', 'last_pull_sequence',
        'last_push_at', 'last_pull_at', 'app_version', 'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
            'last_synced_at' => 'datetime',
            'last_push_at' => 'datetime',
            'last_pull_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function deviceUsers(): HasMany
    {
        return $this->hasMany(DeviceUser::class);
    }
}
