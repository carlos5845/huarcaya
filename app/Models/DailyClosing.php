<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class DailyClosing extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'closing_date', 'status', 'opened_at',
        'closed_at', 'opened_by', 'closed_by', 'notes',
    ];

    protected $casts = [
        'closing_date' => 'date:Y-m-d',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function openedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DailyClosingVersion::class)->orderBy('version_number', 'asc');
    }

    public function latestVersion(): HasOne
    {
        return $this->hasOne(DailyClosingVersion::class)->latestOfMany('version_number');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function getTotalSalesAttribute(): float
    {
        return (float) ($this->latestVersion?->total_expected ?? 0);
    }

    public function getCountedCashAttribute(): float
    {
        return (float) ($this->latestVersion?->total_counted ?? 0);
    }

    public function getDifferenceAttribute(): float
    {
        return (float) ($this->latestVersion?->total_difference ?? 0);
    }

    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeForDate($query, $date)
    {
        return $query->whereDate('closing_date', $date);
    }
}
