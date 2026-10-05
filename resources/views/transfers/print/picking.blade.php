<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hoja de Picking - {{ $transfer->transfer_number }}</title>
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
        .btn-primary { background-color: #3182ce; color: #fff; }
        .btn-secondary { background-color: #4a5568; color: #fff; }

        .header-box {
            border: 2px solid #4a5568;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #edf2f7;
        }
        .doc-title {
            font-size: 16px;
            font-weight: 800;
            color: #2d3748;
            text-transform: uppercase;
        }
        .doc-sub {
            font-size: 10.5px;
            color: #4a5568;
            margin-top: 2px;
        }
        .doc-number {
            font-size: 16px;
            font-weight: 800;
            color: #2b6cb0;
            font-family: monospace;
            text-align: right;
        }

        .meta-grid {
            display: table;
            width: 100%;
            margin-bottom: 15px;
            border-collapse: separate;
            border-spacing: 8px 0;
        }
        .meta-col {
            display: table-cell;
            width: 50%;
            border: 1px solid #cbd5e0;
            border-radius: 4px;
            padding: 6px 10px;
            background-color: #fff;
            font-size: 10px;
        }

        .category-header {
            background-color: #e2e8f0;
            color: #2d3748;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            padding: 5px 8px;
            margin-top: 12px;
            margin-bottom: 4px;
            border-left: 4px solid #3182ce;
            border-radius: 2px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        .items-table th {
            background-color: #4a5568;
            color: #fff;
            font-size: 9px;
            text-transform: uppercase;
            padding: 5px;
            border: 1px solid #4a5568;
            text-align: left;
        }
        .items-table td {
            padding: 6px 5px;
            border: 1px solid #cbd5e0;
            font-size: 10px;
            vertical-align: middle;
        }
        .check-square {
            width: 16px;
            height: 16px;
            border: 1.5px solid #2d3748;
            margin: 0 auto;
            border-radius: 2px;
        }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: bold; }

        .signatures-box {
            display: table;
            width: 100%;
            margin-top: 35px;
            border-collapse: separate;
            border-spacing: 20px 0;
        }
        .sig-col {
            display: table-cell;
            width: 50%;
            text-align: center;
        }
        .sig-line {
            border-top: 1px solid #000;
            margin-bottom: 4px;
            padding-top: 4px;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
        }

        @media print {
            @page {
                size: A4 portrait;
                margin: 8mm 10mm;
            }
            body {
                background: none;
                padding: 0;
            }
            .page {
                box-shadow: none;
                padding: 0;
                max-width: 100%;
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
            <strong>Hoja de Picking / Armado de Carga</strong> &bull; {{ $transfer->transfer_number }}
        </div>
        <div style="display: flex; gap: 8px;">
            <a href="javascript:window.print()" class="btn btn-primary">
                🖨️ Imprimir Hoja de Picking
            </a>
            <button type="button" onclick="if(window.parent !== window){ window.parent.postMessage('close-preview', '*'); } else { window.close(); }" class="btn btn-secondary">
                ✕ Cerrar
            </button>
        </div>
    </div>

    <div class="page">
        <div class="header-box">
            <div style="display: flex; align-items: center; gap: 14px;">
                <!-- LOGOTIPO DE LA MARCA -->
                <img src="{{ asset('logo-text.png') }}" alt="Logo" style="max-height: 44px; max-width: 180px; object-fit: contain;" />
                <div>
                    <div class="doc-title">HOJA DE PICKING &bull; PREPARACIÓN DE ALMACÉN</div>
                    <div class="doc-sub">Lista de recolección de estantería para despacho intersucursales</div>
                </div>
            </div>
            <div>
                <div class="doc-number">{{ $transfer->transfer_number }}</div>
                <div style="font-size: 10px; color: #718096; text-align: right;">{{ now()->format('d/m/Y H:i') }}</div>
            </div>
        </div>

        <div class="meta-grid">
            <div class="meta-col">
                <strong>📤 ALMACÉN DE RECOLECCIÓN (ORIGEN):</strong><br>
                <span class="font-bold" style="font-size: 11px;">{{ $transfer->sourceBranch->name ?? '-' }}</span><br>
                {{ $transfer->sourceBranch->address ?? '' }}
            </div>
            <div class="meta-col">
                <strong>📥 SUCURSAL DESTINO RECEPTORA:</strong><br>
                <span class="font-bold" style="font-size: 11px;">{{ $transfer->destinationBranch->name ?? '-' }}</span><br>
                {{ $transfer->destinationBranch->address ?? '' }}
            </div>
        </div>

        @foreach($groupedLines as $categoryName => $lines)
            <div class="category-header">
                📂 Categoría: {{ $categoryName }} ({{ count($lines) }} repuestos)
            </div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 30px;" class="text-center">Recolectado</th>
                        <th style="width: 85px;">Código / SKU</th>
                        <th style="width: 85px;">Ref. Fábrica</th>
                        <th>Descripción del Repuesto</th>
                        <th style="width: 75px;">Marca</th>
                        <th style="width: 40px;" class="text-center">U.M.</th>
                        <th style="width: 60px;" class="text-right">A Recoger</th>
                        <th style="width: 100px;">Observación Física</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($lines as $line)
                        <tr>
                            <td class="text-center">
                                <div class="check-square"></div>
                            </td>
                            <td class="font-mono font-bold">{{ $line->product->internal_code ?? ('SKU-'.$line->product_id) }}</td>
                            <td class="font-mono text-muted">{{ $line->product->primary_reference ?? '-' }}</td>
                            <td>
                                <strong>{{ $line->product->name ?? 'Repuesto' }}</strong>
                            </td>
                            <td>{{ $line->product->brand->name ?? '-' }}</td>
                            <td class="text-center">{{ $line->product->unit->code ?? 'NIU' }}</td>
                            <td class="text-right font-mono font-bold" style="font-size: 12px; color: #2b6cb0;">
                                {{ number_format($line->requested_quantity, 0) }}
                            </td>
                            <td style="border-bottom: 1px dotted #a0aec0;"></td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endforeach

        <div style="background-color: #edf2f7; border: 1px solid #cbd5e0; padding: 6px 12px; border-radius: 4px; margin-top: 15px; font-weight: bold; font-size: 11px; display: flex; justify-content: space-between;">
            <span>TOTAL REFERENCIAS A RECOLECTAR: {{ count($transfer->lines) }}</span>
            <span>TOTAL UNIDADES A EMBALAR: {{ number_format($transfer->lines->sum('requested_quantity'), 0) }}</span>
        </div>

        <div class="signatures-box">
            <div class="sig-col">
                <div style="height: 45px;"></div>
                <div class="sig-line">Preparado por (Almacenero)</div>
                <div style="font-size: 9px; color: #718096;">Nombre y Firma de Recolección</div>
            </div>
            <div class="sig-col">
                <div style="height: 45px;"></div>
                <div class="sig-line">Verificado y Embalado por (Supervisor)</div>
                <div style="font-size: 9px; color: #718096;">Nombre y Sello de Salida</div>
            </div>
        </div>
    </div>

</body>
</html>
