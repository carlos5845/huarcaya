<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KitComponent extends Model
{
    protected $fillable = [
        'uuid', 'kit_version_id', 'product_id', 'quantity', 'is_critical',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6',
            'is_critical' => 'boolean',
        ];
    }

    public function kitVersion(): BelongsTo
    {
        return $this->belongsTo(KitVersion::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
