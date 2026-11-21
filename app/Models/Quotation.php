<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'company_id',
        'branch_id',
        'customer_id',
        'series',
        'correlative',
        'quotation_number',
        'operation_date',
        'valid_until_date',
        'validity_days',
        'currency_code',
        'exchange_rate',
        'subtotal_amount',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'tax_mode',
        'status',
        'customer_name_snapshot',
        'customer_document_snapshot',
        'customer_address_snapshot',
        'customer_phone_snapshot',
        'customer_email_snapshot',
        'payment_terms',
        'delivery_time',
        'notes',
        'converted_sale_id',
        'converted_at',
        'converted_by',
        'created_by',
    ];

    protected $casts = [
        'operation_date' => 'datetime',
        'valid_until_date' => 'date',
        'validity_days' => 'integer',
        'exchange_rate' => 'decimal:4',
        'subtotal_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'converted_at' => 'datetime',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function convertedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'converted_by');
    }

    public function convertedSale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'converted_sale_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(QuotationLine::class);
    }

    /**
     * Determina la serie predeterminada de cotización para una sucursal.
     * Ejemplo: COT-001, COT-002 según el código de anexo o id de la sucursal.
     */
    public static function defaultSeriesForBranch(Branch|int $branch): string
    {
        $branchId = is_int($branch) ? $branch : $branch->id;
        $branchModel = is_int($branch) ? Branch::find($branchId) : $branch;

        if ($branchModel && ! empty($branchModel->sunat_establishment_code) && ctype_digit($branchModel->sunat_establishment_code)) {
            $num = (int) $branchModel->sunat_establishment_code;

            return sprintf('COT-%03d', $num > 0 ? $num : $branchId);
        }

        return sprintf('COT-%03d', $branchId);
    }

    /**
     * Calcula el siguiente número correlativo formateado (000001) para una serie dada.
     */
    public static function nextCorrelativeForSeries(int $branchId, string $series): string
    {
        $lastQuotation = static::where('branch_id', $branchId)
            ->where('series', $series)
            ->orderByDesc('id')
            ->first();

        if (! $lastQuotation || ! ctype_digit((string) $lastQuotation->correlative)) {
            return '000001';
        }

        $nextNum = ((int) $lastQuotation->correlative) + 1;

        return str_pad((string) $nextNum, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Helper para verificar si está vencida automáticamente.
     */
    public function isExpired(): bool
    {
        if (in_array($this->status, ['CONVERTED', 'REJECTED'])) {
            return false;
        }

        return Carbon::today()->gt(Carbon::parse($this->valid_until_date));
    }
}
