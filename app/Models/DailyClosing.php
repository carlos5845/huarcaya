<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DailyClosing extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'closing_date', 'status', 'opened_at',
        'closed_at', 'opened_by', 'closed_by', 'notes',
    ];

    protected $casts = [
        'closing_date' => 'date',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DailyClosingVersion::class);
    }
}
