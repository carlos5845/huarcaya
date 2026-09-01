<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index()
    {
        $suppliers = Supplier::where('company_id', Auth::user()->company_id)
            ->orderBy('legal_name')
            ->get();

        return Inertia::render('catalog/suppliers/index', [
            'suppliers' => $suppliers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'document_type' => ['required', 'string', 'max:30'],
            'document_number' => ['required', 'string', 'max:50'],
            'legal_name' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $companyId = Auth::user()->company_id;

        if (isset($validated['document_type']) && isset($validated['document_number']) && $validated['document_type'] && $validated['document_number']) {
            if (Supplier::where('company_id', $companyId)
                ->where('document_type', $validated['document_type'])
                ->where('document_number', $validated['document_number'])
                ->exists()) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'document_number' => 'Ya existe un proveedor con este tipo y número de documento.',
                ]);
            }
        }

        Supplier::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'document_type' => $validated['document_type'] ?? null,
            'document_number' => $validated['document_number'] ?? null,
            'legal_name' => $validated['legal_name'],
            'trade_name' => $validated['trade_name'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'contact_name' => $validated['contact_name'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'] ?? 'ACTIVE',
            'created_by' => Auth::id(),
        ]);

        return back()->with('success', 'Proveedor registrado exitosamente.');
    }

    public function update(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'document_type' => ['required', 'string', 'max:30'],
            'document_number' => ['required', 'string', 'max:50'],
            'legal_name' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        if (isset($validated['document_type']) && isset($validated['document_number']) && $validated['document_type'] && $validated['document_number']) {
            if (Supplier::where('company_id', $supplier->company_id)
                ->where('document_type', $validated['document_type'])
                ->where('document_number', $validated['document_number'])
                ->where('id', '!=', $supplier->id)
                ->exists()) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'document_number' => 'Ya existe otro proveedor con este tipo y número de documento.',
                ]);
            }
        }

        $supplier->update([
            'document_type' => $validated['document_type'] ?? null,
            'document_number' => $validated['document_number'] ?? null,
            'legal_name' => $validated['legal_name'],
            'trade_name' => $validated['trade_name'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'contact_name' => $validated['contact_name'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'] ?? 'ACTIVE',
        ]);

        return back()->with('success', 'Proveedor actualizado exitosamente.');
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->update([
            'status' => $supplier->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        ]);

        return back()->with('success', 'Estado del proveedor modificado exitosamente.');
    }
}
