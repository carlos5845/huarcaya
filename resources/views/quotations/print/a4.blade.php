<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Cotización {{ $quotation->quotation_number }}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
        }
        body {
            background-color: #f8fafc;
            padding: 24px 0;
            font-size: 12px;
        }
        .page {
            background: #ffffff;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 24mm 20mm;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            position: relative;
        }
        @media print {
            body {
                background: transparent;
                padding: 0;
            }
            .page {
                box-shadow: none;
                margin: 0;
                width: 100%;
                min-height: auto;
                padding: 15mm 15mm;
            }
            .no-print {
                display: none !important;
            }
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 16px;
        }
        .company-info {
            max-width: 58%;
        }
        .company-name {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: -0.3px;
            margin-bottom: 4px;
        }
        .company-sub {
            font-size: 11px;
            color: #64748b;
            line-height: 1.4;
        }
        .quote-badge-box {
            border: 2px solid #0284c7;
            border-radius: 8px;
            padding: 12px 16px;
            text-align: center;
            background: #f0f9ff;
            min-width: 200px;
        }
        .quote-badge-title {
            font-size: 14px;
            font-weight: 800;
            color: #0369a1;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .quote-badge-number {
            font-size: 16px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 4px;
            letter-spacing: 0.5px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 14px;
            margin-bottom: 20px;
        }
        .info-col p {
            line-height: 1.6;
            font-size: 11.5px;
        }
        .info-label {
            font-weight: 700;
            color: #475569;
            display: inline-block;
            min-width: 105px;
        }

        .table-items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .table-items th {
            background: #0284c7;
            color: #ffffff;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 8px 10px;
            text-align: left;
        }
        .table-items td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
            vertical-align: middle;
        }
        .table-items tr:nth-child(even) td {
            background-color: #f8fafc;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .badge-special {
            display: inline-block;
            background: #fef3c7;
            color: #92400e;
            font-size: 9.5px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #fde68a;
            margin-top: 2px;
        }

        .summary-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 24px;
        }
        .banks-box {
            flex: 1;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 12px;
            background: #ffffff;
        }
        .banks-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0369a1;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 8px;
        }
        .bank-item {
            margin-bottom: 6px;
            font-size: 10.5px;
            line-height: 1.4;
        }

        .totals-box {
            width: 250px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            overflow: hidden;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11.5px;
        }
        .totals-row.grand-total {
            background: #0284c7;
            color: #ffffff;
            font-weight: 800;
            font-size: 13px;
            border-bottom: none;
        }
        .totals-row.grand-total span {
            color: #ffffff;
        }

        .legal-notice {
            background: #f1f5f9;
            border-left: 3px solid #0284c7;
            padding: 10px 14px;
            font-size: 10px;
            color: #475569;
            line-height: 1.5;
            border-radius: 0 4px 4px 0;
            margin-top: 10px;
        }
    </style>
