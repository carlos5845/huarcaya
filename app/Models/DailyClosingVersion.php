<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DailyClosingVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'daily_closing_id', 'version_number', 'snapshot_data',
        'total_expected', 'total_counted', 'total_difference',
        'created_by', 'notes',
    ];

    protected $casts = [
        'snapshot_data' => 'array',
        'total_expected' => 'decimal:6',
        'total_counted' => 'decimal:6',
        'total_difference' => 'decimal:6',
    ];

    public function dailyClosing(): BelongsTo
    {
        return $this->belongsTo(DailyClosing::class);
    }

    public function cashCounts(): HasMany
    {
        return $this->hasMany(DailyClosingCashCount::class);
    }
}
