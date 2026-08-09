<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = [
        'uuid', 'company_id', 'name', 'code', 'address',
        'phone', 'type', 'status',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
