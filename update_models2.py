import os
import glob

models_dir = r'd:\inversiones\huarcaya\app\Models'

models = {
    'InventoryReservation': r'''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryReservation extends Model
{
    use HasFactory;

    protected  = [
        'uuid', 'branch_id', 'source_type', 'source_id',
        'status', 'expires_at', 'created_by'
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return ->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return ->belongsTo(User::class, 'created_by');
    }

    public function allocations(): HasMany
    {
        return ->hasMany(InventoryReservationAllocation::class);
    }
}
''',
    'InventoryReservationAllocation': r'''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryReservationAllocation extends Model
{
    use HasFactory;

    protected  = [
        'uuid', 'inventory_reservation_id', 'product_id',
        'requested_quantity', 'allocated_quantity', 'status'
    ];

    protected function casts(): array
    {
        return [
            'requested_quantity' => 'decimal:6',
            'allocated_quantity' => 'decimal:6',
        ];
    }

    public function reservation(): BelongsTo
    {
        return ->belongsTo(InventoryReservation::class, 'inventory_reservation_id');
    }

    public function product(): BelongsTo
    {
        return ->belongsTo(Product::class);
    }
}
''',
    'InventoryMovement': r'''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryMovement extends Model
{
    use HasFactory;

    protected  = [
        'uuid', 'branch_id', 'movement_type', 'reference_type',
        'reference_id', 'operation_date', 'notes', 'created_by'
    ];

    protected function casts(): array
    {
        return [
            'operation_date' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return ->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return ->belongsTo(User::class, 'created_by');
    }

    public function lines(): HasMany
    {
        return ->hasMany(InventoryMovementLine::class);
    }
}
''',
    'InventoryMovementLine': r'''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryMovementLine extends Model
{
    use HasFactory;

    protected  = [
        'uuid', 'inventory_movement_id', 'product_id',
        'direction', 'quantity', 'unit_cost', 'total_cost'
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6',
            'unit_cost' => 'decimal:6',
            'total_cost' => 'decimal:6',
        ];
    }

    public function movement(): BelongsTo
    {
        return ->belongsTo(InventoryMovement::class, 'inventory_movement_id');
    }

    public function product(): BelongsTo
    {
        return ->belongsTo(Product::class);
    }

    public function lotAllocations(): HasMany
    {
        return ->hasMany(LotAllocation::class);
    }
}
''',
    'LotAllocation': r'''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LotAllocation extends Model
{
    use HasFactory;

    protected  = [
        'uuid', 'inventory_movement_line_id', 'lot_id', 'quantity'
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6',
        ];
    }

    public function movementLine(): BelongsTo
    {
        return ->belongsTo(InventoryMovementLine::class, 'inventory_movement_line_id');
    }

    public function lot(): BelongsTo
    {
        return ->belongsTo(Lot::class);
    }
}
''',
    'KardexEntry': r'''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KardexEntry extends Model
{
    use HasFactory;

    protected  = [
        'uuid', 'branch_id', 'product_id', 'inventory_movement_line_id',
        'date', 'operation_type', 'reference',
        'input_quantity', 'input_unit_cost', 'input_total_cost',
        'output_quantity', 'output_unit_cost', 'output_total_cost',
        'balance_quantity', 'balance_unit_cost', 'balance_total_cost'
    ];

    protected function casts(): array
    {
        return [
            'date' => 'datetime',
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
        return ->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return ->belongsTo(Product::class);
    }

    public function movementLine(): BelongsTo
    {
        return ->belongsTo(InventoryMovementLine::class, 'inventory_movement_line_id');
    }
}
'''
}

for model_name, content in models.items():
    file_path = os.path.join(models_dir, f"{model_name}.php")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {model_name}")

