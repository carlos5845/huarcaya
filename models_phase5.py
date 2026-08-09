import os
import glob
import re

models_dir = r"d:\inversiones\huarcaya\app\Models"

models = {
    "InventoryExit.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryExit extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'exit_number', 'operation_date', 'exit_type',
        'status', 'notes', 'created_by', 'confirmed_by', 'approved_by',
        'confirmed_at', 'cancelled_at'
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InventoryExitLine::class);
    }
}
""",
    "InventoryExitLine.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryExitLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_exit_id', 'product_id', 'quantity',
        'unit_cost', 'line_total_cost', 'notes'
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
        'unit_cost' => 'decimal:6',
        'line_total_cost' => 'decimal:6',
    ];

    public function inventoryExit(): BelongsTo
    {
        return $this->belongsTo(InventoryExit::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
""",
    "SupplierReturn.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'supplier_id', 'purchase_id', 'return_number',
        'operation_date', 'return_type', 'status', 'notes',
        'created_by', 'confirmed_by', 'confirmed_at', 'cancelled_at'
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SupplierReturnLine::class);
    }
}
""",
    "SupplierReturnLine.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierReturnLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'supplier_return_id', 'purchase_line_id', 'product_id',
        'quantity', 'unit_cost', 'line_total_cost', 'condition', 'notes'
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
        'unit_cost' => 'decimal:6',
        'line_total_cost' => 'decimal:6',
    ];

    public function supplierReturn(): BelongsTo
    {
        return $this->belongsTo(SupplierReturn::class);
    }

    public function purchaseLine(): BelongsTo
    {
        return $this->belongsTo(PurchaseLine::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
""",
    "InventoryCount.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryCount extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'count_number', 'count_type',
        'scheduled_date', 'start_date', 'end_date', 'status', 'notes',
        'created_by', 'confirmed_by', 'confirmed_at', 'cancelled_at'
    ];

    protected $casts = [
        'scheduled_date' => 'datetime',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InventoryCountLine::class);
    }
}
""",
    "InventoryCountLine.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryCountLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_count_id', 'product_id',
        'system_quantity', 'counted_quantity', 'difference_quantity', 'notes'
    ];

    protected $casts = [
        'system_quantity' => 'decimal:6',
        'counted_quantity' => 'decimal:6',
        'difference_quantity' => 'decimal:6',
    ];

    public function inventoryCount(): BelongsTo
    {
        return $this->belongsTo(InventoryCount::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(InventoryCountAttempt::class);
    }
}
""",
    "InventoryCountAttempt.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryCountAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_count_id', 'inventory_count_line_id',
        'attempt_number', 'counted_quantity', 'counted_by', 'counted_at'
    ];

    protected $casts = [
        'counted_quantity' => 'decimal:6',
        'counted_at' => 'datetime',
    ];

    public function inventoryCount(): BelongsTo
    {
        return $this->belongsTo(InventoryCount::class);
    }

    public function line(): BelongsTo
    {
        return $this->belongsTo(InventoryCountLine::class, 'inventory_count_line_id');
    }
}
""",
    "InventoryAdjustment.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'inventory_count_id', 'adjustment_number',
        'operation_date', 'adjustment_type', 'status', 'notes',
        'created_by', 'confirmed_by', 'approved_by', 'confirmed_at', 'cancelled_at'
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function inventoryCount(): BelongsTo
    {
        return $this->belongsTo(InventoryCount::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InventoryAdjustmentLine::class);
    }
}
""",
    "InventoryAdjustmentLine.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryAdjustmentLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'inventory_adjustment_id', 'product_id',
        'quantity', 'unit_cost', 'line_total_cost', 'reason_code', 'notes'
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
        'unit_cost' => 'decimal:6',
        'line_total_cost' => 'decimal:6',
    ];

    public function inventoryAdjustment(): BelongsTo
    {
        return $this->belongsTo(InventoryAdjustment::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
""",
    "Transfer.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'company_id', 'source_branch_id', 'destination_branch_id',
        'transfer_number', 'request_date', 'status', 'notes',
        'created_by', 'confirmed_by', 'confirmed_at', 'cancelled_at'
    ];

    protected $casts = [
        'request_date' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function sourceBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'source_branch_id');
    }

    public function destinationBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'destination_branch_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(TransferLine::class);
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(TransferShipment::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(TransferReceipt::class);
    }
}
""",
    "TransferLine.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_id', 'product_id',
        'requested_quantity', 'shipped_quantity', 'received_quantity', 'notes'
    ];

    protected $casts = [
        'requested_quantity' => 'decimal:6',
        'shipped_quantity' => 'decimal:6',
        'received_quantity' => 'decimal:6',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(Transfer::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
""",
    "TransferShipment.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransferShipment extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_id', 'shipment_number', 'shipment_date',
        'status', 'tracking_number', 'carrier_name', 'notes',
        'shipped_by', 'confirmed_at'
    ];

    protected $casts = [
        'shipment_date' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(Transfer::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(TransferShipmentLine::class);
    }
}
""",
    "TransferShipmentLine.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferShipmentLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_shipment_id', 'transfer_line_id', 'product_id',
        'quantity', 'notes'
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(TransferShipment::class, 'transfer_shipment_id');
    }

    public function transferLine(): BelongsTo
    {
        return $this->belongsTo(TransferLine::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
""",
    "TransferReceipt.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransferReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_id', 'transfer_shipment_id', 'receipt_number',
        'receipt_date', 'status', 'notes', 'received_by', 'confirmed_at'
    ];

    protected $casts = [
        'receipt_date' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(Transfer::class);
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(TransferShipment::class, 'transfer_shipment_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(TransferReceiptLine::class);
    }
}
""",
    "TransferReceiptLine.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferReceiptLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_receipt_id', 'transfer_shipment_line_id',
        'transfer_line_id', 'product_id', 'quantity', 'condition', 'notes'
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
    ];

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(TransferReceipt::class, 'transfer_receipt_id');
    }

    public function shipmentLine(): BelongsTo
    {
        return $this->belongsTo(TransferShipmentLine::class, 'transfer_shipment_line_id');
    }

    public function transferLine(): BelongsTo
    {
        return $this->belongsTo(TransferLine::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
""",
    "TransferDifference.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferDifference extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'transfer_id', 'transfer_line_id', 'product_id',
        'difference_quantity', 'resolution_status', 'resolution_notes',
        'resolved_by', 'resolved_at'
    ];

    protected $casts = [
        'difference_quantity' => 'decimal:6',
        'resolved_at' => 'datetime',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(Transfer::class);
    }

    public function transferLine(): BelongsTo
    {
        return $this->belongsTo(TransferLine::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
"""
}

for filename, content in models.items():
    file_path = os.path.join(models_dir, filename)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {filename}")
