<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'user_id', 'event_type', 'entity_type', 'entity_uuid',
        'old_values', 'new_values', 'ip_address', 'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];
}
