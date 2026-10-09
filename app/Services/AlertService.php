<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Branch;
use App\Models\Company;
use App\Models\Conflict;
use App\Models\DailyClosing;
use App\Models\Device;
use App\Models\Inventory;
use App\Models\Receivable;
use App\Models\SyncOperation;
use App\Models\Transfer;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class AlertService
{
    /**
     * Formatea cantidades numéricas eliminando ceros decimales innecesarios.
     * Ejemplo: 2.000000 -> "2", 5.00 -> "5", 2.500000 -> "2.5", 2.75 -> "2.75"
     */
    protected function formatQty(float|int|string|null $qty): string
    {
        if ($qty === null || $qty === '') {
            return '0';
        }
        $val = (float) $qty;
        if (floor($val) == $val) {
            return (string) ((int) $val);
        }

        return rtrim(rtrim(number_format($val, 2, '.', ''), '0'), '.');
    }

    /**
     * Sincroniza y obtiene las alertas activas para el usuario dado y sucursal opcional.
     */
    public function getAlertsForUser(User $user, ?int $branchId = null, array $filters = []): array
    {
        $company = Company::first();
        if (! $company) {
            return [
                'alerts' => [],
                'kpis' => [
                    'critical' => 0,
                    'warning' => 0,
                    'info' => 0,
                    'total' => 0,
                    'unread' => 0,
                ],
            ];
        }

        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $isSuperAdmin
            ? Branch::where('status', 'ACTIVE')->pluck('id')->toArray()
            : $user->branches()->where('branches.status', 'ACTIVE')->pluck('branches.id')->toArray();

        if (empty($allowedBranchIds) && ! $isSuperAdmin && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        if ($branchId && in_array($branchId, $allowedBranchIds)) {
            $scopeBranchIds = [$branchId];
        } else {
            $scopeBranchIds = $allowedBranchIds;
        }

        // Ejecutar el escaneo de reglas y persistir/actualizar en tabla alerts
        $this->scanAndPersistAlerts($company, $scopeBranchIds);

        // Construir consulta sobre tabla alerts
        $query = Alert::with('branch')
            ->where('company_id', $company->id)
            ->where(function (Builder $q) use ($scopeBranchIds, $isSuperAdmin) {
                $q->whereIn('branch_id', $scopeBranchIds);
                if ($isSuperAdmin) {
                    $q->orWhereNull('branch_id');
                }
            });

        // Filtro por Severidad
        if (! empty($filters['severity']) && in_array($filters['severity'], ['CRITICAL', 'WARNING', 'INFO'])) {
            $query->where('severity', $filters['severity']);
        }

        // Filtro por Tipo de Alerta
        if (! empty($filters['alert_type'])) {
            $query->where('alert_type', $filters['alert_type']);
        }

        // Filtro por Estado de Lectura
        if (isset($filters['status'])) {
            if ($filters['status'] === 'unread') {
                $query->where('is_read', false);
            } elseif ($filters['status'] === 'read') {
                $query->where('is_read', true);
            }
        }

        // Búsqueda por texto
        if (! empty($filters['search'])) {
            $term = '%'.$filters['search'].'%';
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', $term)
                    ->orWhere('message', 'like', $term);
            });
        }

        // KPIs globales para el usuario en su scope
        $baseKpiQuery = Alert::where('company_id', $company->id)
            ->where(function (Builder $q) use ($scopeBranchIds, $isSuperAdmin) {
                $q->whereIn('branch_id', $scopeBranchIds);
                if ($isSuperAdmin) {
                    $q->orWhereNull('branch_id');
                }
            });

        $kpis = [
            'critical' => (clone $baseKpiQuery)->where('severity', 'CRITICAL')->where('is_read', false)->count(),
            'warning' => (clone $baseKpiQuery)->where('severity', 'WARNING')->where('is_read', false)->count(),
            'info' => (clone $baseKpiQuery)->where('severity', 'INFO')->where('is_read', false)->count(),
            'total' => (clone $baseKpiQuery)->count(),
            'unread' => (clone $baseKpiQuery)->where('is_read', false)->count(),
        ];

        $alerts = $query->orderBy('is_read', 'asc')
            ->orderByRaw("CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END")
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return [
            'alerts' => $alerts,
            'kpis' => $kpis,
        ];
    }

    /**
     * Escanea el sistema y genera las alertas operativas correspondientes.
     */
    public function scanAndPersistAlerts(Company $company, array $branchIds): void
    {
        $this->scanOutOfStock($company, $branchIds);
        $this->scanNegativeStock($company, $branchIds);
        $this->scanLowStock($company, $branchIds);
        $this->scanOverdueReceivables($company, $branchIds);
        $this->scanPendingClosings($company, $branchIds);
        $this->scanInventoryDifferences($company, $branchIds);
        $this->scanPendingTransfers($company, $branchIds);
        $this->scanSyncConflicts($company, $branchIds);
        $this->scanPendingOfflineOps($company, $branchIds);
        $this->scanUnknownDevices($company, $branchIds);
    }

    /**
     * 1. Alerta: Producto Agotado (CRITICAL)
     */
    protected function scanOutOfStock(Company $company, array $branchIds): void
    {
        $outOfStocks = Inventory::with(['product.brand', 'product.unit', 'branch'])
            ->whereIn('branch_id', $branchIds)
            ->where('physical_quantity', '<=', 0)
            ->whereHas('product', fn ($q) => $q->where('status', 'ACTIVE'))
            ->get();

        foreach ($outOfStocks as $inv) {
            $dedupKey = "OUT_OF_STOCK_{$inv->branch_id}_{$inv->product_id}";

            $productName = $inv->product?->name ?? 'Repuesto';
            $brandName = $inv->product?->brand?->name;
            $brandText = $brandName ? " (Marca: {$brandName})" : '';
            $branchName = $inv->branch?->name ?? 'Sede Central';
            $unit = strtolower($inv->product?->unit?->name ?? 'unidades');

            $actionUrl = "/inventory?branch_id={$inv->branch_id}&product_id={$inv->product_id}&search=".urlencode($productName);

            $this->upsertAlert(
                company: $company,
                branchId: $inv->branch_id,
                alertType: 'OUT_OF_STOCK',
                severity: 'CRITICAL',
                dedupKey: $dedupKey,
                title: "Repuesto Agotado: {$productName}",
                message: "El repuesto '{$productName}'{$brandText} se ha quedado sin stock (0 {$unit}) en {$branchName}. No es posible realizar ventas hasta que ingrese mercadería de reposición.",
                contextData: [
                    'product_id' => $inv->product_id,
                    'product_name' => $productName,
                    'stock' => 0,
                    'action_url' => $actionUrl,
                    'action_label' => 'Ver en Inventario',
                ]
            );
        }

        // Limpiar alertas de OUT_OF_STOCK para repuestos que ya fueron repuestos
        $resolvedOutOfStocks = Inventory::whereIn('branch_id', $branchIds)
            ->where('physical_quantity', '>', 0)
            ->get(['branch_id', 'product_id']);

        foreach ($resolvedOutOfStocks as $inv) {
            Alert::where('company_id', $company->id)
                ->where('branch_id', $inv->branch_id)
                ->where('alert_type', 'OUT_OF_STOCK')
                ->where('context_data->dedup_key', "OUT_OF_STOCK_{$inv->branch_id}_{$inv->product_id}")
                ->delete();
        }
    }

    /**
     * 2. Alerta: Stock Negativo (CRITICAL)
     */
    protected function scanNegativeStock(Company $company, array $branchIds): void
    {
        $negatives = Inventory::with(['product.brand', 'product.unit', 'branch'])
            ->whereIn('branch_id', $branchIds)
            ->where('physical_quantity', '<', 0)
            ->get();

        foreach ($negatives as $inv) {
            $dedupKey = "NEGATIVE_STOCK_{$inv->branch_id}_{$inv->product_id}";

            $productName = $inv->product?->name ?? 'Repuesto';
            $brandName = $inv->product?->brand?->name;
            $brandText = $brandName ? " (Marca: {$brandName})" : '';
            $branchName = $inv->branch?->name ?? 'Sede Central';
            $cleanStock = $this->formatQty($inv->physical_quantity);
            $unit = strtolower($inv->product?->unit?->name ?? 'unidades');

            $actionUrl = "/kardex?branch_id={$inv->branch_id}&search=".urlencode($productName);

            $this->upsertAlert(
                company: $company,
                branchId: $inv->branch_id,
                alertType: 'NEGATIVE_STOCK',
                severity: 'CRITICAL',
                dedupKey: $dedupKey,
                title: "Stock Negativo Inconsistente: {$productName}",
                message: "El repuesto '{$productName}'{$brandText} registra un saldo negativo de {$cleanStock} {$unit} en {$branchName}. Se requiere realizar un conteo físico y regularizar con un ajuste de inventario.",
                contextData: [
                    'product_id' => $inv->product_id,
                    'product_name' => $productName,
                    'stock' => (float) $inv->physical_quantity,
                    'action_url' => $actionUrl,
                    'action_label' => 'Auditar en Kardex',
                ]
            );
        }

        // Limpiar alertas de stock negativo si el stock se regularizó
        $resolvedNegatives = Inventory::whereIn('branch_id', $branchIds)
            ->where('physical_quantity', '>=', 0)
            ->get(['branch_id', 'product_id']);

        foreach ($resolvedNegatives as $inv) {
            Alert::where('company_id', $company->id)
                ->where('branch_id', $inv->branch_id)
                ->where('alert_type', 'NEGATIVE_STOCK')
                ->where('context_data->dedup_key', "NEGATIVE_STOCK_{$inv->branch_id}_{$inv->product_id}")
                ->delete();
        }
    }

    /**
     * 3. Alerta: Stock Bajo (WARNING)
     */
    protected function scanLowStock(Company $company, array $branchIds): void
    {
        $lowStocks = Inventory::with(['product.minStocks', 'product.brand', 'product.unit', 'branch'])
            ->whereIn('branch_id', $branchIds)
            ->where('physical_quantity', '>', 0)
            ->whereHas('product', fn ($q) => $q->where('status', 'ACTIVE'))
            ->get();

        foreach ($lowStocks as $inv) {
            $minStockConfig = $inv->product?->minStocks
                ?->firstWhere('branch_id', $inv->branch_id)?->minimum_quantity;
            $threshold = $minStockConfig !== null ? (float) $minStockConfig : 5.0;

            if ((float) $inv->physical_quantity <= $threshold) {
                $dedupKey = "LOW_STOCK_{$inv->branch_id}_{$inv->product_id}";

                $productName = $inv->product?->name ?? 'Repuesto';
                $brandName = $inv->product?->brand?->name;
                $brandText = $brandName ? " (Marca: {$brandName})" : '';
                $branchName = $inv->branch?->name ?? 'Sede Central';
                $cleanCurrentStock = $this->formatQty($inv->physical_quantity);
                $cleanMinStock = $this->formatQty($threshold);
                $unit = strtolower($inv->product?->unit?->name ?? 'unidades');

                $actionUrl = "/inventory?branch_id={$inv->branch_id}&product_id={$inv->product_id}&search=".urlencode($productName);

                $this->upsertAlert(
                    company: $company,
                    branchId: $inv->branch_id,
                    alertType: 'LOW_STOCK',
                    severity: 'WARNING',
                    dedupKey: $dedupKey,
                    title: "Stock Bajo por Agotarse: {$productName}",
                    message: "Quedan solo {$cleanCurrentStock} {$unit} de '{$productName}'{$brandText} en {$branchName}, alcanzando el nivel mínimo de seguridad ({$cleanMinStock} {$unit}). Se recomienda reabastecer con una orden de compra preventiva.",
                    contextData: [
                        'product_id' => $inv->product_id,
                        'product_name' => $productName,
                        'current_stock' => (float) $inv->physical_quantity,
                        'min_stock' => $threshold,
                        'action_url' => $actionUrl,
                        'action_label' => 'Ver en Inventario',
                    ]
                );
            } else {
                // Si el stock actual supera el umbral, limpiar la alerta previa
                Alert::where('company_id', $company->id)
                    ->where('branch_id', $inv->branch_id)
                    ->where('alert_type', 'LOW_STOCK')
                    ->where('context_data->dedup_key', "LOW_STOCK_{$inv->branch_id}_{$inv->product_id}")
                    ->delete();
            }
        }
    }

    /**
     * 4. Alerta: Deudas Vencidas (CRITICAL)
     */
    protected function scanOverdueReceivables(Company $company, array $branchIds): void
    {
        $overdue = Receivable::with(['customer', 'sale', 'branch'])
            ->whereIn('branch_id', $branchIds)
            ->where('status', 'ACTIVE')
            ->where('due_date', '<', now()->startOfDay())
            ->where('balance_amount', '>=', 0.01)
            ->get();

        foreach ($overdue as $rec) {
            $dedupKey = "OVERDUE_RECEIVABLE_{$rec->id}";

            $days = (int) Carbon::parse($rec->due_date)->diffInDays(now());
            $customerName = $rec->customer?->legal_name ?? ($rec->customer_name_snapshot ?? 'Cliente General');
            $branchName = $rec->branch?->name ?? 'Sede Central';
            $currSymbol = $rec->currency_code === 'USD' ? '$' : 'S/';
            $balanceFormatted = number_format((float) $rec->balance_amount, 2);
            $saleRef = $rec->sale?->sale_number ? "Venta N° {$rec->sale->sale_number}" : "Crédito #{$rec->id}";
            $daysText = $days === 1 ? '1 día de atraso' : "{$days} días de atraso";

            $this->upsertAlert(
                company: $company,
                branchId: $rec->branch_id,
                alertType: 'OVERDUE_RECEIVABLE',
                severity: 'CRITICAL',
                dedupKey: $dedupKey,
                title: "Cobranza Vencida: {$customerName} ({$currSymbol} {$balanceFormatted})",
                message: "El cliente '{$customerName}' mantiene una deuda vencida de {$currSymbol} {$balanceFormatted} ({$saleRef} en {$branchName}) con {$daysText} sobre la fecha pactada. Se recomienda coordinar la cobranza.",
                contextData: [
                    'receivable_id' => $rec->id,
                    'customer_id' => $rec->customer_id,
                    'balance_amount' => (float) $rec->balance_amount,
                    'due_date' => $rec->due_date?->format('Y-m-d'),
                    'action_url' => "/receivables/{$rec->id}",
                    'action_label' => 'Gestionar Cobranza',
                ]
            );
        }

        // Limpiar alertas de cobranzas que ya no están activas o están pagadas
        $resolvedReceivables = Receivable::whereIn('branch_id', $branchIds)
            ->where(function ($q) {
                $q->where('status', '!=', 'ACTIVE')
                    ->orWhere('balance_amount', '<', 0.01);
            })
            ->pluck('id');

        foreach ($resolvedReceivables as $recId) {
            Alert::where('company_id', $company->id)
                ->where('alert_type', 'OVERDUE_RECEIVABLE')
                ->where('context_data->dedup_key', "OVERDUE_RECEIVABLE_{$recId}")
                ->delete();
        }
    }

    /**
     * 5. Alerta: Cierres Pendientes (WARNING)
     */
    protected function scanPendingClosings(Company $company, array $branchIds): void
    {
        $drafts = DailyClosing::with('branch')
            ->whereIn('branch_id', $branchIds)
            ->whereIn('status', ['OPEN', 'IN_PROGRESS'])
            ->get();

        foreach ($drafts as $closing) {
            $dedupKey = "PENDING_CLOSING_{$closing->id}";

            $branchName = $closing->branch?->name ?? 'Sede Central';
            $closingDateStr = $closing->closing_date?->format('d/m/Y') ?? date('d/m/Y');

            $this->upsertAlert(
                company: $company,
                branchId: $closing->branch_id,
                alertType: 'PENDING_CLOSING',
                severity: 'WARNING',
                dedupKey: $dedupKey,
                title: "Caja Diaria Sin Cerrar: {$branchName} ({$closingDateStr})",
                message: "El turno de caja del día {$closingDateStr} en {$branchName} se encuentra abierto o pendiente de confirmación. Es necesario realizar el arqueo de efectivo y confirmar el cierre diario.",
                contextData: [
                    'closing_id' => $closing->id,
                    'date' => $closing->closing_date?->format('Y-m-d'),
                    'action_url' => "/closings/{$closing->id}",
                    'action_label' => 'Auditar y Confirmar Cierre',
                ]
            );
        }

        // Limpiar alertas de cierres que ya fueron completados
        $closedClosings = DailyClosing::whereIn('branch_id', $branchIds)
            ->whereNotIn('status', ['OPEN', 'IN_PROGRESS'])
            ->pluck('id');

        foreach ($closedClosings as $closingId) {
            Alert::where('company_id', $company->id)
                ->where('alert_type', 'PENDING_CLOSING')
                ->where('context_data->dedup_key', "PENDING_CLOSING_{$closingId}")
                ->delete();
        }
    }

    /**
     * 6. Alerta: Diferencia de Inventario o Descuadre en Caja (WARNING)
     */
    protected function scanInventoryDifferences(Company $company, array $branchIds): void
    {
        $closings = DailyClosing::with(['branch', 'latestVersion'])
            ->whereIn('branch_id', $branchIds)
            ->where('status', 'CLOSED')
            ->where('created_at', '>=', now()->subDays(7))
            ->get();

        foreach ($closings as $closing) {
            $diff = (float) ($closing->latestVersion?->total_difference ?? 0);
            if (abs($diff) <= 0.001) {
                // Sin descuadre, borrar si existía alerta previa
                Alert::where('company_id', $company->id)
                    ->where('branch_id', $closing->branch_id)
                    ->where('alert_type', 'INVENTORY_DIFFERENCE')
                    ->where('context_data->dedup_key', "INVENTORY_DIFFERENCE_{$closing->id}")
                    ->delete();

                continue;
            }

            $dedupKey = "INVENTORY_DIFFERENCE_{$closing->id}";

            $branchName = $closing->branch?->name ?? 'Sede Central';
            $closingDateStr = $closing->closing_date?->format('d/m/Y') ?? date('d/m/Y');
            $diffType = $diff > 0 ? 'Sobrante de dinero' : 'Faltante de dinero';
            $diffFormatted = number_format(abs($diff), 2);

            $this->upsertAlert(
                company: $company,
                branchId: $closing->branch_id,
                alertType: 'INVENTORY_DIFFERENCE',
                severity: 'WARNING',
                dedupKey: $dedupKey,
                title: "Descuadre en Caja ({$diffType}): {$branchName}",
                message: "En el cierre de caja del día {$closingDateStr} en {$branchName} se detectó una diferencia de S/ {$diffFormatted} ({$diffType}) entre el efectivo físico contado y lo registrado en el sistema.",
                contextData: [
                    'closing_id' => $closing->id,
                    'difference' => $diff,
                    'action_url' => "/closings/{$closing->id}",
                    'action_label' => 'Ver Detalle del Cierre',
                ]
            );
        }
    }

    /**
     * 7. Alerta: Transferencias Pendientes o Demoradas (WARNING)
     */
    protected function scanPendingTransfers(Company $company, array $branchIds): void
    {
        $transfers = Transfer::with(['sourceBranch', 'destinationBranch'])
            ->where(function ($q) use ($branchIds) {
                $q->whereIn('source_branch_id', $branchIds)
                    ->orWhereIn('destination_branch_id', $branchIds);
            })
            ->whereIn('status', ['PENDING', 'IN_TRANSIT'])
            ->where('created_at', '<=', now()->subHours(12))
            ->get();

        foreach ($transfers as $tr) {
            $dedupKey = "PENDING_TRANSFER_{$tr->id}";

            $sourceName = $tr->sourceBranch?->name ?? 'Sede Origen';
            $destName = $tr->destinationBranch?->name ?? 'Sede Destino';

            $this->upsertAlert(
                company: $company,
                branchId: $tr->destination_branch_id,
                alertType: 'PENDING_TRANSFER',
                severity: 'WARNING',
                dedupKey: $dedupKey,
                title: "Traslado en Espera de Recepción: {$tr->transfer_number}",
                message: "El traslado de mercadería N° {$tr->transfer_number} enviado desde {$sourceName} con destino a {$destName} lleva más de 12 horas en tránsito sin ser recepcionado ni verificado en almacén.",
                contextData: [
                    'transfer_id' => $tr->id,
                    'status' => $tr->status,
                    'action_url' => "/transfers/{$tr->id}",
                    'action_label' => 'Recepcionar Traslado',
                ]
            );
        }

        // Limpiar transferencias que ya fueron completadas o canceladas
        $completedTransfers = Transfer::where(function ($q) use ($branchIds) {
            $q->whereIn('source_branch_id', $branchIds)
                ->orWhereIn('destination_branch_id', $branchIds);
        })
            ->whereNotIn('status', ['PENDING', 'IN_TRANSIT'])
            ->pluck('id');

        foreach ($completedTransfers as $trId) {
            Alert::where('company_id', $company->id)
                ->where('alert_type', 'PENDING_TRANSFER')
                ->where('context_data->dedup_key', "PENDING_TRANSFER_{$trId}")
                ->delete();
        }
    }

    /**
     * 8. Alerta: Conflictos de Sincronización (CRITICAL)
     */
    protected function scanSyncConflicts(Company $company, array $branchIds): void
    {
        $conflicts = Conflict::with(['syncOperation.device'])
            ->where('status', 'PENDING')
            ->get();

        foreach ($conflicts as $conflict) {
            $deviceBranchId = $conflict->syncOperation?->device?->branch_id;
            $clientBranchId = is_array($conflict->client_state) ? ($conflict->client_state['branch_id'] ?? null) : null;
            $conflictBranchId = $deviceBranchId ?? $clientBranchId;

            if ($conflictBranchId && ! in_array($conflictBranchId, $branchIds)) {
                continue;
            }

            $dedupKey = "SYNC_CONFLICT_{$conflict->id}";

            $friendlyConflictType = match ($conflict->conflict_type) {
                'STOCK_DEPLETED' => 'Falta de Stock Concurrente',
                'CONCURRENT_SALE' => 'Venta Simultánea en Dos Cajas',
                'PRICE_MISMATCH' => 'Diferencia de Precio en Repuesto',
                'VERSION_CONFLICT' => 'Conflicto de Edición Simultánea',
                default => 'Discrepancia de Datos Offline',
            };

            $this->upsertAlert(
                company: $company,
                branchId: $conflictBranchId ? (int) $conflictBranchId : null,
                alertType: 'SYNC_CONFLICT',
                severity: 'CRITICAL',
                dedupKey: $dedupKey,
                title: "Discrepancia Offline: {$friendlyConflictType}",
                message: "Una venta u operación registrada en modo sin conexión no pudo aplicarse automáticamente: {$conflict->reason_description}. Ingresa a la bandeja para aceptar o resolver la operación.",
                contextData: [
                    'conflict_id' => $conflict->id,
                    'conflict_type' => $conflict->conflict_type,
                    'action_url' => "/conflicts/{$conflict->id}",
                    'action_label' => 'Resolver Conflicto',
                ]
            );
        }

        // Limpiar conflictos resueltos
        $resolvedConflicts = Conflict::where('status', '!=', 'PENDING')->pluck('id');
        foreach ($resolvedConflicts as $cId) {
            Alert::where('company_id', $company->id)
                ->where('alert_type', 'SYNC_CONFLICT')
                ->where('context_data->dedup_key', "SYNC_CONFLICT_{$cId}")
                ->delete();
        }
    }

    /**
     * 9. Alerta: Operaciones Offline Pendientes de Procesamiento (INFO)
     */
    protected function scanPendingOfflineOps(Company $company, array $branchIds): void
    {
        $pendingOpsCount = SyncOperation::where('status', 'PENDING')
            ->whereHas('device', fn ($q) => $q->whereIn('branch_id', $branchIds))
            ->count();

        $dedupKey = 'PENDING_OFFLINE_OPS_'.implode('_', $branchIds);

        if ($pendingOpsCount > 0) {
            $firstBranchId = $branchIds[0] ?? null;
            $this->upsertAlert(
                company: $company,
                branchId: $firstBranchId,
                alertType: 'PENDING_OFFLINE_OPS',
                severity: 'INFO',
                dedupKey: $dedupKey,
                title: "Sincronización Offline en Cola ({$pendingOpsCount} pendientes)",
                message: "Hay {$pendingOpsCount} operaciones guardadas en modo sin conexión que se están consolidando y procesando en el servidor.",
                contextData: [
                    'pending_count' => $pendingOpsCount,
                    'action_url' => '/conflicts',
                    'action_label' => 'Ver Estado de Sincronización',
                ]
            );
        } else {
            Alert::where('company_id', $company->id)
                ->where('alert_type', 'PENDING_OFFLINE_OPS')
                ->where('context_data->dedup_key', $dedupKey)
                ->delete();
        }
    }

    /**
     * 10. Alerta: Dispositivo Desconocido o No Autorizado (WARNING)
     */
    protected function scanUnknownDevices(Company $company, array $branchIds): void
    {
        $inactiveDevices = Device::where(function ($q) {
            $q->whereNull('branch_id')
                ->orWhere('status', 'INACTIVE');
        })
            ->whereNotNull('last_seen_at')
            ->where('last_seen_at', '>=', now()->subDays(3))
            ->get();

        foreach ($inactiveDevices as $dev) {
            $devName = $dev->name ?: 'Equipo sin nombre';
            $devIp = $dev->ip_address ?: 'IP no registrada';

            $dedupKey = "UNKNOWN_DEVICE_{$dev->id}";
            $this->upsertAlert(
                company: $company,
                branchId: $dev->branch_id,
                alertType: 'UNKNOWN_DEVICE',
                severity: 'WARNING',
                dedupKey: $dedupKey,
                title: "Equipo No Asignado o Inactivo: {$devName}",
                message: "El dispositivo o computadora '{$devName}' ({$devIp}) intentó conectarse sin tener sucursal asignada o permisos activos.",
                contextData: [
                    'device_id' => $dev->id,
                    'device_uuid' => $dev->uuid,
                    'action_url' => '/settings',
                    'action_label' => 'Revisar Dispositivos',
                ]
            );
        }
    }

    /**
     * Guarda o actualiza una alerta determinística sin duplicados.
     */
    protected function upsertAlert(
        Company $company,
        ?int $branchId,
        string $alertType,
        string $severity,
        string $dedupKey,
        string $title,
        string $message,
        array $contextData
    ): Alert {
        // Generar UUID determinístico basado en dedupKey
        $uuid = Str::uuid()->toString();

        $existing = Alert::where('company_id', $company->id)
            ->where('alert_type', $alertType)
            ->where('context_data->dedup_key', $dedupKey)
            ->first();

        $contextData['dedup_key'] = $dedupKey;

        if ($existing) {
            // Actualizar datos conservando estado de lectura
            $existing->update([
                'title' => $title,
                'message' => $message,
                'severity' => $severity,
                'branch_id' => $branchId,
                'context_data' => $contextData,
            ]);

            return $existing;
        }

        return Alert::create([
            'uuid' => $uuid,
            'company_id' => $company->id,
            'branch_id' => $branchId,
            'alert_type' => $alertType,
            'severity' => $severity,
            'title' => $title,
            'message' => $message,
            'context_data' => $contextData,
            'is_read' => false,
        ]);
    }

    /**
     * Marca una alerta como leída.
     */
    public function markAsRead(Alert $alert, User $user): bool
    {
        return $alert->update([
            'is_read' => true,
            'read_by' => $user->id,
            'read_at' => now(),
        ]);
    }

    /**
     * Marca todas las alertas del usuario como leídas.
     */
    public function markAllAsReadForUser(User $user, ?int $branchId = null): int
    {
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $isSuperAdmin
            ? Branch::where('status', 'ACTIVE')->pluck('id')->toArray()
            : $user->branches()->where('branches.status', 'ACTIVE')->pluck('branches.id')->toArray();

        if (empty($allowedBranchIds) && ! $isSuperAdmin && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        $query = Alert::where('is_read', false)
            ->where(function (Builder $q) use ($allowedBranchIds, $isSuperAdmin) {
                $q->whereIn('branch_id', $allowedBranchIds);
                if ($isSuperAdmin) {
                    $q->orWhereNull('branch_id');
                }
            });

        if ($branchId && in_array($branchId, $allowedBranchIds)) {
            $query->where('branch_id', $branchId);
        }

        return $query->update([
            'is_read' => true,
            'read_by' => $user->id,
            'read_at' => now(),
        ]);
    }

    /**
     * Retorna la cantidad de alertas no leídas para el middleware.
     */
    public function getUnreadCountForUser(User $user): int
    {
        $isSuperAdmin = $user->hasRole('Super Admin');
        $allowedBranchIds = $isSuperAdmin
            ? Branch::where('status', 'ACTIVE')->pluck('id')->toArray()
            : $user->branches()->where('branches.status', 'ACTIVE')->pluck('branches.id')->toArray();

        if (empty($allowedBranchIds) && ! $isSuperAdmin && $user->default_branch_id) {
            $allowedBranchIds = [$user->default_branch_id];
        }

        return Alert::where('is_read', false)
            ->where(function (Builder $q) use ($allowedBranchIds, $isSuperAdmin) {
                $q->whereIn('branch_id', $allowedBranchIds);
                if ($isSuperAdmin) {
                    $q->orWhereNull('branch_id');
                }
            })
            ->count();
    }
}
