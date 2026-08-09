<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'company_id', 'branch_id', 'alert_type', 'severity',
        'title', 'message', 'context_data', 'is_read', 'read_by', 'read_at',
    ];

    protected $casts = [
        'context_data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
