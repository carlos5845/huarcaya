<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Conflict extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'entity_type', 'entity_uuid', 'conflict_type',
        'server_state', 'client_state', 'status', 'sync_operation_id',
        'resolution_notes', 'resolved_by', 'resolved_at',
    ];

    protected $casts = [
        'server_state' => 'array',
        'client_state' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function syncOperation(): BelongsTo
    {
        return $this->belongsTo(SyncOperation::class);
    }
}
