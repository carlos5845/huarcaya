<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KitVersion extends Model
{
    protected $fillable = [
        'uuid', 'product_id', 'version_name', 'description',
        'status', 'created_by',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function components(): HasMany
    {
        return $this->hasMany(KitComponent::class);
    }

    public function assemblyOrders(): HasMany
    {
        return $this->hasMany(AssemblyOrder::class);
    }
}