</head>
<body>

    <div class="page">
        <!-- Encabezado con datos fiscales y Badge -->
        <div class="header">
            <div class="company-info">
                @if($company && $company->logo_path)
                    <img src="{{ $company->logoUrl() }}" alt="Logo" style="max-height: 48px; margin-bottom: 6px; object-fit: contain;">
                @endif
                <div class="company-name">{{ $company->business_name ?? $company->name ?? 'INVERSIONES HUARCAYA' }}</div>
                <div class="company-sub">
                    <strong>RUC:</strong> {{ $company->document_number ?? '20600000000' }}<br>
                    <strong>Dirección Matriz:</strong> {{ $company->address ?? 'Lima, Perú' }}<br>
                    <strong>Sucursal Emisora:</strong> {{ $quotation->branch->name ?? 'Central' }} - {{ $quotation->branch->address ?? '' }}<br>
                    @if($company && $company->phone) <strong>Teléfono:</strong> {{ $company->phone }} @endif
                    @if($company && $company->email) | <strong>Email:</strong> {{ $company->email }} @endif
                </div>
            </div>
            <div class="quote-badge-box">
                <div class="quote-badge-title">COTIZACIÓN / PRESUPUESTO</div>
                <div class="quote-badge-number">{{ $quotation->quotation_number }}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                    Régimen: {{ $quotation->tax_mode === 'INCLUDED' ? 'Precios con IGV' : ($quotation->tax_mode === 'PLUS_TAX' ? '+ 18% IGV' : 'Exonerado') }}
                </div>
            </div>
        </div>

        <!-- Ficha de Datos del Cliente y Condiciones Comerciales -->
        <div class="info-grid">
            <div class="info-col">
                <p><span class="info-label">Cliente / Razón:</span> <strong>{{ $quotation->customer_name_snapshot }}</strong></p>
                <p><span class="info-label">RUC / DNI:</span> {{ $quotation->customer_document_snapshot ?? '-' }}</p>
                <p><span class="info-label">Dirección:</span> {{ $quotation->customer_address_snapshot ?? '-' }}</p>
                <p><span class="info-label">Teléfono:</span> {{ $quotation->customer_phone_snapshot ?? '-' }}</p>
            </div>
            <div class="info-col">
                <p><span class="info-label">Fecha Emisión:</span> {{ $quotation->operation_date->format('d/m/Y') }}</p>
                <p><span class="info-label">Validez Oferta:</span> <strong>{{ $quotation->valid_until_date->format('d/m/Y') }}</strong> ({{ $quotation->validity_days }} días)</p>
                <p><span class="info-label">Forma de Pago:</span> {{ $quotation->payment_terms ?? 'Contado' }}</p>
                <p><span class="info-label">Tiempo Entrega:</span> {{ $quotation->delivery_time ?? 'Inmediata' }}</p>
                <p><span class="info-label">Moneda:</span> <strong>{{ $quotation->currency_code === 'USD' ? 'Dólares Americanos ($)' : 'Soles Peruanos (S/)' }}</strong></p>
            </div>
        </div>

        <!-- Tabla de Repuestos Cotizados -->
        <table class="table-items">
            <thead>
                <tr>
                    <th style="width: 35px;" class="text-center">#</th>
                    <th style="width: 110px;">Código Ref.</th>
                    <th>Descripción de Repuesto / Producto</th>
                    <th style="width: 50px;" class="text-center">U.M.</th>
                    <th style="width: 60px;" class="text-right">Cant.</th>
                    <th style="width: 80px;" class="text-right">P. Unit</th>
                    <th style="width: 90px;" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($quotation->lines as $index => $line)
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        <td style="font-family: monospace; font-weight: 700;">{{ $line->product_reference_snapshot }}</td>
                        <td>
                            <div style="font-weight: 600;">{{ $line->product_name_snapshot }}</div>
                            @if($line->is_special_order)
                                <span class="badge-special">⚠️ Pedido Especial: {{ $line->delivery_time_line ?? '3-5 días hábiles' }}</span>
                            @endif
                            @if($line->notes)
                                <div style="font-size: 10px; color: #64748b; font-style: italic;">{{ $line->notes }}</div>
                            @endif
                        </td>
                        <td class="text-center">{{ $line->unit_code_snapshot }}</td>
                        <td class="text-right" style="font-weight: 700;">{{ number_format($line->quantity, 2) }}</td>
                        <td class="text-right">{{ $quotation->currency_code === 'USD' ? '$' : 'S/' }} {{ number_format($line->unit_price, 2) }}</td>
                        <td class="text-right" style="font-weight: 700;">{{ $quotation->currency_code === 'USD' ? '$' : 'S/' }} {{ number_format($line->line_total, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Resumen Financiero y Sección de Cuentas Bancarias -->
        <div class="summary-container">
            <div class="banks-box">
                <div class="banks-title">💳 Cuentas Bancarias para Depósito o Transferencia</div>
                @if(isset($bankAccounts) && $bankAccounts->count() > 0)
                    @foreach($bankAccounts as $acc)
                        <div class="bank-item">
                            <strong>{{ $acc->bank_name }}</strong> ({{ $acc->currency_code }} - {{ $acc->account_type }})<br>
                            <span>N° Cuenta: <strong>{{ $acc->account_number }}</strong></span> | 
                            <span>CCI: <strong>{{ $acc->cci ?? 'Consultar' }}</strong></span><br>
                            <span style="color: #64748b; font-size: 9.5px;">Titular: {{ $acc->beneficiary_name }}</span>
                        </div>
                    @endforeach
                @else
                    <div style="font-size: 10.5px; color: #64748b;">
                        Consultar cuentas de recaudación autorizadas con su asesor de ventas.
                    </div>
                @endif
            </div>

            <div class="totals-box">
                <div class="totals-row">
                    <span>Op. Gravadas (Subtotal):</span>
                    <span>{{ $quotation->currency_code === 'USD' ? '$' : 'S/' }} {{ number_format($quotation->subtotal_amount, 2) }}</span>
                </div>
                @if($quotation->discount_amount > 0)
                    <div class="totals-row" style="color: #16a34a;">
                        <span>Descuento Comercial:</span>
                        <span>- {{ $quotation->currency_code === 'USD' ? '$' : 'S/' }} {{ number_format($quotation->discount_amount, 2) }}</span>
                    </div>
                @endif
                <div class="totals-row">
                    <span>I.G.V. (18%):</span>
                    <span>{{ $quotation->currency_code === 'USD' ? '$' : 'S/' }} {{ number_format($quotation->tax_amount, 2) }}</span>
                </div>
                <div class="totals-row grand-total">
                    <span>TOTAL A PAGAR:</span>
                    <span>{{ $quotation->currency_code === 'USD' ? '$' : 'S/' }} {{ number_format($quotation->total_amount, 2) }}</span>
                </div>
            </div>
        </div>

        <!-- Condiciones Legales y Notas -->
        @if($quotation->notes)
            <div style="margin-bottom: 12px; font-size: 11px;">
                <strong>Observaciones comerciales:</strong> {{ $quotation->notes }}
            </div>
        @endif

        <div class="legal-notice">
            <strong>CONDICIONES GENERALES:</strong><br>
            • Esta cotización tiene una vigencia de <strong>{{ $quotation->validity_days }} días calendario</strong> desde su emisión.<br>
            • <em>Precios y disponibilidad física de stock sujetos a cambio tras la fecha de vencimiento.</em><br>
            • En productos catalogados como <strong>Pedido Especial</strong>, el plazo estimado de despacho computa a partir de la confirmación del pago o anticipo pactado.
        </div>
    </div>

</body>
</html>
