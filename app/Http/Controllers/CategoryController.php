<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::orderBy('name')->get();

        return Inertia::render('catalog/categories/index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50', 'unique:categories,code'],
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:categories,id'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $companyId = Auth::user()->company_id;
        $normalizedName = Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $validated['name']));

        if (Category::where('company_id', $companyId)->where('normalized_name', $normalizedName)->exists()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'name' => 'Ya existe una categoría con este nombre.',
            ]);
        }

        Category::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'parent_id' => $validated['parent_id'] ?? null,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'normalized_name' => $normalizedName,
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Categoría registrada exitosamente.');
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50', Rule::unique('categories')->ignore($category->id)],
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:categories,id'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $category->update([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'parent_id' => $validated['parent_id'] ?? null,
            'normalized_name' => Str::upper(preg_replace('/[^A-Za-z0-9]/', '', $validated['name'])),
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Categoría actualizada exitosamente.');
    }

    public function destroy(Category $category)
    {
        $category->update([
            'status' => $category->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        ]);

        return back()->with('success', 'Estado de la categoría modificado exitosamente.');
    }
}
