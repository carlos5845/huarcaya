<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $report['title'] ?? 'Reporte Ejecutivo' }} - Inversiones Huarcaya</title>
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
            background: #2d3748;
            color: #fff;
            padding: 10px 16px;
            border-radius: 6px;
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
            background-color: #3182ce;
            color: #fff;
        }
        .btn-secondary {
            background-color: #718096;
            color: #fff;
        }
        .header-table {
            width: 100%;
            margin-bottom: 15px;
            border-bottom: 2px solid #2b6cb0;
            padding-bottom: 12px;
        }
        .company-title {
            font-size: 15px;
            font-weight: bold;
            color: #2b6cb0;
        }
        .company-subtitle {
            font-size: 10px;
            color: #4a5568;
            margin-top: 2px;
        }
        .doc-box {
            border: 1.5px solid #2b6cb0;
            border-radius: 6px;
            padding: 8px 12px;
            text-align: center;
            background-color: #f7fafc;
        }
        .doc-box-title {
            font-size: 12px;
            font-weight: 800;
            color: #2b6cb0;
            text-transform: uppercase;
        }
        .meta-grid {
            display: flex;
            gap: 15px;
            background: #edf2f7;
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 12px;
            font-size: 10.5px;
        }
        .meta-item {
            flex: 1;
        }
        .meta-item strong {
            color: #2d3748;
        }
        .kpis-grid {
            display: flex;
            gap: 10px;
            margin-bottom: 14px;
        }
        .kpi-card {
            flex: 1;
            border: 1px solid #cbd5e0;
            border-radius: 4px;
            padding: 8px 10px;
            background: #f7fafc;
        }
        .kpi-label {
            font-size: 9px;
            text-transform: uppercase;
            color: #718096;
            font-weight: bold;
        }
        .kpi-val {
            font-size: 14px;
            font-weight: bold;
            color: #2b6cb0;
            margin-top: 3px;
        }
        .report-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .report-table th {
            background-color: #2b6cb0;
            color: #fff;
            font-size: 9px;
            text-transform: uppercase;
            padding: 6px 5px;
            border: 1px solid #2b6cb0;
            text-align: left;
        }
        .report-table td {
            padding: 5px 6px;
            border: 1px solid #cbd5e0;
            font-size: 9.5px;
            vertical-align: middle;
        }
        .report-table tr:nth-child(even) {
            background-color: #f7fafc;
        }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .footer {
            margin-top: 25px;
            font-size: 9px;
            color: #718096;
            text-align: center;
            border-top: 1px dashed #cbd5e0;
            padding-top: 10px;
        }

        @media print {
            body {
                background: none;
                padding: 0;
            }
            .page {
                box-shadow: none;
                padding: 0;
                max-width: 100%;
                min-height: auto;
            }
            .no-print-bar {
                display: none !important;
            }
        }
    </style>
</head>
<body>

    <div class="no-print-bar">
        <div>
            <strong>{{ $report['title'] ?? 'Reporte' }}</strong> &bull; Inversiones Huarcaya
        </div>
        <div style="display: flex; gap: 8px;">
            <a href="javascript:window.print()" class="btn btn-primary">
                🖨️ Imprimir / Guardar PDF
            </a>
            <button type="button" onclick="if(window.parent !== window){ window.parent.postMessage('close-preview', '*'); } else { window.close(); }" class="btn btn-secondary">
                ✕ Cerrar
            </button>
        </div>
    </div>

    <div class="page">
        <!-- Encabezado con Logotipo -->
        <table class="header-table">
            <tr>
                <td style="width: 65%; vertical-align: top;">
                    <img src="{{ asset('logo-text.png') }}" alt="{{ $company->business_name ?? 'Inversiones Huarcaya' }}" style="max-height: 44px; max-width: 220px; object-fit: contain; margin-bottom: 5px; display: block;" />
                    <div class="company-title">{{ $company->business_name ?? $company->name ?? 'INVERSIONES HUARCAYA S.A.C.' }}</div>
                    <div class="company-subtitle">
                        R.U.C. N° {{ $company->document_number ?? '20600000000' }} &bull; {{ $company->address ?? 'Oficina Principal' }}<br>
                        Teléfono: {{ $company->phone ?? '-' }} &bull; Email: {{ $company->email ?? '-' }}
                    </div>
                </td>
                <td style="width: 35%; vertical-align: top;">
                    <div class="doc-box">
                        <div class="doc-box-title">{{ $report['title'] ?? 'REPORTE' }}</div>
                        <div style="font-size: 9px; color: #4a5568; margin-top: 4px;">EMITIDO EL: {{ $generatedAt }}</div>
                        <div style="font-size: 9px; color: #4a5568;">USUARIO: {{ $user->name ?? 'Sistema' }}</div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Parámetros del Reporte -->
        <div class="meta-grid">
            <div class="meta-item">
                <strong>Ámbito / Sucursal:</strong> {{ $branchName }}
            </div>
            @if(!empty($filters['date_from']) || !empty($filters['date_to']))
            <div class="meta-item">
                <strong>Período:</strong> {{ $filters['date_from'] ?? 'Inicio' }} al {{ $filters['date_to'] ?? 'Hoy' }}
            </div>
            @endif
            @if(!empty($filters['search']))
            <div class="meta-item">
                <strong>Búsqueda:</strong> "{{ $filters['search'] }}"
            </div>
            @endif
        </div>

        <!-- KPIs Resumen -->
        @if(!empty($report['kpis']))
        <div class="kpis-grid">
            @foreach($report['kpis'] as $kpi)
            <div class="kpi-card">
                <div class="kpi-label">{{ $kpi['label'] }}</div>
                <div class="kpi-val">{{ $kpi['value'] }}</div>
            </div>
            @endforeach
        </div>
        @endif

        <!-- Tabla de Datos -->
        <table class="report-table">
            <thead>
                <tr>
                    @foreach($report['columns'] as $col)
                    <th class="{{ ($col['align'] ?? '') === 'right' ? 'text-right' : '' }}">
                        {{ $col['label'] }}
                    </th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @forelse($report['rows'] as $row)
                <tr>
                    @foreach($report['columns'] as $col)
                    <td class="{{ ($col['align'] ?? '') === 'right' ? 'text-right' : '' }}">
                        {{ $row[$col['key']] ?? '-' }}
                    </td>
                    @endforeach
                </tr>
                @empty
                <tr>
                    <td colspan="{{ count($report['columns']) }}" class="text-center" style="padding: 20px; color: #718096;">
                        No se encontraron registros para los filtros seleccionados.
                    </td>
                </tr>
                @endforelse
            </tbody>
        </table>

        <div class="footer">
            Documento emitido internamente por Inversiones Huarcaya S.A.C. &bull; Sistema Integrado de Gestión Empresarial
        </div>
    </div>

</body>
</html>
