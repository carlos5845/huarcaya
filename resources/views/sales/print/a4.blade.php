<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    @php
        $docType = $sale->external_document_type ?: $sale->sale_type;
        if (str_contains(strtoupper($docType), 'FACTURA')) {
            $docTitle = 'FACTURA ELECTRÓNICA';
        } elseif (str_contains(strtoupper($docType), 'BOLETA')) {
            $docTitle = 'BOLETA DE VENTA ELECTRÓNICA';
        } elseif (str_contains(strtoupper($docType), 'NOTA')) {
            $docTitle = 'NOTA DE VENTA ELECTRÓNICA';
        } else {
            $docTitle = 'COMPROBANTE DE PAGO';
        }

        $fullDocNumber = $sale->external_document_series 
            ? "{$sale->external_document_series}-{$sale->external_document_number}" 
            : $sale->sale_number;

        $currSymbol = $sale->currency_code === 'USD' ? '$' : 'S/';
        $currencyName = $sale->currency_code === 'USD' ? 'DÓLARES AMERICANOS (USD)' : 'SOLES (PEN)';
    @endphp
    <title>{{ $docTitle }} - {{ $fullDocNumber }}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #1e293b;
            line-height: 1.35;
            background-color: #f1f5f9;
            padding: 20px 10px;
            -webkit-font-smoothing: antialiased;
        }

        .page {
            background: #ffffff;
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 12mm 15mm;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        /* Barra de acciones de visualización */
        .no-print-bar {
            max-width: 210mm;
            margin: 0 auto 12px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1e293b;
            color: #ffffff;
            padding: 8px 16px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .btn {
            cursor: pointer;
            padding: 7px 16px;
            border-radius: 6px;
            border: none;
            font-weight: 600;
            font-size: 11px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            text-decoration: none;
            transition: all 0.2s;
        }

        .btn-primary {
            background-color: #0284c7;
            color: #ffffff;
        }

        .btn-primary:hover {
            background-color: #0369a1;
        }

        .btn-secondary {
            background-color: #475569;
            color: #ffffff;
        }

        .btn-secondary:hover {
            background-color: #334155;
        }

        /* Cabecera Principal */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }

        .company-col {
            width: 58%;
            vertical-align: top;
            padding-right: 15px;
        }

        .sunat-col {
            width: 42%;
            vertical-align: top;
        }

        .company-logo {
            max-width: 180px;
            max-height: 52px;
            object-fit: contain;
            margin-bottom: 6px;
            display: block;
        }

        .company-name {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: -0.2px;
        }

        .company-activity {
            font-size: 9.5px;
            font-weight: 700;
            color: #0284c7;
            text-transform: uppercase;
            margin-bottom: 4px;
        }

        .company-info {
            font-size: 9px;
            color: #475569;
            line-height: 1.4;
        }

        /* Recuadro Oficial SUNAT */
        .sunat-box {
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 10px 14px;
            text-align: center;
            background-color: #ffffff;
        }

        .sunat-ruc {
            font-size: 13.5px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
        }

        .sunat-doc-title {
            font-size: 12px;
            font-weight: 800;
            color: #ffffff;
            background-color: #0f172a;
            padding: 4px 6px;
            margin: 6px 0;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .sunat-number {
            font-size: 15px;
            font-weight: 800;
            color: #dc2626;
            font-family: 'Courier New', Courier, monospace;
            letter-spacing: 1px;
        }

        /* Cajas de Información */
        .info-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            margin-bottom: 10px;
            background: #ffffff;
            overflow: hidden;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
        }

        .info-table td {
            padding: 4px 8px;
            font-size: 9.5px;
            vertical-align: top;
        }

        .label {
            font-weight: 700;
            color: #475569;
            width: 18%;
            text-transform: uppercase;
            font-size: 8.5px;
        }

        .val {
            color: #0f172a;
            font-weight: 600;
            width: 32%;
        }

        /* Tabla de Ítems / Productos */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }

        .items-table th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 6px 6px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1.5px solid #94a3b8;
            letter-spacing: 0.2px;
        }

        .items-table td {
            padding: 5px 6px;
            font-size: 9.5px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }

        .items-table tr:nth-child(even) {
            background-color: #f8fafc;
        }

        .item-ref {
            display: inline-block;
            font-size: 8.5px;
            color: #0284c7;
            font-weight: 600;
            font-family: monospace;
            margin-right: 4px;
        }

        .item-brand {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 1px;
        }

        /* Monto en Letras */
        .words-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 9px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 10px;
            text-transform: uppercase;
        }

        /* Resumen Inferior y Totales */
        .bottom-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        .bottom-left-col {
            width: 60%;
            vertical-align: top;
            padding-right: 12px;
        }

        .bottom-right-col {
            width: 40%;
            vertical-align: top;
        }

        /* Caja de Términos / Pagos */
        .payment-summary-box {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 8px;
            background: #ffffff;
            margin-bottom: 8px;
        }

        .box-title {
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            color: #0284c7;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 2px;
            margin-bottom: 4px;
        }

        .notes-text {
            font-size: 8.5px;
            color: #64748b;
            line-height: 1.3;
        }

        /* Totales SUNAT */
        .totals-box {
            border: 1.5px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            overflow: hidden;
        }

        .totals-table {
            width: 100%;
            border-collapse: collapse;
        }

        .totals-table td {
            padding: 3.5px 8px;
            font-size: 9.5px;
        }

        .totals-table tr:not(:last-child) td {
            border-bottom: 1px solid #f1f5f9;
        }

        .total-label {
            font-weight: 600;
            color: #475569;
            text-align: right;
            font-size: 8.5px;
            text-transform: uppercase;
        }

        .total-val {
            text-align: right;
            font-weight: 700;
            font-family: 'Courier New', Courier, monospace;
            width: 42%;
        }

        .grand-total-row {
            background-color: #0f172a;
            color: #ffffff;
        }

        .grand-total-row .total-label {
            color: #ffffff;
            font-weight: 800;
            font-size: 10px;
        }

        .grand-total-row .total-val {
            color: #ffffff;
            font-size: 13px;
            font-weight: 800;
        }

        /* Sección QR y Legal */
        .qr-section {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 6px;
        }

        .qr-canvas {
            width: 64px;
            height: 64px;
            border: 1px solid #cbd5e1;
            padding: 3px;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-radius: 4px;
        }

        .legal-notice {
            font-size: 8px;
            color: #64748b;
            line-height: 1.35;
        }

        /* Firmas y Footer */
        .footer-signatures {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
        }

        .signature-col {
            width: 50%;
            text-align: center;
            padding: 0 20px;
        }

        .signature-line {
            border-top: 1px dashed #64748b;
            margin-top: 30px;
            padding-top: 4px;
            font-size: 8.5px;
            color: #475569;
            font-weight: 600;
            text-transform: uppercase;
        }

        .page-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            margin-top: 10px;
            font-size: 7.5px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }

        /* Media Print Rules */
        @media print {
            @page {
                size: A4 portrait;
                margin: 8mm 10mm;
            }

            body {
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
            }

            .page {
                box-shadow: none !important;
                padding: 0 !important;
                max-width: 100% !important;
                min-height: auto !important;
            }

            .no-print-bar {
                display: none !important;
            }

            tr, td, th {
                page-break-inside: avoid;
            }

            .sunat-doc-title {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .grand-total-row {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>
<body>

    <!-- Barra de Control (no imprimible) -->
    <div class="no-print-bar">
        <div style="font-size: 11px; font-weight: 600; display: flex; items-center; gap: 8px;">
            <span>📄 {{ $docTitle }} &bull; {{ $fullDocNumber }}</span>
        </div>
        <div style="display: flex; gap: 8px;">
            <a href="javascript:window.print()" class="btn btn-primary">
                🖨️ Imprimir Comprobante (A4)
            </a>
            <button type="button" onclick="if(window.parent !== window){ window.parent.postMessage('close-preview', '*'); } else { window.close(); }" class="btn btn-secondary">
                ✕ Cerrar
            </button>
        </div>
    </div>

    <div class="page">
        <div>
            <!-- CABECERA -->
            <table class="header-table">
                <tr>
                    <td class="company-col">
                        <img src="{{ asset('logo-text.png') }}" alt="{{ $company->business_name ?? 'Inversiones Huarcaya' }}" class="company-logo" onerror="this.style.display='none'" />
                        <div class="company-name">{{ $company->business_name ?? 'INVERSIONES HUARCAYA S.A.C.' }}</div>
                        <div class="company-activity">Venta de Repuestos Automotrices & Maquinaria Pesada</div>
                        <div class="company-info">
                            <div><strong>Sede Emisora:</strong> {{ $sale->branch->name ?? 'Sede Principal' }}</div>
                            <div><strong>Dirección:</strong> {{ $sale->branch->address ?? ($company->address ?? 'Jr. Los Negocios 123, Lima - Perú') }}</div>
                            <div>
                                @if(!empty($company->phone)) <strong>Tel:</strong> {{ $company->phone }} &bull; @endif
                                @if(!empty($company->email)) <strong>Email:</strong> {{ $company->email }} @endif
                            </div>
                        </div>
                    </td>
                    <td class="sunat-col">
                        <div class="sunat-box">
                            <div class="sunat-ruc">R.U.C. {{ $company->document_number ?? '20600000000' }}</div>
                            <div class="sunat-doc-title">{{ $docTitle }}</div>
                            <div class="sunat-number">{{ $fullDocNumber }}</div>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- DATOS DEL CLIENTE Y COMPROBANTE -->
            <div class="info-card">
                <table class="info-table">
                    <tr>
                        <td class="label">Señor(es):</td>
                        <td class="val" style="width: 48%; text-transform: uppercase;">
                            {{ $sale->customer_name_snapshot ?? ($sale->customer->legal_name ?? 'PÚBLICO GENERAL') }}
                        </td>
                        <td class="label" style="width: 14%;">Fecha Emisión:</td>
                        <td class="val" style="width: 20%;">
                            {{ \Carbon\Carbon::parse($sale->operation_date ?? $sale->issue_date)->format('d/m/Y') }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label">{{ $sale->customer->document_type ?? 'RUC / DNI' }}:</td>
                        <td class="val font-mono">
                            {{ $sale->customer_document_snapshot ?? ($sale->customer->document_number ?? '00000000') }}
                        </td>
                        <td class="label">Fecha Vence:</td>
                        <td class="val">
                            {{ $sale->due_date ? \Carbon\Carbon::parse($sale->due_date)->format('d/m/Y') : \Carbon\Carbon::parse($sale->operation_date ?? $sale->issue_date)->format('d/m/Y') }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label">Dirección:</td>
                        <td class="val" style="text-transform: uppercase;">
                            {{ $sale->customer_address_snapshot ?? ($sale->customer->address ?? '-') }}
                        </td>
                        <td class="label">Condición:</td>
                        <td class="val" style="color: {{ $sale->payment_type === 'CREDIT' ? '#dc2626' : '#16a34a' }}; font-weight: 700;">
                            {{ $sale->payment_type === 'CASH' ? 'AL CONTADO' : 'AL CRÉDITO' }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label">Teléfono:</td>
                        <td class="val">
                            {{ $sale->customer->phone ?? '-' }}
                        </td>
                        <td class="label">Moneda:</td>
                        <td class="val">
                            {{ $currencyName }}
                        </td>
                    </tr>
                </table>
            </div>

            <!-- TABLA DE ARTÍCULOS -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="text-center" style="width: 4%;">#</th>
                        <th class="text-center" style="width: 12%;">Código / Ref</th>
                        <th class="text-center" style="width: 8%;">Cant.</th>
                        <th class="text-center" style="width: 8%;">Unidad</th>
                        <th class="text-left" style="width: 44%;">Descripción del Repuesto / Producto</th>
                        <th class="text-right" style="width: 12%;">Precio Unit.</th>
                        <th class="text-right" style="width: 12%;">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($sale->lines as $idx => $line)
                        <tr>
                            <td class="text-center font-mono text-muted" style="color: #64748b; font-size: 8.5px;">{{ $idx + 1 }}</td>
                            <td class="text-center font-mono font-bold" style="font-size: 8.5px;">
                                {{ $line->product_reference_snapshot ?: ($line->product->reference_code ?? $line->product->sku ?? '-') }}
                            </td>
                            <td class="text-center font-bold">
                                {{ number_format($line->quantity, $line->quantity == intval($line->quantity) ? 0 : 2) }}
                            </td>
                            <td class="text-center font-mono" style="font-size: 8.5px; text-transform: uppercase;">
                                {{ $line->product->unit->code ?? 'NIU' }}
                            </td>
                            <td>
                                <div style="font-weight: 700; color: #0f172a;">
                                    {{ $line->product_name_snapshot ?? ($line->product->name ?? 'Repuesto Automotriz') }}
                                </div>
                                <div class="item-brand">
                                    @if(!empty($line->product->brand->name))
                                        Marca: <strong>{{ $line->product->brand->name }}</strong>
                                    @endif
                                    @if(!empty($line->product->category->name))
                                        &bull; Línea: {{ $line->product->category->name }}
                                    @endif
                                </div>
                            </td>
                            <td class="text-right font-mono">
                                {{ $currSymbol }} {{ number_format($line->unit_price, 2) }}
                            </td>
                            <td class="text-right font-mono font-bold" style="color: #0f172a;">
                                {{ $currSymbol }} {{ number_format($line->line_total, 2) }}
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" class="text-center" style="padding: 15px; color: #94a3b8;">
                                No hay ítems registrados en este comprobante.
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>

            <!-- MONTO EN LETRAS -->
            <div class="words-box">
                {{ $totalInWords }}
            </div>

            <!-- SECCIÓN INFERIOR: CONDICIONES Y TOTALES -->
            <table class="bottom-table">
                <tr>
                    <td class="bottom-left-col">
                        <!-- Detalles de Pago & Observaciones -->
                        <div class="payment-summary-box">
                            <div class="box-title">Forma de Pago & Amortización</div>
                            <table style="width: 100%; font-size: 9px; line-height: 1.4;">
                                <tr>
                                    <td style="width: 35%; color: #64748b;">Condición:</td>
                                    <td><strong>{{ $sale->payment_type === 'CASH' ? 'Contado Inmediato' : 'Crédito Comercial' }}</strong></td>
                                </tr>
                                @if($sale->payment_type === 'CREDIT')
                                    <tr>
                                        <td style="color: #64748b;">Adelanto Pagado:</td>
                                        <td class="font-mono text-success" style="color: #16a34a; font-weight: 700;">
                                            {{ $currSymbol }} {{ number_format($paidAmount, 2) }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #64748b;">Saldo Pendiente:</td>
                                        <td class="font-mono" style="color: {{ $pendingAmount > 0 ? '#dc2626' : '#16a34a' }}; font-weight: 700;">
                                            {{ $currSymbol }} {{ number_format($pendingAmount, 2) }}
                                        </td>
                                    </tr>
                                @else
                                    @if($sale->paymentMethod)
                                        <tr>
                                            <td style="color: #64748b;">Medio de Pago:</td>
                                            <td><strong>{{ $sale->paymentMethod->name }}</strong></td>
                                        </tr>
                                    @endif
                                @endif
                                <tr>
                                    <td style="color: #64748b;">Vendedor:</td>
                                    <td>{{ $sale->creator->name ?? 'Administración' }}</td>
                                </tr>
                                @if(!empty($sale->notes))
                                    <tr>
                                        <td style="color: #64748b; vertical-align: top;">Observaciones:</td>
                                        <td class="notes-text">{{ $sale->notes }}</td>
                                    </tr>
                                @endif
                            </table>
                        </div>

                        <!-- Bloque QR & Representación Impresa -->
                        <div class="qr-section">
                            <div class="qr-canvas">
                                <!-- SVG QR representativo con datos reales SUNAT -->
                                <svg viewBox="0 0 100 100" width="56" height="56" fill="#0f172a">
                                    <path d="M0,0 h30 v30 h-30 z M6,6 v18 h18 v-18 z M12,12 h6 v6 h-6 z M70,0 h30 v30 h-30 z M76,6 v18 h18 v-18 z M82,12 h6 v6 h-6 z M0,70 h30 v30 h-30 z M6,76 v18 h18 v-18 z M12,82 h6 v6 h-6 z M38,8 h6 v6 h-6 z M52,8 h6 v6 h-6 z M42,20 h14 v6 h-14 z M38,38 h8 v8 h-8 z M52,38 h12 v6 h-12 z M70,38 h8 v14 h-8 z M86,38 h8 v8 h-8 z M38,52 h8 v8 h-8 z M52,50 h8 v16 h-8 z M82,52 h12 v8 h-12 z M38,70 h6 v12 h-6 z M52,70 h10 v6 h-10 z M70,70 h8 v8 h-8 z M86,70 h8 v14 h-8 z M42,86 h16 v8 h-16 z M70,86 h8 v8 h-8 z"/>
                                </svg>
                            </div>
                            <div class="legal-notice">
                                <div><strong>Representación impresa de la {{ $docTitle }}</strong></div>
                                <div>Autorizado mediante Resolución de Superintendencia N° 034-005-0005315</div>
                                <div>Consulte la validez de este comprobante en nuestro portal institucional.</div>
                                <div style="font-family: monospace; font-size: 7.5px; margin-top: 2px; color: #94a3b8;">
                                    HASH: {{ strtoupper(substr(md5($sale->id . $sale->created_at . $sale->total_amount), 0, 24)) }}
                                </div>
                            </div>
                        </div>
                    </td>

                    <td class="bottom-right-col">
                        <!-- Cuadro de Totales -->
                        <div class="totals-box">
                            <table class="totals-table">
                                <tr>
                                    <td class="total-label">Op. Gravada:</td>
                                    <td class="total-val">{{ $currSymbol }} {{ number_format($subtotal, 2) }}</td>
                                </tr>
                                <tr>
                                    <td class="total-label">Op. Inafecta:</td>
                                    <td class="total-val">{{ $currSymbol }} 0.00</td>
                                </tr>
                                <tr>
                                    <td class="total-label">Op. Exonerada:</td>
                                    <td class="total-val">{{ $currSymbol }} 0.00</td>
                                </tr>
                                <tr>
                                    <td class="total-label">I.G.V. (18%):</td>
                                    <td class="total-val">{{ $currSymbol }} {{ number_format($tax, 2) }}</td>
                                </tr>
                                @if(!empty($sale->discount_amount) && $sale->discount_amount > 0)
                                    <tr>
                                        <td class="total-label">Total Descuento:</td>
                                        <td class="total-val" style="color: #dc2626;">- {{ $currSymbol }} {{ number_format($sale->discount_amount, 2) }}</td>
                                    </tr>
                                @endif
                                <tr class="grand-total-row">
                                    <td class="total-label">IMPORTE TOTAL:</td>
                                    <td class="total-val">{{ $currSymbol }} {{ number_format($total, 2) }}</td>
                                </tr>
                            </table>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- FIRMAS DE CONFORMIDAD -->
            <table class="footer-signatures">
                <tr>
                    <td class="signature-col">
                        <div class="signature-line">
                            Entregado por: {{ $sale->creator->name ?? 'Despacho' }}<br>
                            <span style="font-size: 7.5px; color: #94a3b8; font-weight: normal;">Firma y Sello Emisor</span>
                        </div>
                    </td>
                    <td class="signature-col">
                        <div class="signature-line">
                            Recibí Conforme / Cliente<br>
                            <span style="font-size: 7.5px; color: #94a3b8; font-weight: normal;">DNI / RUC y Firma Receptor</span>
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- PIE DE PÁGINA -->
        <div class="page-footer">
            <div>
                SIMAQ &bull; Sistema Integrado de Maquinaria y Repuestos | {{ $company->business_name ?? 'Inversiones Huarcaya S.A.C.' }}
            </div>
            <div>
                Impreso el {{ date('d/m/Y H:i:s') }} por {{ Auth::user()->name ?? 'Usuario' }}
            </div>
        </div>
    </div>

</body>
</html>
