<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SyncOperation extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'device_id', 'user_id', 'entity_type', 'entity_uuid',
        'operation_type', 'payload', 'status', 'retry_count',
        'error_message', 'client_timestamp', 'processed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'client_timestamp' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function conflict(): HasOne
    {
        return $this->hasOne(Conflict::class);
    }
}
