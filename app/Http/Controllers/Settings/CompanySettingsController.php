<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\SettingValue;
use Illuminate\Http\Request;
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

        $exchangeRateSetting = Setting::where('key', 'exchange_rate')->first();
        $exchangeRateValue = null;

        if ($exchangeRateSetting) {
            $val = SettingValue::where('company_id', $companyId)
                ->where('setting_id', $exchangeRateSetting->id)
                ->first();
            $exchangeRateValue = $val ? $val->value : $exchangeRateSetting->default_value;
        }

        return Inertia::render('settings/company', [
            'exchange_rate' => $exchangeRateValue ?? '3.80',
        ]);
    }

    /**
     * Update the company settings.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'exchange_rate' => ['required', 'numeric', 'min:0.01'],
        ]);

        $companyId = $request->user()->company_id;
        $exchangeRateSetting = Setting::where('key', 'exchange_rate')->first();

        if ($exchangeRateSetting) {
            SettingValue::updateOrCreate(
                ['company_id' => $companyId, 'setting_id' => $exchangeRateSetting->id, 'branch_id' => null],
                ['value' => $validated['exchange_rate']]
            );
        }

        return back()->with('success', 'Configuración de la empresa actualizada.');
    }
}
