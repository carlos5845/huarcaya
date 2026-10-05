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

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['PENDING', 'UNRESOLVED']);
    }

    public function scopeResolved($query)
    {
        return $query->whereIn('status', ['RESOLVED', 'RESOLVED_FORCE']);
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'REJECTED');
    }

    /**
     * Resolves the branch associated with this conflict's operation payload.
     */
    public function getBranchAttribute(): ?Branch
    {
        $branchId = $this->client_state['branch_id']
            ?? $this->syncOperation?->payload['branch_id']
            ?? null;

        if ($branchId) {
            return Branch::find($branchId);
        }

        return $this->syncOperation?->device?->branch;
    }

    /**
     * Resolves the user who created the offline operation.
     */
    public function getOriginUserAttribute(): ?User
    {
        return $this->syncOperation?->user;
    }
}
