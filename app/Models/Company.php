<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Company extends Model
{
    protected $fillable = [
        'uuid',
        'name',
        'business_name',
        'trade_name',
        'document_type',
        'document_number',
        'economic_activity',
        'address',
        'ubigeo',
        'phone',
        'email',
        'logo_path',
        'status',
        'sunat_environment',
        'sunat_sol_user',
        'sunat_sol_password',
    ];

    protected $hidden = [
        'sunat_sol_password',
    ];

    protected function casts(): array
    {
        return [
            'sunat_sol_password' => 'encrypted',
        ];
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    /**
     * Devuelve la URL pública del logotipo corporativo o el logo por defecto.
     */
    public function logoUrl(): string
    {
        if (! empty($this->logo_path)) {
            return Storage::disk('public')->url($this->logo_path);
        }

        return asset('logo-text.png');
    }
}
