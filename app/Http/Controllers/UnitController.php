<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UnitController extends Controller
{
    public function index()
    {
        $companyId = Auth::user()->company_id;
        $units = Unit::where('company_id', $companyId)->orderBy('name')->get();

        return Inertia::render('catalog/units/index', [
            'units' => $units,
        ]);
    }

    public function store(Request $request)
    {
        $companyId = Auth::user()->company_id;

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:10',
                Rule::unique('units', 'code')->where('company_id', $companyId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $normalizedName = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $validated['name']));

        if (Unit::where('company_id', $companyId)->whereRaw("UPPER(REPLACE(name, ' ', '')) = ?", [$normalizedName])->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Ya existe una unidad con este nombre.',
            ]);
        }

        Unit::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Unidad de medida registrada exitosamente.');
    }

    public function update(Request $request, Unit $unit)
    {
        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:10',
                Rule::unique('units', 'code')->where('company_id', $unit->company_id)->ignore($unit->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $normalizedName = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $validated['name']));

        if (Unit::where('company_id', $unit->company_id)
            ->whereRaw("UPPER(REPLACE(name, ' ', '')) = ?", [$normalizedName])
            ->where('id', '!=', $unit->id)
            ->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Ya existe otra unidad con este nombre.',
            ]);
        }

        $unit->update([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Unidad actualizada exitosamente.');
    }

    public function destroy(Unit $unit)
    {
        $unit->update([
            'status' => $unit->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        ]);

        return back()->with('success', 'Estado de la unidad modificado exitosamente.');
    }
}
