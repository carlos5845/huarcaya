import os
import glob
import re

models_dir = r"d:\inversiones\huarcaya\app\Models"

models = {
    "Sale.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'company_id', 'branch_id', 'customer_id',
        'sale_number', 'sale_type', 'operation_date', 'currency_code',
        'exchange_rate', 'subtotal_amount', 'discount_amount', 'tax_amount',
        'total_amount', 'initial_payment_amount', 'credit_amount', 'due_date',
        'status', 'external_document_type', 'external_document_series',
        'external_document_number', 'customer_name_snapshot',
        'customer_document_snapshot', 'notes', 'created_by', 'confirmed_by',
        'approved_by', 'device_id', 'created_offline', 'confirmed_at',
        'cancelled_at', 'cancelled_by', 'cancellation_reason_id'
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'exchange_rate' => 'decimal:6',
        'subtotal_amount' => 'decimal:6',
        'discount_amount' => 'decimal:6',
        'tax_amount' => 'decimal:6',
        'total_amount' => 'decimal:6',
        'initial_payment_amount' => 'decimal:6',
        'credit_amount' => 'decimal:6',
        'due_date' => 'date',
        'created_offline' => 'boolean',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SaleLine::class);
    }
}
""",
    "SaleLine.php": r"""<?php

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
        'line_subtotal', 'discount_amount', 'tax_amount', 'line_total', 'notes'
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
""",
    "CustomerReturn.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'customer_id', 'sale_id', 'return_number',
        'operation_date', 'return_type', 'currency_code', 'exchange_rate',
        'subtotal_amount', 'tax_amount', 'total_amount', 'status', 'notes',
        'created_by', 'confirmed_by', 'confirmed_at', 'cancelled_at'
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'exchange_rate' => 'decimal:6',
        'subtotal_amount' => 'decimal:6',
        'tax_amount' => 'decimal:6',
        'total_amount' => 'decimal:6',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(CustomerReturnLine::class);
    }
}
""",
    "CustomerReturnLine.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerReturnLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'customer_return_id', 'sale_line_id', 'product_id',
        'quantity', 'unit_price', 'line_total', 'condition', 'notes'
    ];

    protected $casts = [
        'quantity' => 'decimal:6',
        'unit_price' => 'decimal:6',
        'line_total' => 'decimal:6',
    ];

    public function customerReturn(): BelongsTo
    {
        return $this->belongsTo(CustomerReturn::class);
    }

    public function saleLine(): BelongsTo
    {
        return $this->belongsTo(SaleLine::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
""",
    "Receivable.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Receivable extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'customer_id', 'sale_id', 'reference_type',
        'reference_id', 'issue_date', 'due_date', 'currency_code',
        'original_amount', 'balance_amount', 'status', 'notes', 'created_by'
    ];

    protected $casts = [
        'issue_date' => 'datetime',
        'due_date' => 'date',
        'original_amount' => 'decimal:6',
        'balance_amount' => 'decimal:6',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }
}
""",
    "PaymentMethod.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'company_id', 'code', 'name', 'is_cash', 'is_active'
    ];

    protected $casts = [
        'is_cash' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
""",
    "Payment.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'customer_id', 'payment_number', 'operation_date',
        'currency_code', 'exchange_rate', 'total_amount', 'status', 'notes',
        'created_by', 'cancelled_at'
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'exchange_rate' => 'decimal:6',
        'total_amount' => 'decimal:6',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function methodLines(): HasMany
    {
        return $this->hasMany(PaymentMethodLine::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }
}
""",
    "PaymentMethodLine.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentMethodLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'payment_id', 'payment_method_id', 'amount',
        'reference_number', 'notes'
    ];

    protected $casts = [
        'amount' => 'decimal:6',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }
}
""",
    "PaymentAllocation.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'payment_id', 'receivable_id', 'allocated_amount'
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:6',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function receivable(): BelongsTo
    {
        return $this->belongsTo(Receivable::class);
    }
}
""",
    "Refund.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Refund extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'customer_id', 'customer_return_id',
        'refund_number', 'operation_date', 'currency_code', 'exchange_rate',
        'total_amount', 'status', 'notes', 'created_by', 'cancelled_at'
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'exchange_rate' => 'decimal:6',
        'total_amount' => 'decimal:6',
        'cancelled_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function customerReturn(): BelongsTo
    {
        return $this->belongsTo(CustomerReturn::class);
    }

    public function methodLines(): HasMany
    {
        return $this->hasMany(RefundMethodLine::class);
    }
}
""",
    "RefundMethodLine.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefundMethodLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'refund_id', 'payment_method_id', 'amount',
        'reference_number', 'notes'
    ];

    protected $casts = [
        'amount' => 'decimal:6',
    ];

    public function refund(): BelongsTo
    {
        return $this->belongsTo(Refund::class);
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }
}
"""
}

for filename, content in models.items():
    file_path = os.path.join(models_dir, filename)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {filename}")
