<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BrandController extends Controller
{
    public function index()
    {
        $brands = Brand::orderBy('name')->get();

        return Inertia::render('catalog/brands/index', [
            'brands' => $brands,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50', 'unique:brands,code'],
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $companyId = Auth::user()->company_id;
        $normalizedName = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $validated['name']));

        if (Brand::where('company_id', $companyId)->where('normalized_name', $normalizedName)->exists()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'name' => 'Ya existe una marca con este nombre.',
            ]);
        }

        Brand::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'normalized_name' => $normalizedName,
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Marca registrada exitosamente.');
    }

    public function update(Request $request, Brand $brand)
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50', Rule::unique('brands')->ignore($brand->id)],
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $normalizedName = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $validated['name']));

        if (Brand::where('company_id', $brand->company_id)
            ->where('normalized_name', $normalizedName)
            ->where('id', '!=', $brand->id)
            ->exists()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'name' => 'Ya existe otra marca con este nombre.',
            ]);
        }

        $brand->update([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'normalized_name' => $normalizedName,
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Marca actualizada exitosamente.');
    }

    public function destroy(Brand $brand)
    {
        $brand->update([
            'status' => $brand->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        ]);

        return back()->with('success', 'Estado de la marca modificado exitosamente.');
    }
}
