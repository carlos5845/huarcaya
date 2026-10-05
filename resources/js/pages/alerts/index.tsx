import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertTriangle,
    AlertOctagon,
    AlertCircle,
    Info,
    CheckCircle2,
    RefreshCw,
    Building2,
    Search,
    ArrowRight,
    BellRing,
    ExternalLink,
    Filter,
    Clock,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs = [
    { title: 'Operaciones', href: '/alerts' },
    { title: 'Centro de Alertas', href: '/alerts' },
];

interface BranchItem {
    id: number;
    name: string;
}

interface AlertItem {
    id: number;
    uuid: string;
    alert_type: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    message: string;
    context_data?: {
        action_url?: string;
        action_label?: string;
        [key: string]: any;
    };
    is_read: boolean;
    read_at?: string;
    created_at: string;
    branch?: BranchItem;
}

interface Props {
    alerts: {
        data: AlertItem[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
    };
    kpis: {
        critical: number;
        warning: number;
        info: number;
        total: number;
        unread: number;
    };
    branches: BranchItem[];
    is_super_admin: boolean;
    filters: {
        severity?: string;
        alert_type?: string;
        status?: string;
        search?: string;
        branch_id?: string;
    };
}

export default function AlertsIndex({
    alerts,
    kpis,
    branches,
    is_super_admin,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [severity, setSeverity] = useState(filters.severity || 'ALL');
    const [status, setStatus] = useState(filters.status || 'unread');
    const [branchId, setBranchId] = useState(filters.branch_id || 'ALL');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleFilterChange = (newFilters: Partial<typeof filters>) => {
        const query: any = {
            search: newFilters.search !== undefined ? newFilters.search : search,
            severity: (newFilters.severity !== undefined ? newFilters.severity : severity) === 'ALL' ? undefined : (newFilters.severity || severity),
            status: (newFilters.status !== undefined ? newFilters.status : status) === 'ALL' ? undefined : (newFilters.status || status),
            branch_id: (newFilters.branch_id !== undefined ? newFilters.branch_id : branchId) === 'ALL' ? undefined : (newFilters.branch_id || branchId),
        };

        router.get('/alerts', query, { preserveState: true, preserveScroll: true });
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.post('/alerts/refresh', {}, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsRefreshing(false),
        });
    };

    const handleMarkAsRead = (alertId: number) => {
        router.post(`/alerts/${alertId}/read`, {}, {
            preserveScroll: true,
        });
    };

    const handleMarkAllAsRead = () => {
        router.post('/alerts/read-all', {
            branch_id: branchId === 'ALL' ? undefined : branchId,
        }, {
            preserveScroll: true,
        });
    };

    const getSeverityBadge = (sev: 'CRITICAL' | 'WARNING' | 'INFO') => {
        switch (sev) {
            case 'CRITICAL':
                return (
                    <Badge variant="destructive" className="gap-1 font-semibold">
                        <AlertOctagon className="h-3.5 w-3.5" />
                        Crítica
                    </Badge>
                );
            case 'WARNING':
                return (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold hover:bg-amber-500/25">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Advertencia
                    </Badge>
                );
            case 'INFO':
            default:
                return (
                    <Badge variant="secondary" className="gap-1 font-semibold text-blue-600 dark:text-blue-400">
                        <Info className="h-3.5 w-3.5" />
                        Informativa
                    </Badge>
                );
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return new Intl.DateTimeFormat('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    const getAlertTypeName = (type: string) => {
        switch (type) {
            case 'OUT_OF_STOCK':
                return 'Sin Stock';
            case 'NEGATIVE_STOCK':
                return 'Stock Negativo';
            case 'LOW_STOCK':
                return 'Stock Mínimo';
            case 'OVERDUE_RECEIVABLE':
                return 'Cobranza Vencida';
            case 'PENDING_CLOSING':
                return 'Caja por Cerrar';
            case 'INVENTORY_DIFFERENCE':
                return 'Descuadre de Caja';
            case 'PENDING_TRANSFER':
                return 'Traslado en Espera';
            case 'SYNC_CONFLICT':
                return 'Discrepancia Offline';
            case 'PENDING_OFFLINE_OPS':
                return 'Cola de Sincronización';
            case 'UNKNOWN_DEVICE':
                return 'Dispositivo Desconocido';
            default:
                return type.replace(/_/g, ' ');
        }
    };

    const assignedBranchName = branches.find(b => String(b.id) === String(branchId))?.name 
        || (branches.length === 1 ? branches[0].name : 'Todas las sucursales');

    return (
        <>
            <Head title="Centro de Alertas y Notificaciones Operativas" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Cabecera Principal */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Centro de Alertas y Monitoreo
                            </h1>
                            <Badge variant="outline" className="text-xs">
                                Etapa 15
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Detección reactiva de incidencias de stock, cobranzas vencidas, arqueos pendientes y anomalías operativas.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>

                        {kpis.unread > 0 && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="gap-2"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Marcar todas como atendidas
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tarjetas KPI */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-red-500/20 bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Críticas Pendientes
                            </span>
                            <div className="rounded-full bg-red-500/10 p-2 text-red-600 dark:text-red-400">
                                <AlertOctagon className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                            {kpis.critical}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Agotados, stock negativo, morosidad crítica y conflictos
                        </p>
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Advertencias
                            </span>
                            <div className="rounded-full bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {kpis.warning}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Stock bajo, traslados demorados y arqueos sin cerrar
                        </p>
                    </div>

                    <div className="rounded-xl border border-blue-500/20 bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Informativas
                            </span>
                            <div className="rounded-full bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                                <Info className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {kpis.info}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Operaciones offline encoladas y avisos generales
                        </p>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total No Atendidas
                            </span>
                            <div className="rounded-full bg-primary/10 p-2 text-primary">
                                <BellRing className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-foreground">
                            {kpis.unread}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            De un total de {kpis.total} alertas registradas
                        </p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                        {/* Selector de Sucursal */}
                        {is_super_admin ? (
                            <div className="w-full sm:w-[220px]">
                                <Select
                                    value={branchId}
                                    onValueChange={(val) => {
                                        setBranchId(val);
                                        handleFilterChange({ branch_id: val });
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <div className="flex items-center gap-2 truncate">
                                            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <SelectValue placeholder="Sucursal..." />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todas las sucursales</SelectItem>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">{assignedBranchName}</span>
                            </div>
                        )}

                        {/* Severidad */}
                        <div className="w-full sm:w-[170px]">
                            <Select
                                value={severity}
                                onValueChange={(val) => {
                                    setSeverity(val);
                                    handleFilterChange({ severity: val });
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Severidad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todas las severidades</SelectItem>
                                    <SelectItem value="CRITICAL">Solo Críticas</SelectItem>
                                    <SelectItem value="WARNING">Solo Advertencias</SelectItem>
                                    <SelectItem value="INFO">Solo Informativas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Estado */}
                        <div className="w-full sm:w-[170px]">
                            <Select
                                value={status}
                                onValueChange={(val) => {
                                    setStatus(val);
                                    handleFilterChange({ status: val });
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unread">Solo Pendientes</SelectItem>
                                    <SelectItem value="read">Solo Atendidas</SelectItem>
                                    <SelectItem value="ALL">Todos los estados</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Buscador de texto */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar en alertas..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleFilterChange({ search });
                                    }
                                }}
                                className="pl-9"
                            />
                        </div>

                        <Button
                            variant="secondary"
                            onClick={() => handleFilterChange({ search })}
                        >
                            Filtrar
                        </Button>
                    </div>
                </div>

                {/* Lista de Alertas */}
                <div className="flex flex-col gap-3">
                    {alerts.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
                            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400 mb-3">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                ¡Sin incidencias operativas activas!
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-sm mt-1">
                                No se encontraron alertas pendientes con los filtros seleccionados. Los inventarios, cierres y operaciones se encuentran conformes.
                            </p>
                        </div>
                    ) : (
                        alerts.data.map((alert) => {
                            const isCritical = alert.severity === 'CRITICAL';
                            const isWarning = alert.severity === 'WARNING';
                            const borderColor = isCritical 
                                ? 'border-l-4 border-l-red-500' 
                                : isWarning 
                                ? 'border-l-4 border-l-amber-500' 
                                : 'border-l-4 border-l-blue-500';

                            return (
                                <div
                                    key={alert.id}
                                    className={`flex flex-col justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center ${borderColor} ${alert.is_read ? 'opacity-65' : ''}`}
                                >
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {getSeverityBadge(alert.severity)}
                                            <span className="font-semibold text-base text-foreground">
                                                {alert.title}
                                            </span>
                                            {alert.branch && (
                                                <Badge variant="outline" className="gap-1 font-normal text-xs">
                                                    <Building2 className="h-3 w-3" />
                                                    {alert.branch.name}
                                                </Badge>
                                            )}
                                            {alert.is_read && (
                                                <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                                                    Atendida
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {alert.message}
                                        </p>

                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Detectado: {formatDate(alert.created_at)}
                                            </span>
                                            <span>&bull;</span>
                                            <span className="font-medium text-foreground/80">
                                                Categoría: {getAlertTypeName(alert.alert_type)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        {alert.context_data?.action_url && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                                className="gap-1.5"
                                            >
                                                <Link href={alert.context_data.action_url}>
                                                    <span>{alert.context_data.action_label || 'Resolver Incidencia'}</span>
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        )}

                                        {!alert.is_read && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleMarkAsRead(alert.id)}
                                                className="gap-1 text-xs"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Atender
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Paginación */}
                    {alerts.links && alerts.links.length > 3 && (
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Mostrando {alerts.data.length} de {alerts.total} alertas
                            </span>
                            <div className="flex gap-1">
                                {alerts.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

AlertsIndex.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
