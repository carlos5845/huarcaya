<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SyncChangeLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'entity_type', 'entity_uuid', 'operation_type', 'change_timestamp',
    ];

    protected $casts = [
        'change_timestamp' => 'datetime',
    ];
}
