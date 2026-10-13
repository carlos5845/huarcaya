<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Branch extends Model
{
    protected $fillable = [
        'uuid',
        'company_id',
        'name',
        'code',
        'sunat_establishment_code',
        'address',
        'phone',
        'type',
        'status',
        'department',
        'province',
        'district',
        'invoice_series',
        'boleta_series',
        'ticket_series',
        'credit_note_factura_series',
        'credit_note_boleta_series',
    ];

    /**
     * Cache en memoria de catálogos de Ubigeo INEI.
     *
     * @var array<string, array<string, string>>|null
     */
    protected static ?array $ubigeoCache = null;

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Devuelve el texto legible de ubicación (Distrito, Provincia, Departamento - Perú) para comprobantes impresos.
     */
    public function ubigeoLocationText(): string
    {
        if (self::$ubigeoCache === null) {
            self::$ubigeoCache = [
                'dep' => self::loadUbigeoMap(public_path('data/ubigeo/ubigeo_peru_2016_departamentos.json')),
                'prov' => self::loadUbigeoMap(public_path('data/ubigeo/ubigeo_peru_2016_provincias.json')),
                'dist' => self::loadUbigeoMap(public_path('data/ubigeo/ubigeo_peru_2016_distritos.json')),
            ];
        }

        $dist = $this->district ? (self::$ubigeoCache['dist'][$this->district] ?? $this->district) : null;
        $prov = $this->province ? (self::$ubigeoCache['prov'][$this->province] ?? $this->province) : null;
        $dep = $this->department ? (self::$ubigeoCache['dep'][$this->department] ?? $this->department) : null;

        $parts = array_values(array_unique(array_filter([$dist, $prov, $dep])));

        if (empty($parts)) {
            return 'LIMA - PERÚ';
        }

        return mb_strtoupper(implode(', ', $parts).' - PERÚ');
    }

    /**
     * @return array<string, string>
     */
    protected static function loadUbigeoMap(string $filePath): array
    {
        if (! is_file($filePath)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($filePath), true);
        if (! is_array($decoded)) {
            return [];
        }

        $map = [];
        foreach ($decoded as $item) {
            if (isset($item['id'], $item['name'])) {
                $map[(string) $item['id']] = (string) $item['name'];
            }
        }

        return $map;
    }
}
