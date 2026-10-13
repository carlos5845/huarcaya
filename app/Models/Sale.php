<?php

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
        'sale_number', 'sale_type', 'payment_type', 'payment_status', 'payment_method_id', 'operation_date', 'currency_code',
        'exchange_rate', 'subtotal_amount', 'discount_amount', 'tax_amount',
        'total_amount', 'initial_payment_amount', 'credit_amount', 'due_date',
        'status', 'external_document_type', 'external_document_series',
        'external_document_number', 'customer_name_snapshot',
        'customer_document_snapshot', 'notes', 'created_by', 'confirmed_by',
        'approved_by', 'device_id', 'created_offline', 'confirmed_at',
        'cancelled_at', 'cancelled_by', 'cancellation_reason_id',
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
        'due_date' => 'date:Y-m-d',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }

    public function receivable()
    {
        return $this->hasOne(Receivable::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function customerReturns(): HasMany
    {
        return $this->hasMany(CustomerReturn::class);
    }

    /**
     * Devuelve la serie estándar SUNAT de 4 caracteres según el tipo de comprobante y la sucursal emisora.
     */
    public static function defaultSunatSeries(?string $saleType, ?Branch $branch = null): string
    {
        return match (strtoupper((string) $saleType)) {
            'FACTURA' => strtoupper($branch?->invoice_series ?: 'F001'),
            'BOLETA' => strtoupper($branch?->boleta_series ?: 'B001'),
            default => strtoupper($branch?->ticket_series ?: 'NV01'),
        };
    }

    /**
     * Genera el siguiente correlativo secuencial de 8 dígitos para la sucursal y serie.
     */
    public static function nextCorrelativeForSeries(int $branchId, string $series): string
    {
        $count = self::where('branch_id', $branchId)
            ->where('external_document_series', $series)
            ->count();

        return str_pad((string) ($count + 1), 8, '0', STR_PAD_LEFT);
    }

    /**
     * Devuelve la numeración fiscal normalizada [Serie 4 chars]-[Correlativo 8 dígitos] (ej. B001-00000123).
     */
    public function formattedFiscalNumber(): string
    {
        $branch = $this->relationLoaded('branch') ? $this->branch : null;

        $series = ! empty($this->external_document_series)
            ? strtoupper($this->external_document_series)
            : self::defaultSunatSeries($this->external_document_type ?: $this->sale_type, $branch);

        $rawNumber = $this->external_document_number;
        if (! empty($rawNumber) && ctype_digit((string) $rawNumber)) {
            $number = str_pad((string) $rawNumber, 8, '0', STR_PAD_LEFT);
        } elseif (! empty($rawNumber)) {
            $number = $rawNumber;
        } else {
            $number = str_pad((string) ($this->id ?: 1), 8, '0', STR_PAD_LEFT);
        }

        return "{$series}-{$number}";
    }

    /**
     * Normaliza el código de unidad de medida según el Catálogo 03 de SUNAT (UBL 2.1).
     */
    public static function sunatUnitCode(?string $code): string
    {
        $normalized = strtoupper(trim((string) $code));

        if ($normalized === '' || in_array($normalized, ['UND', 'UNI', 'UNID', 'UNIDAD', 'UNIDADES', 'PZA', 'PIEZA'], true)) {
            return 'NIU';
        }

        if (in_array($normalized, ['SRV', 'SERV', 'SERVICIO', 'SERVICIOS'], true)) {
            return 'ZZ';
        }

        return $normalized;
    }
}
