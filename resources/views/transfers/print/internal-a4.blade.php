<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nota de Traslado Interno - {{ $transfer->transfer_number }}</title>
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
        .btn-primary:hover {
            background-color: #2b6cb0;
        }
        .btn-secondary {
            background-color: #4a5568;
            color: #fff;
        }

        /* Encabezado */
        .header-table {
            width: 100%;
            margin-bottom: 12px;
            border-collapse: collapse;
        }
        .company-title {
            font-size: 16px;
            font-weight: 800;
            color: #1a365d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .company-subtitle {
            font-size: 10px;
            color: #4a5568;
            margin-top: 2px;
        }
        .doc-box {
            border: 2px solid #2b6cb0;
            border-radius: 6px;
            padding: 8px 12px;
            text-align: center;
            background-color: #ebf8ff;
        }
        .doc-box-ruc {
            font-size: 12px;
            font-weight: bold;
            color: #2d3748;
        }
        .doc-box-title {
            font-size: 13px;
            font-weight: 800;
            color: #2b6cb0;
            text-transform: uppercase;
            margin: 3px 0;
        }
        .doc-box-number {
            font-size: 15px;
            font-weight: 800;
            color: #e53e3e;
            font-family: monospace;
        }

        /* Bloques Origen y Destino */
        .locations-grid {
            display: table;
            width: 100%;
            margin-bottom: 12px;
            border-collapse: separate;
            border-spacing: 8px 0;
        }
        .location-col {
            display: table-cell;
            width: 50%;
            border: 1px solid #cbd5e0;
            border-radius: 5px;
            padding: 8px 10px;
            background-color: #fff;
            vertical-align: top;
        }
        .location-title {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            color: #2b6cb0;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
            margin-bottom: 5px;
        }
        .field-row {
            margin-bottom: 3px;
            font-size: 10px;
        }
        .field-label {
            font-weight: bold;
            color: #4a5568;
            display: inline-block;
            width: 75px;
        }
        .field-value {
            color: #1a202c;
        }

        /* Metadatos */
        .meta-bar {
            width: 100%;
            background-color: #edf2f7;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 6px 10px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
        }

        /* Tabla de Repuestos */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .items-table th {
            background-color: #2b6cb0;
            color: #fff;
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 6px 5px;
            border: 1px solid #2b6cb0;
            text-align: left;
        }
        .items-table td {
            padding: 5px 6px;
            border: 1px solid #cbd5e0;
            font-size: 10px;
            vertical-align: middle;
        }
        .items-table tr:nth-child(even) {
            background-color: #f7fafc;
        }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: bold; }

        /* Checklist boxes */
        .check-box {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 1px solid #4a5568;
            margin-right: 2px;
            vertical-align: middle;
        }

        /* Resumen */
        .summary-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #ebf8ff;
            border: 1px solid #bee3f8;
            border-radius: 4px;
            padding: 6px 12px;
            margin-bottom: 15px;
            font-size: 11px;
            font-weight: bold;
        }

        /* Observaciones */
        .notes-box {
            border: 1px dashed #a0aec0;
            border-radius: 4px;
            padding: 6px 10px;
            margin-bottom: 25px;
            font-size: 10px;
            background-color: #fff;
        }

        /* Firmas */
        .signatures-grid {
            display: table;
            width: 100%;
            margin-top: 30px;
            border-collapse: separate;
            border-spacing: 15px 0;
        }
        .signature-col {
            display: table-cell;
            width: 33.33%;
            text-align: center;
            vertical-align: top;
        }
        .signature-line {
            border-top: 1px solid #2d3748;
            margin-bottom: 5px;
            padding-top: 4px;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
        }
        .signature-sub {
            font-size: 9px;
            color: #718096;
        }

        .footer-note {
            text-align: center;
            font-size: 8.5px;
            color: #a0aec0;
            margin-top: 25px;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
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
            <strong>Nota de Traslado Interno / Guía de Transferencia</strong> &bull; {{ $transfer->transfer_number }}
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
        <!-- Encabezado -->
        <table class="header-table">
            <tr>
                <td style="width: 60%; vertical-align: top;">
                    <!-- LOGOTIPO DE LA MARCA -->
                    <img src="{{ asset('logo-text.png') }}" alt="{{ $company->business_name ?? 'Inversiones Huarcaya' }}" style="max-height: 48px; max-width: 220px; object-fit: contain; margin-bottom: 6px; display: block;" />
                    <div class="company-title">{{ $company->business_name ?? $company->name ?? 'INVERSIONES HUARCAYA S.A.C.' }}</div>
                    <div class="company-subtitle">
                        <strong>Venta de Repuestos Automotrices y Transporte Logístico</strong><br>
                        {{ $company->address ?? 'Oficina Principal - Perú' }}<br>
                        Teléfono: {{ $company->phone ?? '-' }} &bull; Email: {{ $company->email ?? '-' }}
                    </div>
                </td>
                <td style="width: 40%; vertical-align: top;">
                    <div class="doc-box">
                        <div class="doc-box-ruc">R.U.C. N° {{ $company->document_number ?? '20600000000' }}</div>
                        <div class="doc-box-title">NOTA DE TRASLADO INTERNO</div>
                        <div style="font-size: 9px; color: #4a5568; margin-bottom: 2px;">GUÍA DE TRANSFERENCIA ENTRE SEDES</div>
                        <div class="doc-box-number">{{ $transfer->transfer_number }}</div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Metadatos de la Operación -->
        <div class="meta-bar">
            <div>
                <strong>Fecha Solicitud:</strong> {{ $transfer->request_date ? $transfer->request_date->format('d/m/Y H:i') : $transfer->created_at->format('d/m/Y H:i') }}
            </div>
            <div>
                <strong>Estado:</strong> 
                @if($transfer->status === 'DRAFT') SOLICITADO (BORRADOR)
                @elseif($transfer->status === 'IN_TRANSIT') EN TRÁNSITO / DESPACHADO
                @elseif($transfer->status === 'COMPLETED') COMPLETADO / RECEPCIONADO
                @elseif($transfer->status === 'WITH_DISCREPANCY') CON DISCREPANCIAS
                @else {{ $transfer->status }}
                @endif
            </div>
            <div>
                <strong>Despachado por:</strong> {{ $transfer->creator->name ?? 'Sistema' }}
            </div>
        </div>

        <!-- Origen y Destino -->
        <div class="locations-grid">
            <!-- Origen -->
            <div class="location-col">
                <div class="location-title">📤 1. Sede de Origen (Punto de Partida)</div>
                <div class="field-row">
                    <span class="field-label">Sucursal:</span>
                    <span class="field-value font-bold">{{ $transfer->sourceBranch->name ?? 'Sucursal Origen' }}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Dirección:</span>
                    <span class="field-value">{{ $transfer->sourceBranch->address ?? 'Dirección no registrada' }}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Ubicación:</span>
                    <span class="field-value">
                        {{ $transfer->sourceBranch->district ?? '-' }}, {{ $transfer->sourceBranch->province ?? '-' }} ({{ $transfer->sourceBranch->department ?? 'Perú' }})
                    </span>
                </div>
                <div class="field-row">
                    <span class="field-label">Teléfono:</span>
                    <span class="field-value">{{ $transfer->sourceBranch->phone ?? '-' }}</span>
                </div>
            </div>

            <!-- Destino -->
            <div class="location-col">
                <div class="location-title">📥 2. Sede de Destino (Punto de Llegada)</div>
                <div class="field-row">
                    <span class="field-label">Sucursal:</span>
                    <span class="field-value font-bold">{{ $transfer->destinationBranch->name ?? 'Sucursal Destino' }}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Dirección:</span>
                    <span class="field-value">{{ $transfer->destinationBranch->address ?? 'Dirección no registrada' }}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Ubicación:</span>
                    <span class="field-value">
                        {{ $transfer->destinationBranch->district ?? '-' }}, {{ $transfer->destinationBranch->province ?? '-' }} ({{ $transfer->destinationBranch->department ?? 'Perú' }})
                    </span>
                </div>
                <div class="field-row">
                    <span class="field-label">Teléfono:</span>
                    <span class="field-value">{{ $transfer->destinationBranch->phone ?? '-' }}</span>
                </div>
            </div>
        </div>

        <!-- Tabla de Repuestos -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 25px;" class="text-center">N°</th>
                    <th style="width: 85px;">Código / SKU</th>
                    <th style="width: 80px;">Ref. Fábrica</th>
                    <th>Descripción del Repuesto</th>
                    <th style="width: 75px;">Marca</th>
                    <th style="width: 45px;" class="text-center">U.M.</th>
                    <th style="width: 55px;" class="text-right">Solic.</th>
                    <th style="width: 55px;" class="text-right">Desp.</th>
                    <th style="width: 75px;" class="text-center">Recepción</th>
                </tr>
            </thead>
            <tbody>
                @forelse($transfer->lines as $index => $line)
                    @php
                        $shipped = $line->shipped_quantity > 0 ? $line->shipped_quantity : $line->requested_quantity;
                    @endphp
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        <td class="font-mono font-bold">{{ $line->product->internal_code ?? ('SKU-'.$line->product_id) }}</td>
                        <td class="font-mono text-muted">{{ $line->product->primary_reference ?? '-' }}</td>
                        <td>
                            <strong>{{ $line->product->name ?? 'Repuesto' }}</strong>
                            @if($line->notes)
                                <div style="font-size: 9px; color: #718096; font-style: italic;">Obs: {{ $line->notes }}</div>
                            @endif
                        </td>
                        <td>{{ $line->product->brand->name ?? '-' }}</td>
                        <td class="text-center">{{ $line->product->unit->code ?? 'NIU' }}</td>
                        <td class="text-right font-mono">{{ number_format($line->requested_quantity, 0) }}</td>
                        <td class="text-right font-mono font-bold">{{ number_format($shipped, 0) }}</td>
                        <td class="text-center" style="font-size: 8.5px; white-space: nowrap;">
                            <span class="check-box"></span> OK &nbsp; <span class="check-box"></span> Obs
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="9" class="text-center" style="padding: 15px;">No se registraron líneas en esta transferencia.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <!-- Resumen -->
        <div class="summary-bar">
            <div>
                Total de Ítems / Referencias: <span>{{ count($transfer->lines) }}</span>
            </div>
            <div>
                Total Unidades Físicas Despachadas: 
                <span class="font-mono" style="font-size: 13px; color: #2b6cb0;">
                    {{ number_format($transfer->lines->sum(function($l) { return $l->shipped_quantity > 0 ? $l->shipped_quantity : $l->requested_quantity; }), 0) }} unidades
                </span>
            </div>
        </div>

        <!-- Observaciones -->
        <div class="notes-box">
            <strong>Observaciones de Traslado:</strong> 
            {{ $transfer->notes ?: 'Sin observaciones adicionales registradas.' }}
        </div>

        <!-- Bloque de Firmas Físicas Obligatorias -->
        <div class="signatures-grid">
            <div class="signature-col">
                <div style="height: 50px;"></div>
                <div class="signature-line">Entregado por (Origen)</div>
                <div class="signature-sub">Firma y Sello de Almacén</div>
                <div class="signature-sub">DNI: _______________________</div>
            </div>
            <div class="signature-col">
                <div style="height: 50px;"></div>
                <div class="signature-line">Transportado por (Chofer)</div>
                <div class="signature-sub">Firma del Transportista</div>
                <div class="signature-sub">Placa / DNI: _________________</div>
            </div>
            <div class="signature-col">
                <div style="height: 50px;"></div>
                <div class="signature-line">Recibido por (Destino)</div>
                <div class="signature-sub">Firma y Sello de Recepción</div>
                <div class="signature-sub">Fecha / Hora: ________________</div>
            </div>
        </div>

        <div class="footer-note">
            Documento para control logístico interno entre sedes de Inversiones Huarcaya. No tiene validez fiscal como factura ni comprobante de pago tributario.
        </div>
    </div>

</body>
</html>
