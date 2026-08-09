<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'uuid', 'company_id', 'internal_code', 'primary_reference',
        'normalized_reference', 'name', 'normalized_name', 'description',
        'brand_id', 'category_id', 'unit_id', 'product_type', 'status',
        'requires_lot_tracking', 'fifo_enabled', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'requires_lot_tracking' => 'boolean',
            'fifo_enabled' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function aliases(): HasMany
    {
        return $this->hasMany(ProductAlias::class);
    }

    public function prices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
    }

    public function minPrices(): HasMany
    {
        return $this->hasMany(ProductMinPrice::class);
    }

    public function minStocks(): HasMany
    {
        return $this->hasMany(ProductMinStock::class);
    }

    public function kitVersions(): HasMany
    {
        return $this->hasMany(KitVersion::class);
    }
}
