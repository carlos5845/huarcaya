<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    @php
        $isFiscal = (bool) $customerReturn->is_electronic_invoiced;
        $docTitle = $isFiscal ? 'NOTA DE CRÉDITO ELECTRÓNICA' : 'VALE DE DEVOLUCIÓN / INGRESO A ALMACÉN';

        $fiscalNumber = ($customerReturn->credit_note_series && $customerReturn->credit_note_number)
            ? "{$customerReturn->credit_note_series}-{$customerReturn->credit_note_number}"
            : $customerReturn->return_number;

        $displayNumber = $isFiscal ? $fiscalNumber : $customerReturn->return_number;

        $refTypeLabel = match ($customerReturn->referenced_document_type) {
            '01' => 'FACTURA ELECTRÓNICA',
            '03' => 'BOLETA DE VENTA ELECTRÓNICA',
            default => 'NOTA DE VENTA / TICKET INTERNO',
        };

        $refFullNumber = ($customerReturn->referenced_document_series && $customerReturn->referenced_document_number && preg_match('/^\d{1,8}$/', $customerReturn->referenced_document_number))
            ? "{$customerReturn->referenced_document_series}-" . str_pad($customerReturn->referenced_document_number, 8, '0', STR_PAD_LEFT)
            : ($customerReturn->sale?->formattedFiscalNumber() ?? ($customerReturn->sale?->sale_number ?? 'S/N'));

        $rawCustomerDoc = trim((string) ($customerReturn->customer?->document_number ?? ''));
        $isGenericCustomerDoc = $rawCustomerDoc === '' || $rawCustomerDoc === '00000000' || $rawCustomerDoc === '-';
        $customerDocDisplay = $isGenericCustomerDoc ? '- (SIN DOCUMENTO)' : $rawCustomerDoc;

        $currSymbol = $customerReturn->currency_code === 'USD' ? '$' : 'S/';
        $settlementLabel = match ($customerReturn->settlement_type) {
            'CASH_REFUND' => 'Egreso Directo de Caja',
            'STORE_CREDIT' => 'Saldo a Favor del Cliente',
            'RECEIVABLE_OFFSET' => 'Amortización de Deuda (Crédito)',
            default => $customerReturn->settlement_type ?? 'N/A',
        };
    @endphp
    <title>{{ $docTitle }} - {{ $displayNumber }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 10.5px;
            color: #18181b;
            line-height: 1.45;
            background-color: #fafafa;
            padding: 16px 12px;
            -webkit-font-smoothing: antialiased;
        }
        .no-print-bar {
            max-width: 210mm;
            margin: 0 auto 12px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #ffffff;
            border: 1px solid #e4e4e7;
            padding: 8px 14px;
            border-radius: 6px;
        }
        .btn {
            cursor: pointer;
            padding: 6px 12px;
            border-radius: 5px;
            border: 1px solid #d4d4d8;
            font-weight: 500;
            font-size: 11px;
            text-decoration: none;
            color: #18181b;
            background: #ffffff;
        }
        .btn-primary {
            background: #18181b;
            color: #ffffff;
            border-color: #18181b;
        }
        .page {
            background: #ffffff;
            max-width: 210mm;
            min-height: 265mm;
            margin: 0 auto;
            padding: 14mm 16mm;
            border: 1px solid #e4e4e7;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        /* Header minimalista */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e4e4e7;
            margin-bottom: 18px;
        }
        .company-brand {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .company-logo {
            max-height: 36px;
            width: auto;
            object-fit: contain;
            margin-bottom: 4px;
            align-self: flex-start;
        }
        .company-brand h1 {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: -0.2px;
            color: #09090b;
        }
        .company-brand p {
            font-size: 9.5px;
            color: #71717a;
        }
        .doc-box {
            border: 1px solid #27272a;
            border-radius: 4px;
            padding: 10px 16px;
            text-align: center;
            min-width: 230px;
        }
        .doc-box .ruc {
            font-size: 10px;
            font-weight: 600;
            color: #52525b;
            letter-spacing: 0.4px;
        }
        .doc-box .title {
            font-size: 10px;
            font-weight: 700;
            color: #09090b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 5px 0;
            margin: 5px 0;
            border-top: 1px solid #e4e4e7;
            border-bottom: 1px solid #e4e4e7;
        }
        .doc-box .number {
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 13px;
            font-weight: 700;
            color: #09090b;
        }
        .doc-box .internal-code {
            font-size: 8.5px;
            color: #71717a;
            margin-top: 2px;
        }
        /* Metadatos en dos columnas limpias */
        .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e4e4e7;
            margin-bottom: 16px;
        }
        .meta-section-title {
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #71717a;
            margin-bottom: 8px;
        }
        .meta-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 4px;
            font-size: 10px;
        }
        .meta-label { color: #71717a; }
        .meta-value { color: #09090b; font-weight: 500; text-align: right; }
        .font-mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }

        /* Tabla minimalista */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
        }
        th {
            font-size: 8.5px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #71717a;
            padding: 8px 6px;
            text-align: left;
            border-bottom: 1px solid #27272a;
        }
        td {
            padding: 9px 6px;
            border-bottom: 1px solid #f4f4f5;
            font-size: 10px;
            color: #18181b;
            vertical-align: top;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .condition-tag {
            display: inline-block;
            font-size: 8.5px;
            font-weight: 500;
            padding: 1px 6px;
            border-radius: 3px;
            border: 1px solid #e4e4e7;
            color: #52525b;
        }
        .condition-damaged {
            border-color: #fde68a;
            background: #fffbeb;
            color: #92400e;
        }

        /* Pie de importes minimalista */
        .summary-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            margin-top: 8px;
        }
        .notes-area {
            flex: 1;
            font-size: 9.5px;
            color: #52525b;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .notes-area strong { color: #18181b; }
        .legal-caption {
            font-size: 8.5px;
            color: #a1a1aa;
            margin-top: 4px;
        }
        .totals-box {
            width: 220px;
            border-top: 1px solid #e4e4e7;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 10px;
            color: #52525b;
        }
        .totals-row.grand {
            border-top: 1px solid #18181b;
            border-bottom: 2px double #18181b;
            padding: 7px 0;
            margin-top: 2px;
            font-size: 11.5px;
            font-weight: 700;
            color: #09090b;
        }

        /* Firmas limpias */
        .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 32px;
            margin-top: 42px;
            padding-top: 12px;
            text-align: center;
            font-size: 9px;
            color: #71717a;
        }
        .sig-line {
            border-top: 1px solid #d4d4d8;
            padding-top: 6px;
            margin-top: 32px;
        }
        .doc-footer {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px solid #f4f4f5;
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            color: #a1a1aa;
        }

        @media print {
            @page { size: A4 portrait; margin: 10mm 12mm; }
            body { background: #ffffff !important; padding: 0 !important; }
            .no-print-bar { display: none !important; }
            .page { border: none !important; padding: 0 !important; min-height: auto !important; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div>
            <!-- Cabecera Minimalista -->
            <div class="header">
                <div class="company-brand">
                    <img src="{{ $company ? $company->logoUrl() : asset('logo-text.png') }}" alt="{{ $company?->business_name ?? 'Inversiones Huarcaya' }}" class="company-logo" onerror="this.style.display='none'" />
                    <h1>{{ $company?->business_name ?: ($company?->name ?? 'INVERSIONES HUARCAYA S.A.C.') }}</h1>
                    <p style="font-weight: 500; color: #52525b;">{{ $company?->economic_activity ?: 'Venta de Repuestos Automotrices & Maquinaria Pesada' }}</p>
                    <p>
                        Sede Emisora: {{ $customerReturn->branch?->name ?? 'Principal' }}
                        (Anexo SUNAT: {{ $customerReturn->branch?->sunat_establishment_code ?: '0000' }})
                    </p>
                    <p>
                        {{ $customerReturn->branch?->address ?: ($company?->address ?? '-') }}
                        &mdash; {{ $customerReturn->branch?->ubigeoLocationText() ?? 'LIMA - PERÚ' }}
                    </p>
                </div>

                <div class="doc-box">
                    <div class="ruc">R.U.C. {{ $company?->document_number ?? '20600000001' }}</div>
                    <div class="title">{{ $docTitle }}</div>
                    <div class="number">{{ $displayNumber }}</div>
                    @if($isFiscal)
                        <div class="internal-code">Ref. Interna: {{ $customerReturn->return_number }}</div>
                    @endif
                </div>
            </div>

            <!-- Información del Cliente y Documento de Referencia -->
            <div class="meta-grid">
                <div>
                    <div class="meta-section-title">Datos del Cliente</div>
                    <div class="meta-row">
                        <span class="meta-label">Razón Social / Cliente</span>
                        <span class="meta-value">{{ $customerReturn->customer?->legal_name ?? 'CLIENTE VARIOS' }}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Documento</span>
                        <span class="meta-value font-mono">{{ $customerDocDisplay }}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Fecha de Emisión</span>
                        <span class="meta-value font-mono">{{ optional($customerReturn->operation_date)->format('d/m/Y') }} {{ ($customerReturn->created_at ?? now())->format('H:i:s') }}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Moneda</span>
                        <span class="meta-value">{{ $customerReturn->currency_code === 'USD' ? 'Dólares (USD)' : 'Soles (PEN)' }}</span>
                    </div>
                </div>

                <div>
                    <div class="meta-section-title">
                        {{ $isFiscal ? 'Documento que Modifica (SUNAT)' : 'Referencia de Operación' }}
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Comprobante Origen</span>
                        <span class="meta-value font-mono">{{ $refFullNumber }}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Tipo de Comprobante</span>
                        <span class="meta-value">{{ $refTypeLabel }}</span>
                    </div>
                    @if($isFiscal)
                        <div class="meta-row">
                            <span class="meta-label">Motivo SUNAT (Cat. 09)</span>
                            <span class="meta-value">{{ $customerReturn->sunat_credit_note_type }} - {{ $catalog09Description }}</span>
                        </div>
                    @endif
                    <div class="meta-row">
                        <span class="meta-label">Liquidación</span>
                        <span class="meta-value">{{ $settlementLabel }}</span>
                    </div>
                </div>
            </div>

            <!-- Detalle de Ítems -->
            <table>
                <thead>
                    <tr>
                        <th style="width: 28px;">#</th>
                        <th style="width: 85px;">Código</th>
                        <th class="text-center" style="width: 50px;">U.M.</th>
                        <th>Descripción</th>
                        <th class="text-center" style="width: 115px;">Condición</th>
                        <th class="text-right" style="width: 60px;">Cant.</th>
                        <th class="text-right" style="width: 105px;">{{ $tax > 0 ? 'P. Unit. (Inc. IGV)' : 'Valor Unit.' }}</th>
                        <th class="text-right" style="width: 85px;">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($customerReturn->lines as $idx => $line)
                        <tr>
                            <td class="font-mono" style="color: #71717a;">{{ str_pad((string) ($idx + 1), 2, '0', STR_PAD_LEFT) }}</td>
                            <td class="font-mono">{{ $line->product?->primary_reference ?? 'N/A' }}</td>
                            <td class="text-center font-mono">{{ \App\Models\Sale::sunatUnitCode($line->product?->unit?->code ?? null) }}</td>
                            <td>
                                {{ $line->saleLine?->product_name_snapshot ?? $line->product?->name ?? 'Producto' }}
                                @if($line->notes)
                                    <div style="font-size: 8.5px; color: #71717a; margin-top: 2px;">Nota: {{ $line->notes }}</div>
                                @endif
                            </td>
                            <td class="text-center">
                                @if(($line->condition ?? 'GOOD') === 'DAMAGED')
                                    <span class="condition-tag condition-damaged">Dañado / Cuarentena</span>
                                @else
                                    <span class="condition-tag">Buen Estado</span>
                                @endif
                            </td>
                            <td class="text-right font-mono">{{ number_format((float) $line->quantity, 2) }}</td>
                            <td class="text-right font-mono">{{ $currSymbol }} {{ number_format((float) $line->unit_price, 2) }}</td>
                            <td class="text-right font-mono" style="font-weight: 600;">{{ $currSymbol }} {{ number_format((float) $line->line_total, 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>

            <!-- Resumen e Importes -->
            <div class="summary-grid">
                <div class="notes-area">
                    <div><strong>IMPORTE EN LETRAS:</strong> {{ $totalInWords }}</div>
                    @if($customerReturn->notes)
                        <div><strong>SUSTENTO / OBSERVACIONES:</strong> {{ $customerReturn->notes }}</div>
                    @endif
                    <div class="legal-caption">
                        @if($isFiscal)
                            Representación impresa de la Nota de Crédito Electrónica vinculada a {{ $refTypeLabel }} {{ $refFullNumber }}.
                        @else
                            Constancia interna de devolución y reingreso a almacén (No constituye comprobante electrónico SUNAT).
                        @endif
                    </div>
                </div>

                <div class="totals-box">
                    @if($isFiscal || $tax > 0)
                        <div class="totals-row">
                            <span>Op. Gravada</span>
                            <span class="font-mono">{{ $currSymbol }} {{ number_format($subtotal, 2) }}</span>
                        </div>
                        <div class="totals-row">
                            <span>I.G.V. (18%)</span>
                            <span class="font-mono">{{ $currSymbol }} {{ number_format($tax, 2) }}</span>
                        </div>
                    @endif
                    <div class="totals-row grand">
                        <span>Total</span>
                        <span class="font-mono">{{ $currSymbol }} {{ number_format($total, 2) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div>
            <div class="signatures">
                <div class="sig-line">Conformidad del Cliente</div>
                <div class="sig-line">Recepción de Almacén</div>
                <div class="sig-line">V°B° Caja / Administración</div>
            </div>

            <div class="doc-footer">
                <span>{{ $company?->business_name ?? $company?->legal_name ?? 'Inversiones Huarcaya' }}</span>
                <span>Emitido por: {{ $customerReturn->creator?->name ?? 'Sistema' }} &bull; Impreso: {{ now()->format('d/m/Y H:i') }}</span>
            </div>
        </div>
    </div>
</body>
</html>
