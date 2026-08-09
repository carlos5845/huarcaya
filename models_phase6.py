import os
import glob
import re

models_dir = r"d:\inversiones\huarcaya\app\Models"

models = {
    "CashRegister.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashRegister extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'name', 'status', 'is_active', 'notes'
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(CashMovement::class);
    }
}
""",
    "CashMovement.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'cash_register_id', 'movement_type', 'amount', 'currency_code',
        'operation_date', 'reference_type', 'reference_id', 'notes', 'created_by'
    ];

    protected $casts = [
        'amount' => 'decimal:6',
        'operation_date' => 'datetime',
    ];

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }
}
""",
    "DailyClosing.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DailyClosing extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'branch_id', 'closing_date', 'status', 'opened_at',
        'closed_at', 'opened_by', 'closed_by', 'notes'
    ];

    protected $casts = [
        'closing_date' => 'date',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DailyClosingVersion::class);
    }
}
""",
    "DailyClosingVersion.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DailyClosingVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'daily_closing_id', 'version_number', 'snapshot_data',
        'total_expected', 'total_counted', 'total_difference',
        'created_by', 'notes'
    ];

    protected $casts = [
        'snapshot_data' => 'array',
        'total_expected' => 'decimal:6',
        'total_counted' => 'decimal:6',
        'total_difference' => 'decimal:6',
    ];

    public function dailyClosing(): BelongsTo
    {
        return $this->belongsTo(DailyClosing::class);
    }

    public function cashCounts(): HasMany
    {
        return $this->hasMany(DailyClosingCashCount::class);
    }
}
""",
    "DailyClosingCashCount.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyClosingCashCount extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'daily_closing_version_id', 'payment_method_id',
        'expected_amount', 'counted_amount', 'difference_amount', 'notes'
    ];

    protected $casts = [
        'expected_amount' => 'decimal:6',
        'counted_amount' => 'decimal:6',
        'difference_amount' => 'decimal:6',
    ];

    public function version(): BelongsTo
    {
        return $this->belongsTo(DailyClosingVersion::class, 'daily_closing_version_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }
}
""",
    "SyncOperation.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncOperation extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'device_id', 'user_id', 'entity_type', 'entity_uuid',
        'operation_type', 'payload', 'status', 'retry_count',
        'error_message', 'client_timestamp', 'processed_at'
    ];

    protected $casts = [
        'payload' => 'array',
        'client_timestamp' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
""",
    "SyncOperationDependency.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncOperationDependency extends Model
{
    use HasFactory;

    protected $fillable = [
        'sync_operation_id', 'depends_on_operation_id'
    ];

    public function syncOperation(): BelongsTo
    {
        return $this->belongsTo(SyncOperation::class, 'sync_operation_id');
    }

    public function dependency(): BelongsTo
    {
        return $this->belongsTo(SyncOperation::class, 'depends_on_operation_id');
    }
}
""",
    "Conflict.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Conflict extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'entity_type', 'entity_uuid', 'conflict_type',
        'server_state', 'client_state', 'status', 'sync_operation_id',
        'resolution_notes', 'resolved_by', 'resolved_at'
    ];

    protected $casts = [
        'server_state' => 'array',
        'client_state' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function syncOperation(): BelongsTo
    {
        return $this->belongsTo(SyncOperation::class);
    }
}
""",
    "SyncChangeLog.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SyncChangeLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'entity_type', 'entity_uuid', 'operation_type', 'change_timestamp'
    ];

    protected $casts = [
        'change_timestamp' => 'datetime',
    ];
}
""",
    "ReasonCode.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReasonCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'company_id', 'module', 'code', 'description', 'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
""",
    "Approval.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Approval extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'entity_type', 'entity_id', 'approval_type', 'status',
        'requested_by', 'resolved_by', 'notes', 'resolved_at'
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];
}
""",
    "Alert.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'company_id', 'branch_id', 'alert_type', 'severity',
        'title', 'message', 'context_data', 'is_read', 'read_by', 'read_at'
    ];

    protected $casts = [
        'context_data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
""",
    "DocumentSequence.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentSequence extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id', 'branch_id', 'document_type', 'prefix',
        'current_number', 'padding'
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
""",
    "Attachment.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'attachable_type', 'attachable_id', 'file_path',
        'file_name', 'mime_type', 'file_size', 'uploaded_by'
    ];
}
""",
    "Setting.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key', 'description', 'type', 'default_value', 'is_public'
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];
}
""",
    "SettingValue.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SettingValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id', 'branch_id', 'setting_id', 'value'
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function setting(): BelongsTo
    {
        return $this->belongsTo(Setting::class);
    }
}
""",
    "AuditEvent.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'user_id', 'event_type', 'entity_type', 'entity_uuid',
        'old_values', 'new_values', 'ip_address', 'user_agent'
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];
}
""",
    "ImportBatch.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ImportBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'company_id', 'entity_type', 'status',
        'total_rows', 'processed_rows', 'failed_rows', 'file_path', 'created_by'
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function rows(): HasMany
    {
        return $this->hasMany(ImportBatchRow::class);
    }
}
""",
    "ImportBatchRow.php": r"""<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportBatchRow extends Model
{
    use HasFactory;

    protected $fillable = [
        'import_batch_id', 'row_number', 'raw_data', 'status', 'error_message'
    ];

    protected $casts = [
        'raw_data' => 'array',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class, 'import_batch_id');
    }
}
"""
}

for filename, content in models.items():
    file_path = os.path.join(models_dir, filename)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {filename}")
