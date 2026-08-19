<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KardexEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'product_id', 'inventory_movement_line_id',
        'sequence_number', 'user_id', 'device_id',
        'operation_date', 'operation_type', 'reference',
        'input_quantity', 'input_unit_cost', 'input_total_cost',
        'output_quantity', 'output_unit_cost', 'output_total_cost',
        'balance_quantity', 'balance_unit_cost', 'balance_total_cost',
        'original_entry_id', 'reversed_by_entry_id', 'sync_status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'operation_date' => 'datetime',
            'input_quantity' => 'decimal:6',
            'input_unit_cost' => 'decimal:6',
            'input_total_cost' => 'decimal:6',
            'output_quantity' => 'decimal:6',
            'output_unit_cost' => 'decimal:6',
            'output_total_cost' => 'decimal:6',
            'balance_quantity' => 'decimal:6',
            'balance_unit_cost' => 'decimal:6',
            'balance_total_cost' => 'decimal:6',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function movementLine(): BelongsTo
    {
        return $this->belongsTo(InventoryMovementLine::class, 'inventory_movement_line_id');
    }
}
