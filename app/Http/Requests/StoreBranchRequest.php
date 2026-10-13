<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreBranchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasRole('Super Admin');
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'sunat_establishment_code' => $this->input('sunat_establishment_code') ?: '0000',
            'invoice_series' => strtoupper(trim((string) ($this->input('invoice_series') ?: 'F001'))),
            'boleta_series' => strtoupper(trim((string) ($this->input('boleta_series') ?: 'B001'))),
            'ticket_series' => strtoupper(trim((string) ($this->input('ticket_series') ?: 'NV01'))),
            'credit_note_factura_series' => strtoupper(trim((string) ($this->input('credit_note_factura_series') ?: 'FC01'))),
            'credit_note_boleta_series' => strtoupper(trim((string) ($this->input('credit_note_boleta_series') ?: 'BC01'))),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'code_prefix' => 'required|string|in:SUC,SED',
            'sunat_establishment_code' => ['required', 'string', 'regex:/^\d{4}$/'],
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:255',
            'type' => 'required|string|in:STORE,WAREHOUSE',
            'status' => 'required|string|in:ACTIVE,INACTIVE',
            'invoice_series' => ['required', 'string', 'regex:/^F[A-Z0-9]{3}$/'],
            'boleta_series' => ['required', 'string', 'regex:/^B[A-Z0-9]{3}$/'],
            'ticket_series' => ['required', 'string', 'regex:/^[A-Z0-9]{4}$/'],
            'credit_note_factura_series' => ['required', 'string', 'regex:/^F[A-Z0-9]{3}$/'],
            'credit_note_boleta_series' => ['required', 'string', 'regex:/^B[A-Z0-9]{3}$/'],
        ];
    }
}
