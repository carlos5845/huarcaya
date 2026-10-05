<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket Traslado - {{ $transfer->transfer_number }}</title>
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
            padding: 5px 12px;
            border-radius: 4px;
            border: none;
            font-weight: bold;
            font-size: 11px;
            background: #2b6cb0;
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
            max-width: 150px;
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
        .signature-box {
            margin-top: 25px;
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #000;
            width: 85%;
            margin: 0 auto 3px auto;
            padding-top: 2px;
            font-size: 9.5px;
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
            <img src="{{ asset('logo-text.png') }}" alt="{{ $company->business_name ?? 'Inversiones Huarcaya' }}" class="ticket-logo" />
            <div class="header-title">{{ $company->business_name ?? 'INVERSIONES HUARCAYA' }}</div>
            <div style="font-size: 10px;">RUC: {{ $company->document_number ?? '20600000000' }}</div>
            <div style="font-size: 9px;">REPUESTOS AUTOMOTRICES</div>
            <div class="divider"></div>
            <div class="doc-title">TICKET DE TRASLADO INTERNO</div>
            <div class="doc-number">{{ $transfer->transfer_number }}</div>
            <div style="font-size: 9px;">{{ $transfer->created_at->format('d/m/Y H:i:s') }}</div>
        </div>

        <div class="divider"></div>

        <div class="info-row">
            <span class="font-bold">ORIGEN:</span>
            <span>{{ $transfer->sourceBranch->name ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="font-bold">DESTINO:</span>
            <span>{{ $transfer->destinationBranch->name ?? '-' }}</span>
        </div>
        <div class="info-row">
            <span class="font-bold">ESTADO:</span>
            <span>{{ $transfer->status }}</span>
        </div>
        <div class="info-row">
            <span class="font-bold">RESPONSABLE:</span>
            <span>{{ $transfer->creator->name ?? 'Usuario' }}</span>
        </div>

        <div class="divider"></div>

        <table class="items-table">
            <thead>
                <tr>
                    <th class="text-left" style="width: 20%;">CANT</th>
                    <th class="text-left" style="width: 80%;">DESCRIPCIÓN / SKU</th>
                </tr>
            </thead>
            <tbody>
                @foreach($transfer->lines as $line)
                    @php
                        $qty = $line->shipped_quantity > 0 ? $line->shipped_quantity : $line->requested_quantity;
                    @endphp
                    <tr>
                        <td class="text-left font-bold" style="font-size: 12px;">
                            {{ number_format($qty, 0) }} {{ $line->product->unit->code ?? 'PZA' }}
                        </td>
                        <td class="text-left">
                            <span class="item-name">{{ $line->product->name ?? 'Repuesto' }}</span>
                            <span class="item-sub">
                                [{{ $line->product->internal_code ?? '-' }}] 
                                Ref: {{ $line->product->primary_reference ?? '-' }} 
                                &bull; {{ $line->product->brand->name ?? '' }}
                            </span>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="double-divider"></div>

        <div class="info-row font-bold" style="font-size: 11px;">
            <span>TOTAL LÍNEAS:</span>
            <span>{{ count($transfer->lines) }}</span>
        </div>
        <div class="info-row font-bold" style="font-size: 12px;">
            <span>TOTAL UNIDADES:</span>
            <span>{{ number_format($transfer->lines->sum(function($l) { return $l->shipped_quantity > 0 ? $l->shipped_quantity : $l->requested_quantity; }), 0) }}</span>
        </div>

        @if($transfer->notes)
            <div class="divider"></div>
            <div style="font-size: 9px;">
                <strong>Nota:</strong> {{ $transfer->notes }}
            </div>
        @endif

        <div class="signature-box">
            <div class="signature-line">ENTREGADO CONFORME (ORIGEN)</div>
        </div>

        <div class="signature-box" style="margin-top: 30px;">
            <div class="signature-line">RECIBIDO CONFORME (DESTINO)</div>
        </div>

        <div class="divider" style="margin-top: 20px;"></div>
        <div class="text-center" style="font-size: 8.5px; color: #555;">
            Control interno de almacén - Huarcaya<br>
            ¡Verificar mercadería antes de firmar!
        </div>
    </div>

</body>
</html>
