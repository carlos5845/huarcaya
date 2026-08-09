<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'sale_id', 'product_id', 'kit_version_id',
        'product_type_snapshot', 'product_reference_snapshot',
        'product_name_snapshot', 'quantity', 'unit_price', 'unit_cost_base',
        'line_subtotal', 'discount_amount', 'tax_amount', 'line_total', 'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
        'unit_price' => 'decimal:6',
        'unit_cost_base' => 'decimal:6',
        'line_subtotal' => 'decimal:6',
        'discount_amount' => 'decimal:6',
        'tax_amount' => 'decimal:6',
        'line_total' => 'decimal:6',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function kitVersion(): BelongsTo
    {
        return $this->belongsTo(KitVersion::class);
    }
}
