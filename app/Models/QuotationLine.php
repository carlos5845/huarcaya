<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'quotation_id',
        'product_id',
        'product_reference_snapshot',
        'product_name_snapshot',
        'unit_code_snapshot',
        'quantity',
        'unit_price',
        'unit_cost_base',
        'line_subtotal',
        'discount_amount',
        'tax_amount',
        'line_total',
        'is_special_order',
        'current_stock_snapshot',
        'delivery_time_line',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'unit_cost_base' => 'decimal:2',
        'line_subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'line_total' => 'decimal:2',
        'is_special_order' => 'boolean',
        'current_stock_snapshot' => 'decimal:2',
    ];

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
