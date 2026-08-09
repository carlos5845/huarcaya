<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SettingValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id', 'branch_id', 'setting_id', 'value',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function setting(): BelongsTo
    {
        return $this->belongsTo(Setting::class);
    }
}
