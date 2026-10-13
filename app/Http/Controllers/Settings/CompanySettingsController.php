<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Setting;
use App\Models\SettingValue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CompanySettingsController extends Controller
{
    /**
     * Display the company settings configuration screen.
     */
    public function edit(Request $request): Response
    {
        $companyId = $request->user()->company_id;
        $company = Company::find($companyId) ?? Company::first();

        $exchangeRateSetting = Setting::where('key', 'exchange_rate')->first();
        $exchangeRateValue = null;

        if ($exchangeRateSetting && $company) {
            $val = SettingValue::where('company_id', $company->id)
                ->where('setting_id', $exchangeRateSetting->id)
                ->first();
            $exchangeRateValue = $val ? $val->value : $exchangeRateSetting->default_value;
        }

        return Inertia::render('company/index', [
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'business_name' => $company->business_name ?: $company->name,
                'trade_name' => $company->trade_name ?? 'SIMAQ',
                'document_number' => $company->document_number ?? '',
                'economic_activity' => $company->economic_activity ?? 'VENTA DE REPUESTOS AUTOMOTRICES & MAQUINARIA PESADA',
                'address' => $company->address ?? '',
                'ubigeo' => $company->ubigeo ?? '150101',
                'phone' => $company->phone ?? '',
                'email' => $company->email ?? '',
                'logo_url' => $company->logoUrl(),
                'has_custom_logo' => ! empty($company->logo_path),
                'sunat_environment' => $company->sunat_environment ?: 'BETA',
                'sunat_sol_user' => $company->sunat_sol_user ?? '',
                'has_sol_password' => ! empty($company->sunat_sol_password),
            ] : null,
            'exchange_rate' => $exchangeRateValue ?? '3.80',
        ]);
    }

    /**
     * Update the company settings and fiscal parameters.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'business_name' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'document_number' => ['required', 'string', 'regex:/^\d{11}$/'],
            'economic_activity' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'ubigeo' => ['nullable', 'string', 'max:6'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp,svg', 'max:2048'],
            'sunat_environment' => ['nullable', 'string', 'in:BETA,PRODUCTION'],
            'sunat_sol_user' => ['nullable', 'string', 'max:100'],
            'sunat_sol_password' => ['nullable', 'string', 'max:255'],
            'exchange_rate' => ['required', 'numeric', 'min:0.01'],
        ], [
            'document_number.regex' => 'El número de RUC de la empresa debe tener exactamente 11 dígitos numéricos.',
        ]);

        $companyId = $request->user()->company_id;
        $company = Company::find($companyId) ?? Company::first();

        if ($company) {
            $updateData = [
                'name' => $validated['trade_name'] ?: $validated['business_name'],
                'business_name' => $validated['business_name'],
                'trade_name' => $validated['trade_name'] ?? null,
                'document_type' => 'RUC',
                'document_number' => $validated['document_number'],
                'economic_activity' => $validated['economic_activity'] ?? null,
                'address' => $validated['address'] ?? null,
                'ubigeo' => $validated['ubigeo'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
            ];

            if (! empty($validated['sunat_environment'])) {
                $updateData['sunat_environment'] = $validated['sunat_environment'];
            }
            if (array_key_exists('sunat_sol_user', $validated) && $validated['sunat_sol_user'] !== null) {
                $updateData['sunat_sol_user'] = $validated['sunat_sol_user'];
            }

            if (! empty($validated['sunat_sol_password'])) {
                $updateData['sunat_sol_password'] = $validated['sunat_sol_password'];
            }

            if ($request->hasFile('logo')) {
                if (! empty($company->logo_path)) {
                    Storage::disk('public')->delete($company->logo_path);
                }
                $updateData['logo_path'] = $request->file('logo')->store('company-logos', 'public');
            }

            $company->update($updateData);
        }

        $exchangeRateSetting = Setting::where('key', 'exchange_rate')->first();

        if ($exchangeRateSetting && $company) {
            SettingValue::updateOrCreate(
                ['company_id' => $company->id, 'setting_id' => $exchangeRateSetting->id, 'branch_id' => null],
                ['value' => $validated['exchange_rate']]
            );
        }

        return back()->with('success', 'Datos fiscales y configuración de la empresa actualizados.');
    }
}
