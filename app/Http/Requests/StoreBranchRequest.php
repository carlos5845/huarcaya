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

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:20|unique:branches,code',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'type' => 'required|string|in:STORE,WAREHOUSE',
            'status' => 'required|string|in:ACTIVE,INACTIVE',
        ];
    }
}
