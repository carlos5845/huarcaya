<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        $customers = Customer::where('company_id', Auth::user()->company_id)
            ->orderBy('legal_name')
            ->get();

        return Inertia::render('catalog/customers/index', [
            'customers' => $customers,
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
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $companyId = Auth::user()->company_id;

        if ($validated['document_type'] && $validated['document_number']) {
            if (Customer::where('company_id', $companyId)
                ->where('document_type', $validated['document_type'])
                ->where('document_number', $validated['document_number'])
                ->exists()) {
                throw ValidationException::withMessages([
                    'document_number' => 'Ya existe un cliente con este tipo y número de documento.',
                ]);
            }
        }

        Customer::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId,
            'document_type' => $validated['document_type'] ?? null,
            'document_number' => $validated['document_number'] ?? null,
            'legal_name' => $validated['legal_name'],
            'trade_name' => $validated['trade_name'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'status' => $validated['status'] ?? 'ACTIVE',
            'created_by' => Auth::id(),
        ]);

        return back()->with('success', 'Cliente registrado exitosamente.');
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'document_type' => ['required', 'string', 'max:30'],
            'document_number' => ['required', 'string', 'max:50'],
            'legal_name' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        if ($validated['document_type'] && $validated['document_number']) {
            if (Customer::where('company_id', $customer->company_id)
                ->where('document_type', $validated['document_type'])
                ->where('document_number', $validated['document_number'])
                ->where('id', '!=', $customer->id)
                ->exists()) {
                throw ValidationException::withMessages([
                    'document_number' => 'Ya existe otro cliente con este tipo y número de documento.',
                ]);
            }
        }

        $customer->update([
            'document_type' => $validated['document_type'] ?? null,
            'document_number' => $validated['document_number'] ?? null,
            'legal_name' => $validated['legal_name'],
            'trade_name' => $validated['trade_name'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'status' => $validated['status'] ?? 'ACTIVE',
        ]);

        return back()->with('success', 'Cliente actualizado exitosamente.');
    }

    public function destroy(Customer $customer)
    {
        $customer->update([
            'status' => $customer->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        ]);

        return back()->with('success', 'Estado del cliente modificado exitosamente.');
    }
}
