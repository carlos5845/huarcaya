<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guía de Remisión Remitente - {{ $guideSeries }}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #1a202c;
            background-color: #f7fafc;
            padding: 20px;
        }
        .page {
            background: #fff;
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 10mm 14mm;
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

        .header-table {
            width: 100%;
            margin-bottom: 8px;
            border-collapse: collapse;
        }
        .company-name {
            font-size: 15px;
            font-weight: 800;
            color: #1a365d;
            text-transform: uppercase;
        }
        .company-desc {
            font-size: 9px;
            color: #4a5568;
            margin-top: 3px;
            line-height: 1.3;
        }
        .sunat-box {
            border: 2px solid #2d3748;
            border-radius: 6px;
            padding: 8px 12px;
            text-align: center;
            background-color: #fff;
        }
        .sunat-ruc {
            font-size: 13px;
            font-weight: bold;
        }
        .sunat-title {
            font-size: 11px;
            font-weight: 800;
            margin: 4px 0;
            color: #1a202c;
            text-transform: uppercase;
            line-height: 1.2;
        }
        .sunat-number {
            font-size: 14px;
            font-weight: 800;
            color: #c53030;
            font-family: monospace;
        }

        .section-box {
            border: 1px solid #a0aec0;
            border-radius: 4px;
            margin-bottom: 8px;
            padding: 6px 8px;
            background-color: #fff;
        }
        .section-title {
            font-size: 9.5px;
            font-weight: bold;
            text-transform: uppercase;
            color: #2b6cb0;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 2px;
            margin-bottom: 4px;
        }

        .info-grid {
            display: table;
            width: 100%;
        }
        .info-row {
            display: table-row;
        }
        .info-cell {
            display: table-cell;
            padding: 2px 4px;
            font-size: 9.5px;
            vertical-align: top;
        }
        .lbl { font-weight: bold; color: #4a5568; }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            margin-bottom: 8px;
        }
        .items-table th {
            background-color: #edf2f7;
            color: #2d3748;
            font-size: 9px;
            text-transform: uppercase;
            padding: 5px 4px;
            border: 1px solid #cbd5e0;
            text-align: left;
        }
        .items-table td {
            padding: 4px 5px;
            border: 1px solid #e2e8f0;
            font-size: 9.5px;
            vertical-align: middle;
        }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: bold; }

        /* QR y pie */
        .bottom-table {
            width: 100%;
            margin-top: 10px;
            border-collapse: collapse;
        }
        .qr-placeholder {
            width: 85px;
            height: 85px;
            border: 1px solid #718096;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 8px;
            background-color: #f7fafc;
            padding: 4px;
            font-family: monospace;
        }
        .disclaimer-text {
            font-size: 8px;
            color: #718096;
            line-height: 1.3;
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
            <strong>Guía de Remisión Remitente (Traslado Interno)</strong> &bull; {{ $guideSeries }}
        </div>
        <div style="display: flex; gap: 8px;">
            <a href="javascript:window.print()" class="btn btn-primary">
                🖨️ Imprimir Formato SUNAT
            </a>
            <a href="javascript:window.close()" class="btn btn-secondary">
                ✕ Cerrar
            </a>
        </div>
    </div>

    <div class="page">
        <!-- Header -->
        <table class="header-table">
            <tr>
                <td style="width: 62%; vertical-align: top;">
                    <div class="company-name">{{ $company->business_name ?? 'INVERSIONES HUARCAYA S.A.C.' }}</div>
                    <div class="company-desc">
                        <strong>Comercialización y Distribución de Repuestos Automotrices</strong><br>
                        {{ $company->address ?? 'Oficina Central' }}<br>
                        Email: {{ $company->email ?? 'contacto@huarcaya.com' }} &bull; Teléf: {{ $company->phone ?? '-' }}
                    </div>
                </td>
                <td style="width: 38%; vertical-align: top;">
                    <div class="sunat-box">
                        <div class="sunat-ruc">R.U.C. {{ $company->document_number ?? '20600000000' }}</div>
                        <div class="sunat-title">GUÍA DE REMISIÓN ELECTRÓNICA<br>REMITENTE</div>
                        <div class="sunat-number">{{ $guideSeries }}</div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Datos de Traslado -->
        <div class="section-box">
            <div class="section-title">1. Datos Generales del Traslado</div>
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-cell" style="width: 33%;">
                        <span class="lbl">Fecha Emisión:</span> {{ now()->format('d/m/Y') }}
                    </div>
                    <div class="info-cell" style="width: 33%;">
                        <span class="lbl">Fecha Inicio Traslado:</span> {{ $transfer->request_date ? $transfer->request_date->format('d/m/Y') : now()->format('d/m/Y') }}
                    </div>
                    <div class="info-cell" style="width: 34%;">
                        <span class="lbl">Doc. Referencia:</span> <span class="font-mono font-bold">{{ $transfer->transfer_number }}</span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-cell" colspan="2">
                        <span class="lbl">Motivo de Traslado:</span> 
                        <strong>04 - TRASLADO ENTRE ESTABLECIMIENTOS DE LA MISMA EMPRESA</strong>
                    </div>
                    <div class="info-cell">
                        <span class="lbl">Modalidad de Transporte:</span> 
                        {{ $latestShipment && $latestShipment->carrier_name ? 'TRANSPORTE PÚBLICO' : 'TRANSPORTE PRIVADO' }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Puntos de Partida y Llegada -->
        <div class="section-box">
            <div class="section-title">2. Punto de Partida y Punto de Llegada</div>
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-cell" style="width: 50%; border-right: 1px dashed #cbd5e0;">
                        <span class="lbl">PUNTO DE PARTIDA (ORIGEN):</span><br>
                        <strong>{{ $transfer->sourceBranch->name ?? '-' }}</strong><br>
                        {{ $transfer->sourceBranch->address ?? 'Dirección de partida' }}<br>
                        <span style="font-size: 9px; color: #4a5568;">
                            Ubigeo: {{ $transfer->sourceBranch->district ?? '-' }} - {{ $transfer->sourceBranch->province ?? '-' }} ({{ $transfer->sourceBranch->department ?? 'Perú' }})
                        </span>
                    </div>
                    <div class="info-cell" style="width: 50%; padding-left: 8px;">
                        <span class="lbl">PUNTO DE LLEGADA (DESTINO):</span><br>
                        <strong>{{ $transfer->destinationBranch->name ?? '-' }}</strong><br>
                        {{ $transfer->destinationBranch->address ?? 'Dirección de destino' }}<br>
                        <span style="font-size: 9px; color: #4a5568;">
                            Ubigeo: {{ $transfer->destinationBranch->district ?? '-' }} - {{ $transfer->destinationBranch->province ?? '-' }} ({{ $transfer->destinationBranch->department ?? 'Perú' }})
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Datos del Transporte y Conductor -->
        <div class="section-box">
            <div class="section-title">3. Datos del Transporte y Vehículo</div>
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-cell" style="width: 35%;">
                        <span class="lbl">Transportista / Chofer:</span> 
                        {{ $latestShipment->carrier_name ?? 'Movilidad Interna Huarcaya' }}
                    </div>
                    <div class="info-cell" style="width: 35%;">
                        <span class="lbl">N° Guía / Tracking:</span> 
                        {{ $latestShipment->tracking_number ?? $transfer->transfer_number }}
                    </div>
                    <div class="info-cell" style="width: 30%;">
                        <span class="lbl">N° Placa del Vehículo:</span> 
                        ____________________
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-cell">
                        <span class="lbl">Licencia de Conducir:</span> ____________________
                    </div>
                    <div class="info-cell">
                        <span class="lbl">Peso Bruto Total (KGM):</span> Estimado &lt; 500 Kg
                    </div>
                    <div class="info-cell">
                        <span class="lbl">Número de Bultos / Paquetes:</span> {{ count($transfer->lines) }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Detalle de Bienes Trasladados -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 25px;" class="text-center">Ítem</th>
                    <th style="width: 85px;">Código SUNAT / SKU</th>
                    <th style="width: 85px;">Ref. Fábrica</th>
                    <th>Descripción Detallada del Bien</th>
                    <th style="width: 75px;">Marca</th>
                    <th style="width: 45px;" class="text-center">U.M.</th>
                    <th style="width: 60px;" class="text-right">Cantidad</th>
                </tr>
            </thead>
            <tbody>
                @foreach($transfer->lines as $idx => $line)
                    @php
                        $qty = $line->shipped_quantity > 0 ? $line->shipped_quantity : $line->requested_quantity;
                    @endphp
                    <tr>
                        <td class="text-center">{{ $idx + 1 }}</td>
                        <td class="font-mono font-bold">{{ $line->product->internal_code ?? ('SKU-'.$line->product_id) }}</td>
                        <td class="font-mono">{{ $line->product->primary_reference ?? '-' }}</td>
                        <td>{{ $line->product->name ?? 'Repuesto automotriz' }}</td>
                        <td>{{ $line->product->brand->name ?? '-' }}</td>
                        <td class="text-center">{{ $line->product->unit->code ?? 'NIU' }}</td>
                        <td class="text-right font-mono font-bold">{{ number_format($qty, 0) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <!-- QR Code y Firmas SUNAT -->
        <table class="bottom-table">
            <tr>
                <td style="width: 95px; vertical-align: top;">
                    <div class="qr-placeholder">
                        [CÓDIGO QR<br>
                        OFICIAL SUNAT<br>
                        T09|{{ $guideSeries }}]
                    </div>
                </td>
                <td style="vertical-align: top; padding-left: 10px;">
                    <div class="disclaimer-text">
                        <strong>REPRESENTACIÓN IMPRESA DE LA GUÍA DE REMISIÓN ELECTRÓNICA - REMITENTE</strong><br>
                        Autorizado mediante Resolución de Superintendencia N° 123-2022/SUNAT.<br>
                        El remitente declara bajo juramento que los datos consignados en el presente comprobante corresponden fielmente a los bienes trasladados para uso y custodia entre establecimientos comerciales de Inversiones Huarcaya.<br>
                        <span style="font-family: monospace;">Hash / Digest: {{ hash('sha256', $transfer->transfer_number . now()) }}</span>
                    </div>

                    <div style="display: flex; gap: 40px; margin-top: 25px;">
                        <div style="flex: 1; border-top: 1px solid #000; text-align: center; font-size: 8.5px; padding-top: 3px;">
                            <strong>DESPACHADOR RESPONSABLE</strong><br>
                            DNI: _______________________
                        </div>
                        <div style="flex: 1; border-top: 1px solid #000; text-align: center; font-size: 8.5px; padding-top: 3px;">
                            <strong>CONDUCTOR / TRANSPORTISTA</strong><br>
                            DNI: _______________________
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
