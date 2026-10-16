<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liquidación de Cobranzas - {{ $report['period_label'] ?? 'Reporte' }} - Inversiones Huarcaya</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #1a202c;
            line-height: 1.4;
            background-color: #f7fafc;
            padding: 20px;
        }
        .page {
            background: #fff;
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 12mm 15mm;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            position: relative;
        }
        .no-print-bar {
            max-width: 210mm;
            margin: 0 auto 15px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1e293b;
            color: #fff;
            padding: 10px 16px;
            border-radius: 8px;
        }
        .btn {
            cursor: pointer;
            padding: 6px 14px;
            border-radius: 4px;
            border: none;
            font-weight: bold;
            font-size: 12px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            text-decoration: none;
        }
        .btn-primary {
            background-color: #059669;
            color: #fff;
        }
        .btn-secondary {
            background-color: #64748b;
            color: #fff;
        }
        .header-table {
            width: 100%;
            margin-bottom: 12px;
            border-bottom: 2px solid #059669;
            padding-bottom: 10px;
        }
        .company-title {
            font-size: 15px;
            font-weight: bold;
            color: #059669;
        }
        .company-subtitle {
            font-size: 10px;
            color: #475569;
            margin-top: 2px;
        }
        .doc-box {
            border: 2px solid #059669;
            border-radius: 6px;
            padding: 8px 12px;
            text-align: center;
            background-color: #f0fdf4;
        }
        .doc-box-title {
            font-size: 12px;
            font-weight: 800;
            color: #065f46;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .doc-box-sub {
            font-size: 10px;
            font-weight: bold;
            color: #047857;
            margin-top: 3px;
        }
        .meta-grid {
            display: flex;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 14px;
            font-size: 10px;
        }
        .meta-item {
            flex: 1;
        }
        .meta-label {
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            font-size: 9px;
            display: block;
            margin-bottom: 2px;
        }
        .meta-value {
            font-weight: 600;
            color: #1e293b;
        }
        .kpi-row {
            display: flex;
            gap: 10px;
            margin-bottom: 14px;
        }
        .kpi-card {
            flex: 1;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 10px;
            background: #fff;
        }
        .kpi-card.highlight {
            background: #f0fdf4;
            border-color: #a7f3d0;
        }
        .kpi-title {
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 4px;
        }
        .kpi-amount {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            font-family: 'Courier New', Courier, monospace;
        }
        .kpi-amount.emerald {
            color: #059669;
        }
        .kpi-sub {
            font-size: 9px;
            color: #64748b;
            margin-top: 2px;
        }
        .section-title {
            font-size: 11px;
            font-weight: bold;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 12px 0 6px 0;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .data-table th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 700;
            font-size: 9.5px;
            text-transform: uppercase;
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            text-align: left;
        }
        .data-table td {
            padding: 5px 8px;
            border: 1px solid #e2e8f0;
            font-size: 10px;
            color: #1e293b;
        }
        .data-table tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .font-mono {
            font-family: 'Courier New', Courier, monospace;
        }
        .font-bold {
            font-weight: bold;
        }
        .total-row td {
            font-weight: 800;
            background-color: #e2e8f0 !important;
            border-top: 2px solid #64748b;
        }
        .signatures-container {
            margin-top: 35px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
        }
        .sign-box {
            width: 42%;
            text-align: center;
            padding-top: 30px;
            border-top: 1px dashed #64748b;
        }
        .sign-name {
            font-weight: bold;
            font-size: 10.5px;
            color: #1e293b;
        }
        .sign-role {
            font-size: 9px;
            color: #64748b;
            margin-top: 2px;
        }
        .footer-note {
            margin-top: 25px;
            text-align: center;
            font-size: 8.5px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
        }
        @media print {
            body {
                background: #fff;
                padding: 0;
            }
            .page {
                box-shadow: none;
                padding: 0;
                margin: 0;
                max-width: 100%;
                min-height: auto;
            }
            .no-print-bar {
                display: none;
            }
        }
    </style>
