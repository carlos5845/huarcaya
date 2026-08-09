import os
import glob

models_dir = r'd:\inversiones\huarcaya\app\Models'

models = {
    'Supplier': '''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory;

    protected \ = [
        'uuid', 'company_id', 'document_type', 'document_number',
        'legal_name', 'trade_name', 'phone', 'email', 'address',
        'contact_name', 'notes', 'status', 'created_by'
    ];

    public function company(): BelongsTo
    {
        return \->belongsTo(Company::class);
    }

    public function creator(): BelongsTo
    {
        return \->belongsTo(User::class, 'created_by');
    }

    public function purchases(): HasMany
    {
        return \->hasMany(Purchase::class);
    }
}
''',
    'Customer': '''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Customer extends Model
{
    use HasFactory;

    protected \ = [
        'uuid', 'company_id', 'document_type', 'document_number',
        'legal_name', 'trade_name', 'phone', 'email', 'address',
        'status', 'created_by'
    ];

    public function company(): BelongsTo
    {
        return \->belongsTo(Company::class);
    }

    public function creator(): BelongsTo
    {
        return \->belongsTo(User::class, 'created_by');
    }
}
''',
    'Purchase': '''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Purchase extends Model
{
    use HasFactory;

    protected \ = [
        'uuid', 'company_id', 'branch_id', 'supplier_id',
        'purchase_number', 'supplier_document_type', 'supplier_document_series',
        'supplier_document_number', 'document_date', 'currency_code',
        'exchange_rate', 'subtotal_amount', 'tax_amount', 'total_amount',
        'status', 'notes', 'created_by', 'approved_by', 'confirmed_at', 'cancelled_at'
    ];

    protected function casts(): array
    {
        return [
            'document_date' => 'date',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'subtotal_amount' => 'decimal:6',
            'tax_amount' => 'decimal:6',
            'total_amount' => 'decimal:6',
            'exchange_rate' => 'decimal:6',
        ];
    }

    public function company(): BelongsTo
    {
        return \->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return \->belongsTo(Branch::class);
    }

    public function supplier(): BelongsTo
    {
        return \->belongsTo(Supplier::class);
    }

    public function lines(): HasMany
    {
        return \->hasMany(PurchaseLine::class);
    }

    public function inventoryEntries(): HasMany
    {
        return \->hasMany(InventoryEntry::class);
    }
}
''',
    'PurchaseLine': '''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseLine extends Model
{
    use HasFactory;

    protected \ = [
        'uuid', 'purchase_id', 'product_id', 'ordered_quantity',
        'unit_cost_original', 'unit_cost_base', 'line_subtotal',
        'tax_amount', 'line_total', 'received_quantity', 'cancelled_quantity', 'notes'
    ];

    protected function casts(): array
    {
        return [
            'ordered_quantity' => 'decimal:6',
            'unit_cost_original' => 'decimal:6',
            'unit_cost_base' => 'decimal:6',
            'line_subtotal' => 'decimal:6',
            'tax_amount' => 'decimal:6',
            'line_total' => 'decimal:6',
            'received_quantity' => 'decimal:6',
            'cancelled_quantity' => 'decimal:6',
        ];
    }

    public function purchase(): BelongsTo
    {
        return \->belongsTo(Purchase::class);
    }

    public function product(): BelongsTo
    {
        return \->belongsTo(Product::class);
    }

    public function inventoryEntryLines(): HasMany
    {
        return \->hasMany(InventoryEntryLine::class);
    }
}
''',
    'InventoryEntry': '''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryEntry extends Model
{
    use HasFactory;

    protected \ = [
        'uuid', 'branch_id', 'entry_number', 'entry_type', 'operation_date',
        'purchase_id', 'supplier_id', 'source_type', 'source_id',
        'external_document_type', 'external_document_number', 'currency_code',
        'exchange_rate', 'status', 'notes', 'created_by', 'confirmed_by',
        'device_id', 'created_offline', 'confirmed_at', 'cancelled_at'
    ];

    protected function casts(): array
    {
        return [
            'operation_date' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'exchange_rate' => 'decimal:6',
            'created_offline' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return \->belongsTo(Branch::class);
    }

    public function purchase(): BelongsTo
    {
        return \->belongsTo(Purchase::class);
    }

    public function supplier(): BelongsTo
    {
        return \->belongsTo(Supplier::class);
    }

    public function lines(): HasMany
    {
        return \->hasMany(InventoryEntryLine::class);
    }
}
''',
    'InventoryEntryLine': '''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryEntryLine extends Model
{
    use HasFactory;

    protected \ = [
        'uuid', 'inventory_entry_id', 'purchase_line_id', 'product_id',
        'quantity', 'unit_cost_original', 'unit_cost_base', 'total_cost_base',
        'condition', 'notes'
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6',
            'unit_cost_original' => 'decimal:6',
            'unit_cost_base' => 'decimal:6',
            'total_cost_base' => 'decimal:6',
        ];
    }

    public function inventoryEntry(): BelongsTo
    {
        return \->belongsTo(InventoryEntry::class);
    }

    public function purchaseLine(): BelongsTo
    {
        return \->belongsTo(PurchaseLine::class);
    }

    public function product(): BelongsTo
    {
        return \->belongsTo(Product::class);
    }
}
''',
    'Inventory': '''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    use HasFactory;

    protected \ = [
        'uuid', 'branch_id', 'product_id', 'warehouse_location_id',
        'physical_quantity', 'available_quantity', 'average_cost',
        'status', 'last_counted_at'
    ];

    protected function casts(): array
    {
        return [
            'physical_quantity' => 'decimal:6',
            'available_quantity' => 'decimal:6',
            'average_cost' => 'decimal:6',
            'last_counted_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return \->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return \->belongsTo(Product::class);
    }

    public function location(): BelongsTo
    {
        return \->belongsTo(WarehouseLocation::class, 'warehouse_location_id');
    }
}
''',
    'Lot': '''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lot extends Model
{
    use HasFactory;

    protected \ = [
        'uuid', 'branch_id', 'product_id', 'lot_number',
        'inventory_entry_line_id', 'manufacturing_date', 'expiration_date',
        'original_quantity', 'current_quantity', 'unit_cost', 'status'
    ];

    protected function casts(): array
    {
        return [
            'manufacturing_date' => 'date',
            'expiration_date' => 'date',
            'original_quantity' => 'decimal:6',
            'current_quantity' => 'decimal:6',
            'unit_cost' => 'decimal:6',
        ];
    }

    public function branch(): BelongsTo
    {
        return \->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return \->belongsTo(Product::class);
    }

    public function inventoryEntryLine(): BelongsTo
    {
        return \->belongsTo(InventoryEntryLine::class);
    }

    public function allocations(): HasMany
    {
        return \->hasMany(LotAllocation::class);
    }
}
'''
}

for model_name, content in models.items():
    file_path = os.path.join(models_dir, f"{model_name}.php")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {model_name}")

