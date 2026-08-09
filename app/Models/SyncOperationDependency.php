<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncOperationDependency extends Model
{
    use HasFactory;

    protected $fillable = [
        'sync_operation_id', 'depends_on_operation_id',
    ];

    public function syncOperation(): BelongsTo
    {
        return $this->belongsTo(SyncOperation::class, 'sync_operation_id');
    }

    public function dependency(): BelongsTo
    {
        return $this->belongsTo(SyncOperation::class, 'depends_on_operation_id');
    }
}