</head>
<body>

    <div class="no-print-bar">
        <div>
            <strong>Hoja de Liquidación de Cobranzas A4</strong> - {{ $report['period_label'] }}
        </div>
        <div style="display: flex; gap: 8px;">
            <button onclick="window.print()" class="btn btn-primary">
                🖨️ Imprimir Documento
            </button>
            <button onclick="window.close()" class="btn btn-secondary">
                ✕ Cerrar
            </button>
        </div>
    </div>

    <div class="page">
        <!-- Header -->
        <table class="header-table">
            <tr>
                <td style="width: 55%; vertical-align: top;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        @if($company && method_exists($company, 'logoUrl'))
                            <img src="{{ $company->logoUrl() }}" alt="Logo" style="max-height: 44px; max-width: 140px; object-fit: contain;">
                        @endif
                        <div>
                            <div class="company-title">{{ $company->business_name ?? $company->name ?? 'INVERSIONES HUARCAYA' }}</div>
                            <div class="company-subtitle">
                                RUC: {{ $company->document_number ?? '20000000000' }} | Tel: {{ $company->phone ?? '-' }}<br>
                                {{ $company->address ?? 'Lima, Perú' }}
                            </div>
                        </div>
                    </div>
                </td>
                <td style="width: 45%; vertical-align: top;">
                    <div class="doc-box">
                        <div class="doc-box-title">Liquidación y Cuadre de Cobranzas</div>
                        <div class="doc-box-sub">{{ $report['period_label'] }}</div>
                        <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Control y Recaudación de Créditos</div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Metadata Grid -->
        <div class="meta-grid">
            <div class="meta-item">
                <span class="meta-label">Sucursal</span>
                <span class="meta-value">{{ $branchName }}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Período Auditado</span>
                <span class="meta-value">{{ $report['start_date'] }} al {{ $report['end_date'] }}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Fecha y Hora de Emisión</span>
                <span class="meta-value">{{ $generatedAt }}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Emitido Por</span>
                <span class="meta-value">{{ $user->name ?? 'Sistema' }}</span>
            </div>
        </div>

        <!-- KPIs Resumen Financiero -->
        <div class="kpi-row">
            <div class="kpi-card highlight">
                <div class="kpi-title">Total Recaudado (Cobros)</div>
                <div class="kpi-amount emerald">S/ {{ number_format($report['total_collected_pen'], 2) }}</div>
                @if($report['total_collected_usd'] > 0)
                    <div class="kpi-sub font-mono font-bold">+ $ {{ number_format($report['total_collected_usd'], 2) }} USD</div>
                @else
                    <div class="kpi-sub">Dinero real amortizado en caja</div>
                @endif
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Cobros Confirmados</div>
                <div class="kpi-amount">{{ $report['collected_count'] }}</div>
                <div class="kpi-sub">Operaciones registradas</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Nuevos Créditos Emitidos</div>
                <div class="kpi-amount font-mono">S/ {{ number_format($report['total_new_debt_pen'], 2) }}</div>
                <div class="kpi-sub">{{ $report['new_debts_count'] }} comprobantes otorgados</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Vencidas en el Período</div>
                <div class="kpi-amount font-mono" style="color: #dc2626;">S/ {{ number_format($report['total_matured_debt_pen'], 2) }}</div>
                <div class="kpi-sub">{{ $report['matured_count'] }} deudas vencieron plazo</div>
            </div>
        </div>

        <!-- Desglose por Método de Pago -->
        @if(!empty($report['methods_breakdown']) && count($report['methods_breakdown']) > 0)
            <div class="section-title">Resumen por Método de Pago</div>
            <table class="data-table" style="margin-bottom: 14px;">
                <thead>
                    <tr>
                        <th>Método de Pago</th>
                        <th class="text-center">Tipo</th>
                        <th class="text-center">N° Operaciones</th>
                        <th class="text-right">Monto Recaudado (PEN)</th>
                        @if($report['total_collected_usd'] > 0)
                            <th class="text-right">Monto Recaudado (USD)</th>
                        @endif
                    </tr>
                </thead>
                <tbody>
                    @foreach($report['methods_breakdown'] as $mb)
                        <tr>
                            <td class="font-bold">{{ $mb['method_name'] }}</td>
                            <td class="text-center">
                                @if($mb['is_cash'])
                                    <span style="color: #059669; font-weight: bold;">Efectivo</span>
                                @else
                                    <span style="color: #2563eb; font-weight: bold;">Bancarizado / Digital</span>
                                @endif
                            </td>
                            <td class="text-center font-mono">{{ $mb['count'] }}</td>
                            <td class="text-right font-mono font-bold">S/ {{ number_format($mb['amount_pen'], 2) }}</td>
                            @if($report['total_collected_usd'] > 0)
                                <td class="text-right font-mono">$ {{ number_format($mb['amount_usd'], 2) }}</td>
                            @endif
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        <!-- Detalle de Amortizaciones -->
        <div class="section-title">Detalle de Operaciones de Cobranza Registradas</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 25px;" class="text-center">#</th>
                    <th style="width: 90px;">Fecha / Hora</th>
                    <th style="width: 85px;">N° Recibo</th>
                    <th>Cliente / Deudor</th>
                    <th style="width: 100px;">Venta / Crédito</th>
                    <th style="width: 95px;">Medio de Pago</th>
                    <th style="width: 80px;">Cajero / Cobrador</th>
                    <th style="width: 85px;" class="text-right">Monto</th>
                </tr>
            </thead>
            <tbody>
                @forelse($report['payments'] as $idx => $p)
                    <tr>
                        <td class="text-center font-mono" style="color: #64748b;">{{ $idx + 1 }}</td>
                        <td class="font-mono" style="font-size: 9.5px;">{{ $p['operation_date'] }}</td>
                        <td class="font-mono font-bold">{{ $p['payment_number'] }}</td>
                        <td>
                            <div class="font-bold" style="font-size: 10px;">{{ $p['customer_name'] }}</div>
                            <div style="font-size: 8.5px; color: #64748b;">{{ $p['customer_doc'] }}</div>
                        </td>
                        <td class="font-mono" style="font-size: 9px;">
                            {{ (is_array($p['related_sales']) ? implode(', ', $p['related_sales']) : collect($p['related_sales'])->implode(', ')) ?: 'Abono General' }}
                        </td>
                        <td style="font-size: 9.5px;">
                            {{ (is_array($p['payment_methods']) ? implode(', ', $p['payment_methods']) : collect($p['payment_methods'])->implode(', ')) ?: 'Efectivo' }}
                        </td>
                        <td style="font-size: 9px; color: #475569;">{{ $p['collector_name'] }}</td>
                        <td class="text-right font-mono font-bold" style="color: #059669;">
                            {{ $p['currency_code'] }} {{ number_format($p['total_amount'], 2) }}
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="8" class="text-center" style="padding: 20px; color: #64748b;">
                            No se registraron amortizaciones ni cobros en este período.
                        </td>
                    </tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td colspan="7" class="text-right font-bold">TOTAL GENERAL RECAUDADO (PEN):</td>
                    <td class="text-right font-mono font-bold" style="color: #059669; font-size: 11px;">
                        S/ {{ number_format($report['total_collected_pen'], 2) }}
                    </td>
                </tr>
                @if($report['total_collected_usd'] > 0)
                    <tr class="total-row">
                        <td colspan="7" class="text-right font-bold">TOTAL GENERAL RECAUDADO (USD):</td>
                        <td class="text-right font-mono font-bold" style="color: #059669; font-size: 11px;">
                            $ {{ number_format($report['total_collected_usd'], 2) }}
                        </td>
                    </tr>
                @endif
            </tfoot>
        </table>

        <!-- Signatures -->
        <div class="signatures-container">
            <div class="sign-box">
                <div class="sign-name">{{ $user->name ?? 'Responsable de Cobranzas' }}</div>
                <div class="sign-role">Cajero(a) / Gestor de Cobranzas</div>
            </div>
            <div class="sign-box">
                <div class="sign-name">Administración / Tesorería</div>
                <div class="sign-role">V°B° Conforme y Liquidado</div>
            </div>
        </div>

        <div class="footer-note">
            Documento administrativo interno emitido por el Sistema de Gestión Inversiones Huarcaya el {{ $generatedAt }}.
        </div>
    </div>

</body>
</html>
