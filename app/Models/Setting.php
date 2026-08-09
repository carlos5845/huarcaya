<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key', 'description', 'type', 'default_value', 'is_public',
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];
}
