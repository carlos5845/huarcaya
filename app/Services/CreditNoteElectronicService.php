<?php

namespace App\Services;

use App\Models\CustomerReturn;
use App\Models\Sale;

class CreditNoteElectronicService
{
    /**
     * Evalúa si la devolución corresponde a un comprobante fiscal electrónico (Factura/Boleta)
     * o a un ticket/nota de venta interna, y genera la numeración y payload SUNAT (Catálogo 09).
     */
    public function generateFromReturn(CustomerReturn $customerReturn, ?string $requestedCatalog09Type = null): CustomerReturn
    {
        $customerReturn->loadMissing(['sale', 'lines.product', 'lines.saleLine', 'customer', 'branch.company']);
        $sale = $customerReturn->sale;
        $branch = $customerReturn->branch;
        $company = $branch?->company;

        $isFiscalDocument = $sale && in_array($sale->sale_type, ['FACTURA', 'BOLETA'], true);

        if (! $isFiscalDocument) {
            $customerReturn->update([
                'is_electronic_invoiced' => false,
                'sunat_credit_note_type' => null,
                'referenced_document_type' => '00',
                'referenced_document_series' => $sale?->external_document_series ?: ($branch?->ticket_series ?: 'NV01'),
                'referenced_document_number' => $sale?->external_document_number ?: ($sale?->sale_number ?? 'S/N'),
                'credit_note_series' => null,
                'credit_note_number' => null,
                'electronic_status' => 'NOT_APPLICABLE',
                'electronic_payload' => null,
            ]);

            return $customerReturn->fresh();
        }

        $isFactura = $sale->sale_type === 'FACTURA';
        $referencedDocType = $isFactura ? '01' : '03';
        [$defaultSeries, $defaultCorrelative] = explode('-', $sale->formattedFiscalNumber());
        $referencedSeries = $sale->external_document_series ?: $defaultSeries;
        $referencedNumber = ($sale->external_document_number && preg_match('/^\d{1,8}$/', $sale->external_document_number))
            ? str_pad($sale->external_document_number, 8, '0', STR_PAD_LEFT)
            : $defaultCorrelative;

        // Determinar código del Catálogo 09 SUNAT
        if ($customerReturn->return_type === 'PARTIAL') {
            $catalog09Code = '07'; // Devolución por ítem
        } else {
            $catalog09Code = in_array($requestedCatalog09Type, ['01', '06', '07'], true)
                ? $requestedCatalog09Type
                : '06'; // Devolución total por defecto
        }

        $creditNoteSeries = $isFactura
            ? strtoupper($branch?->credit_note_factura_series ?: 'FC01')
            : strtoupper($branch?->credit_note_boleta_series ?: 'BC01');
        $creditNoteNumber = $this->nextCorrelative($customerReturn->branch_id, $creditNoteSeries);

        $catalog09Description = CustomerReturn::SUNAT_CATALOG_09[$catalog09Code] ?? 'Devolución de mercadería';

        $rawCustomerDoc = trim((string) ($sale->customer_document_snapshot ?: ($customerReturn->customer?->document_number ?? '')));
        $isGenericDoc = $rawCustomerDoc === '' || $rawCustomerDoc === '00000000' || $rawCustomerDoc === '-';

        $payload = [
            'ubl_version' => '2.1',
            'customization_id' => '2.0',
            'environment' => $company?->sunat_environment ?: 'BETA',
            'document_type' => '07', // Catálogo 01 SUNAT: Nota de Crédito
            'series' => $creditNoteSeries,
            'number' => $creditNoteNumber,
            'full_number' => "{$creditNoteSeries}-{$creditNoteNumber}",
            'issue_date' => $customerReturn->operation_date->format('Y-m-d'),
            'issue_time' => ($customerReturn->created_at ?? now())->format('H:i:s'),
            'currency_code' => $customerReturn->currency_code,
            'issuer' => [
                'ruc' => $company?->document_number ?? '20600000000',
                'business_name' => $company?->business_name ?: ($company?->name ?? 'INVERSIONES HUARCAYA S.A.C.'),
                'trade_name' => $company?->trade_name ?: 'SIMAQ',
                'economic_activity' => $company?->economic_activity ?: 'VENTA DE REPUESTOS AUTOMOTRICES & MAQUINARIA PESADA',
                'establishment_code' => $branch?->sunat_establishment_code ?: '0000',
                'branch_name' => $branch?->name ?? 'Sede Principal',
                'branch_address' => $branch?->address ?: ($company?->address ?? '-'),
                'branch_location' => $branch?->ubigeoLocationText() ?? 'LIMA - PERÚ',
            ],
            'affected_document' => [
                'document_type' => $referencedDocType,
                'document_type_name' => $isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA',
                'series' => $referencedSeries,
                'number' => $referencedNumber,
                'sale_number' => $sale->sale_number,
            ],
            'credit_note_reason' => [
                'catalog_09_code' => $catalog09Code,
                'catalog_09_description' => $catalog09Description,
                'sustento' => $customerReturn->notes ?: $catalog09Description,
            ],
            'customer' => [
                'document_type' => $isFactura ? '6' : ($isGenericDoc ? '0' : '1'),
                'document_number' => $isGenericDoc ? '-' : $rawCustomerDoc,
                'legal_name' => $sale->customer_name_snapshot ?: ($customerReturn->customer?->legal_name ?? 'CLIENTES VARIOS'),
            ],
            'totals' => [
                'op_gravadas' => round((float) $customerReturn->subtotal_amount, 2),
                'igv_amount' => round((float) $customerReturn->tax_amount, 2),
                'total_amount' => round((float) $customerReturn->total_amount, 2),
            ],
            'items' => $customerReturn->lines->map(function ($line) use ($customerReturn) {
                $lineTotal = round((float) $line->line_total, 2);
                $hasTax = (float) $customerReturn->tax_amount > 0;
                $lineSubtotal = $hasTax ? round($lineTotal / 1.18, 2) : $lineTotal;
                $lineTax = $hasTax ? round($lineTotal - $lineSubtotal, 2) : 0.0;

                return [
                    'product_id' => $line->product_id,
                    'reference' => $line->product?->primary_reference ?? 'N/A',
                    'description' => $line->saleLine?->product_name_snapshot ?? $line->product?->name ?? 'Producto',
                    'unit_code' => Sale::sunatUnitCode($line->product?->unit?->code ?? null),
                    'quantity' => round((float) $line->quantity, 4),
                    'unit_price' => round((float) $line->unit_price, 4),
                    'line_subtotal' => $lineSubtotal,
                    'tax_amount' => $lineTax,
                    'line_total' => $lineTotal,
                    'condition' => $line->condition,
                ];
            })->values()->all(),
        ];

        $customerReturn->update([
            'is_electronic_invoiced' => true,
            'sunat_credit_note_type' => $catalog09Code,
            'referenced_document_type' => $referencedDocType,
            'referenced_document_series' => $referencedSeries,
            'referenced_document_number' => $referencedNumber,
            'credit_note_series' => $creditNoteSeries,
            'credit_note_number' => $creditNoteNumber,
            'electronic_status' => 'PENDING_EMISSION',
            'electronic_payload' => $payload,
        ]);

        return $customerReturn->fresh();
    }

    /**
     * Marca el documento electrónico como anulado cuando se revierte la devolución.
     */
    public function markAsCancelled(CustomerReturn $customerReturn): void
    {
        if ($customerReturn->is_electronic_invoiced) {
            $customerReturn->update([
                'electronic_status' => 'CANCELLED',
            ]);
        }
    }

    /**
     * Obtiene el siguiente correlativo de 8 dígitos para la serie de Nota de Crédito en la sucursal.
     */
    protected function nextCorrelative(int $branchId, string $series): string
    {
        $count = CustomerReturn::where('branch_id', $branchId)
            ->where('credit_note_series', $series)
            ->whereNotNull('credit_note_number')
            ->count();

        return str_pad((string) ($count + 1), 8, '0', STR_PAD_LEFT);
    }
}
