<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Approval extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'entity_type', 'entity_id', 'approval_type', 'status',
        'requested_by', 'resolved_by', 'notes', 'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];
}
