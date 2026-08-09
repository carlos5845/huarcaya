<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $fillable = [
        'uuid', 'name', 'business_name', 'document_type',
        'document_number', 'address', 'phone', 'email', 'status',
    ];

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }
}
