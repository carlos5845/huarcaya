<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cierre Diario - {{ $closing->branch->name ?? 'Sucursal' }} - {{ $closing->closing_date->format('d/m/Y') }}</title>
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
            font-size: 13px;
            font-weight: bold;
            margin: 4px 0;
            text-transform: uppercase;
        }
        .doc-number {
            font-size: 11px;
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
            font-size: 10px;
            padding: 3px 0;
            vertical-align: top;
        }
        .signature-box {
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #000;
            width: 45%;
            padding-top: 3px;
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
            <div style="font-size: 9.5px; margin-top: 2px; font-weight: bold;">{{ $closing->branch->name ?? 'Sucursal' }}</div>
            <div style="font-size: 8.5px; color: #333;">{{ $closing->branch->address ?? ($company->address ?? '-') }}</div>
            <div class="divider"></div>
        </div>

        <div class="text-center">
            <div class="doc-title">CIERRE DIARIO DE CAJA</div>
            <div class="doc-number">FECHA: {{ $closing->closing_date->format('d/m/Y') }}</div>
            <div style="font-size: 10px; margin-top: 2px;">
                ESTADO: <strong>{{ $closing->status === 'CLOSED' ? 'CERRADO DEFINITIVO' : 'EN PROCESO / BORRADOR' }}</strong>
            </div>
            @if($closing->latestVersion)
                <div style="font-size: 9px; color: #555;">Versión Arqueo: #{{ $closing->latestVersion->version_number }}</div>
            @endif
        </div>

        <div class="divider"></div>

        <div class="info-row">
            <span>Apertura:</span>
            <span>{{ $closing->opened_at ? $closing->opened_at->format('d/m/Y H:i') : '-' }}</span>
        </div>
        <div class="info-row">
            <span>Cierre:</span>
            <span>{{ $closing->closed_at ? $closing->closed_at->format('d/m/Y H:i') : '-' }}</span>
        </div>
        <div class="info-row">
            <span>Responsable:</span>
            <span>{{ $closing->openedByUser->name ?? '-' }}</span>
        </div>
        @if($closing->closedByUser)
        <div class="info-row">
            <span>Cerrado por:</span>
            <span>{{ $closing->closedByUser->name }}</span>
        </div>
        @endif

        <div class="double-divider"></div>

        <div class="text-center font-bold" style="font-size: 11px; margin-bottom: 3px;">
            ARQUEO DE CAJA Y COBRANZAS
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th class="text-left" style="width: 38%;">MÉTODO</th>
                    <th class="text-right" style="width: 21%;">SISTEMA</th>
                    <th class="text-right" style="width: 21%;">FÍSICO</th>
                    <th class="text-right" style="width: 20%;">DIF.</th>
                </tr>
            </thead>
            <tbody>
                @php
                    $latestVersion = $closing->latestVersion;
                    $counts = $latestVersion ? $latestVersion->cashCounts : collect();
                @endphp
                @forelse($counts as $count)
                    <tr>
                        <td class="text-left font-bold">{{ $count->paymentMethod->name ?? 'N/A' }}</td>
                        <td class="text-right">S/ {{ number_format($count->expected_amount, 2) }}</td>
                        <td class="text-right">S/ {{ number_format($count->counted_amount, 2) }}</td>
                        <td class="text-right font-bold" style="{{ $count->difference_amount < 0 ? 'color: red;' : ($count->difference_amount > 0 ? 'color: green;' : '') }}">
                            {{ $count->difference_amount > 0 ? '+' : '' }}{{ number_format($count->difference_amount, 2) }}
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" class="text-center" style="padding: 6px 0; color: #666;">
                            Sin registro de conteo físico aún
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        @if($latestVersion)
        <div class="divider"></div>
        <div class="info-row font-bold" style="font-size: 11px;">
            <span>TOTAL ESPERADO:</span>
            <span>S/ {{ number_format($latestVersion->total_expected, 2) }}</span>
        </div>
        <div class="info-row font-bold" style="font-size: 11px;">
            <span>TOTAL CONTADO:</span>
            <span>S/ {{ number_format($latestVersion->total_counted, 2) }}</span>
        </div>
        <div class="info-row font-bold" style="font-size: 11.5px; margin-top: 2px;">
            <span>DIFERENCIA TOTAL:</span>
            <span style="{{ $latestVersion->total_difference < 0 ? 'color: red;' : ($latestVersion->total_difference > 0 ? 'color: green;' : '') }}">
                {{ $latestVersion->total_difference > 0 ? '+' : '' }}S/ {{ number_format($latestVersion->total_difference, 2) }}
            </span>
        </div>
        @endif

        <div class="double-divider"></div>

        <!-- RESUMEN DE ACTIVIDAD DEL DÍA (SNAPSHOT) -->
        @php
            $snapshot = $latestVersion->snapshot_data ?? null;
            $sales = $snapshot['sales'] ?? null;
            $purchases = $snapshot['purchases'] ?? null;
            $transfers = $snapshot['transfers'] ?? null;
        @endphp

        @if($sales)
        <div class="text-center font-bold" style="font-size: 10.5px; margin-bottom: 3px;">
            RESUMEN DE OPERACIONES
        </div>
        <div class="info-row">
            <span>Total Ventas ({{ $sales['count'] ?? 0 }} comprobantes):</span>
            <span class="font-bold">S/ {{ number_format($sales['total_amount'] ?? 0, 2) }}</span>
        </div>
        <div class="info-row">
            <span> - Al Contado:</span>
            <span>S/ {{ number_format($sales['cash_amount'] ?? 0, 2) }}</span>
        </div>
        <div class="info-row">
            <span> - Al Crédito:</span>
            <span>S/ {{ number_format($sales['credit_amount'] ?? 0, 2) }}</span>
        </div>

        @if(!empty($sales['by_document']))
        <div style="font-size: 9.5px; margin-top: 3px; color: #444;">
            @foreach($sales['by_document'] as $docKey => $docData)
                @if(($docData['count'] ?? 0) > 0)
                <div class="info-row">
                    <span>{{ $docData['label'] ?? $docKey }} ({{ $docData['count'] }}):</span>
                    <span>S/ {{ number_format($docData['total'] ?? 0, 2) }}</span>
                </div>
                @endif
            @endforeach
        </div>
        @endif

        @if($purchases && ($purchases['count'] ?? 0) > 0)
        <div class="divider"></div>
        <div class="info-row">
            <span>Compras registradas ({{ $purchases['count'] }}):</span>
            <span>S/ {{ number_format($purchases['total_amount'] ?? 0, 2) }}</span>
        </div>
        @endif

        @if($transfers)
        <div class="info-row">
            <span>Transferencias Enviadas / Recibidas:</span>
            <span>{{ $transfers['sent_count'] ?? 0 }} / {{ $transfers['received_count'] ?? 0 }}</span>
        </div>
        @endif

        <div class="divider"></div>
        @endif

        @if(!empty($closing->notes))
        <div style="font-size: 9.5px; margin-top: 4px;">
            <strong>Observaciones:</strong><br/>
            {{ $closing->notes }}
        </div>
        <div class="divider"></div>
        @endif

        <div class="signature-box">
            <div class="signature-line">
                Cajero / Responsable
            </div>
            <div class="signature-line">
                Administración
            </div>
        </div>

        <div class="text-center" style="margin-top: 20px; font-size: 8.5px; color: #666;">
            Impreso el {{ now()->format('d/m/Y H:i:s') }}
        </div>
    </div>

</body>
</html>
