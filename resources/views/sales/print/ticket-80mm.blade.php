<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket Venta - {{ $sale->external_document_number ? $sale->external_document_series.'-'.$sale->external_document_number : $sale->sale_number }}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Courier New', Courier, monospace, Arial;
            font-size: 11px;
            color: #000;
            line-height: 1.25;
            background-color: #f7fafc;
            padding: 10px;
        }
        .ticket-wrapper {
            background: #fff;
            width: 78mm;
            margin: 0 auto;
            padding: 8mm 4mm;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .no-print-bar {
            width: 78mm;
            margin: 0 auto 10px auto;
            text-align: center;
        }
        .btn {
            cursor: pointer;
            padding: 6px 14px;
            border-radius: 4px;
            border: none;
            font-weight: bold;
            font-size: 11px;
            background: #2563eb;
            color: #fff;
            text-decoration: none;
            display: inline-block;
            margin-bottom: 5px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
        }
        .double-divider {
            border-top: 2px solid #000;
            margin: 6px 0;
        }
        .ticket-logo {
            max-width: 155px;
            max-height: 48px;
            margin: 0 auto 6px auto;
            display: block;
            object-fit: contain;
            filter: grayscale(100%) contrast(140%);
        }
        .header-title {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .doc-title {
            font-size: 12px;
            font-weight: bold;
            margin: 3px 0;
            text-transform: uppercase;
        }
        .doc-number {
            font-size: 14px;
            font-weight: bold;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 10px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
        }
        .items-table th {
            border-bottom: 1px dashed #000;
            font-size: 10px;
            text-transform: uppercase;
            padding-bottom: 3px;
        }
        .items-table td {
            font-size: 10.5px;
            padding: 3px 0;
            vertical-align: top;
        }
        .item-name {
            font-weight: bold;
            display: block;
        }
        .item-sub {
            font-size: 9px;
            color: #333;
        }
        .totals-table {
            width: 100%;
            margin-top: 4px;
            font-size: 11px;
        }
        .totals-table td {
            padding: 1.5px 0;
        }
        .total-big {
            font-size: 14px;
            font-weight: 800;
        }
        .qr-placeholder {
            margin: 10px auto 4px auto;
            text-align: center;
            font-size: 9px;
            color: #555;
        }

        @media print {
            @page {
                size: 80mm auto;
                margin: 0;
            }
            body {
                background: none;
                padding: 0;
            }
            .ticket-wrapper {
                box-shadow: none;
                width: 100%;
                padding: 4mm 3mm;
            }
            .no-print-bar {
                display: none !important;
            }
        }
    </style>
</head>
<body>

    <div class="no-print-bar" style="display: flex; justify-content: center; gap: 8px;">
        <a href="javascript:window.print()" class="btn">
            🖨️ Imprimir Ticket (80mm)
        </a>
        <button type="button" onclick="if(window.parent !== window){ window.parent.postMessage('close-preview', '*'); } else { window.close(); }" class="btn" style="background: #4a5568;">
            ✕ Cerrar
        </button>
    </div>

    <div class="ticket-wrapper">
        <div class="text-center">
            <!-- LOGOTIPO DE LA MARCA -->
            <img src="{{ asset('logo-text.png') }}" alt="{{ $company->business_name ?? 'Inversiones Huarcaya' }}" class="ticket-logo" />
            <div class="header-title">{{ $company->business_name ?? 'INVERSIONES HUARCAYA S.A.C.' }}</div>
            <div style="font-size: 10px;">RUC: {{ $company->document_number ?? '20600000000' }}</div>
            <div style="font-size: 9px;">VENTA DE REPUESTOS AUTOMOTRICES</div>
            <div style="font-size: 9px; margin-top: 1px;">{{ $sale->branch->name ?? 'Sucursal Principal' }}</div>
            <div style="font-size: 8.5px; color: #333;">{{ $sale->branch->address ?? ($company->address ?? '-') }}</div>
            <div class="divider"></div>

            <div class="doc-title">
                @if($sale->sale_type === 'FACTURA' || $sale->external_document_type === 'FACTURA')
                    FACTURA ELECTRÓNICA
                @elseif($sale->sale_type === 'BOLETA' || $sale->external_document_type === 'BOLETA')
                    BOLETA DE VENTA ELECTRÓNICA
                @else
                    TICKET DE VENTA
                @endif
            </div>
            <div class="doc-number">
                {{ $sale->external_document_series ? $sale->external_document_series.'-'.$sale->external_document_number : $sale->sale_number }}
            </div>
            <div style="font-size: 9px; margin-top: 1px;">
                Fecha: {{ \Carbon\Carbon::parse($sale->operation_date)->format('d/m/Y') }} {{ $sale->created_at->format('H:i:s') }}
            </div>
        </div>

        <div class="divider"></div>

        <!-- DATOS DEL CLIENTE -->
        <div class="info-row">
            <span class="font-bold">CLIENTE:</span>
            <span style="max-width: 55mm; text-align: right;">{{ $sale->customer_name_snapshot ?? ($sale->customer->legal_name ?? 'PÚBLICO GENERAL') }}</span>
        </div>
        <div class="info-row">
            <span class="font-bold">{{ $sale->customer->document_type ?? 'DOC' }}:</span>
            <span>{{ $sale->customer_document_snapshot ?? ($sale->customer->document_number ?? '00000000') }}</span>
        </div>
        <div class="info-row">
            <span class="font-bold">CONDICIÓN:</span>
            <span>{{ $sale->payment_type === 'CASH' ? 'AL CONTADO' : 'AL CRÉDITO' }}</span>
        </div>
        @if($sale->payment_type === 'CREDIT' && $sale->due_date)
            <div class="info-row">
                <span class="font-bold">VENCE:</span>
                <span>{{ \Carbon\Carbon::parse($sale->due_date)->format('d/m/Y') }}</span>
            </div>
        @endif
        @if($sale->paymentMethod)
            <div class="info-row">
                <span class="font-bold">MEDIO:</span>
                <span>{{ $sale->paymentMethod->name }}</span>
            </div>
        @endif
        <div class="info-row">
            <span class="font-bold">CAJERO/A:</span>
            <span>{{ $sale->creator->name ?? 'Vendedor' }}</span>
        </div>

        <div class="divider"></div>

        <!-- TABLA DE ARTÍCULOS -->
        <table class="items-table">
            <thead>
                <tr>
                    <th class="text-left" style="width: 14%;">CANT</th>
                    <th class="text-left" style="width: 56%;">DESCRIPCIÓN</th>
                    <th class="text-right" style="width: 15%;">P.U.</th>
                    <th class="text-right" style="width: 15%;">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                @foreach($sale->lines as $line)
                    <tr>
                        <td class="font-bold">{{ number_format($line->quantity, $line->quantity == intval($line->quantity) ? 0 : 2) }}</td>
                        <td>
                            <span class="item-name">{{ $line->product_name_snapshot ?? ($line->product->name ?? 'Repuesto') }}</span>
                            @if(!empty($line->product_reference_snapshot) && $line->product_reference_snapshot !== 'N/A')
                                <span class="item-sub">Ref: {{ $line->product_reference_snapshot }}</span>
                            @endif
                        </td>
                        <td class="text-right font-mono">{{ number_format($line->unit_price, 2) }}</td>
                        <td class="text-right font-mono font-bold">{{ number_format($line->line_total, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="double-divider"></div>

        <!-- TOTALES -->
        @php
            $currSymbol = $sale->currency_code === 'USD' ? '$' : 'S/';
        @endphp
        <table class="totals-table">
            <tr>
                <td class="text-left">OP. GRAVADA:</td>
                <td class="text-right font-mono">{{ $currSymbol }} {{ number_format($sale->subtotal_amount, 2) }}</td>
            </tr>
            <tr>
                <td class="text-left">I.G.V. (18%):</td>
                <td class="text-right font-mono">{{ $currSymbol }} {{ number_format($sale->tax_amount, 2) }}</td>
            </tr>
            <tr class="total-big">
                <td class="text-left">TOTAL:</td>
                <td class="text-right font-mono">{{ $currSymbol }} {{ number_format($sale->total_amount, 2) }}</td>
            </tr>
        </table>

        @if($sale->payment_type === 'CREDIT' && $sale->receivable)
            <div class="divider"></div>
            <div class="info-row">
                <span>SALDO PENDIENTE:</span>
                <span class="font-bold font-mono">{{ $currSymbol }} {{ number_format($sale->receivable->balance_amount, 2) }}</span>
            </div>
        @endif

        <div class="divider"></div>

        <!-- PIE DE TICKET -->
        <div class="text-center" style="font-size: 9.5px; margin-top: 4px;">
            <div>¡GRACIAS POR SU COMPRA!</div>
            <div style="font-size: 8.5px; color: #444; margin-top: 2px;">
                Revise su mercadería antes de salir de mostrador.<br>
                Cambios o devoluciones según política de garantía.
            </div>
            <div class="qr-placeholder">
                ================================<br>
                REPRESENTACIÓN IMPRESA DE VENTA<br>
                SIMAQ &bull; Inversiones Huarcaya
            </div>
        </div>
    </div>

</body>
</html>
