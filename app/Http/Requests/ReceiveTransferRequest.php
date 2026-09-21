<?php

namespace App\Http\Requests;

use App\Models\Transfer;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ReceiveTransferRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $transfer = $this->route('transfer');
        if (is_string($transfer)) {
            $transfer = Transfer::findOrFail($transfer);
        }

        return $this->user()->can('receive', $transfer);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.id' => 'required|exists:transfer_lines,id',
            'lines.*.received_quantity' => 'required|numeric|min:0',
            'lines.*.damaged_quantity' => 'required|numeric|min:0',
            'lines.*.missing_quantity' => 'required|numeric|min:0',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->has('lines') && is_array($this->lines)) {
                $transfer = $this->route('transfer');
                if (is_string($transfer)) {
                    $transfer = Transfer::findOrFail($transfer);
                }
                $transferLines = $transfer->lines()->get()->keyBy('id');

                foreach ($this->lines as $index => $line) {
                    if (isset($line['id']) && $transferLines->has($line['id'])) {
                        $transferLine = $transferLines[$line['id']];
                        $received = (float) ($line['received_quantity'] ?? 0);
                        $damaged = (float) ($line['damaged_quantity'] ?? 0);
                        $missing = (float) ($line['missing_quantity'] ?? 0);

                        $total = $received + $damaged + $missing;
                        $shipped = (float) $transferLine->shipped_quantity;

                        // Use a small epsilon for floating point comparison if needed, but round works for decimals
                        if (round($total, 6) !== round($shipped, 6)) {
                            $validator->errors()->add("lines.{$index}", "La suma de recibido ({$received}), dañado ({$damaged}) y faltante ({$missing}) debe ser exactamente igual a lo despachado ({$shipped}) en el repuesto.");
                        }
                    }
                }
            }
        });
    }
}
