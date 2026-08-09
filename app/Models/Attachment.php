<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'attachable_type', 'attachable_id', 'file_path',
        'file_name', 'mime_type', 'file_size', 'uploaded_by',
    ];
}
