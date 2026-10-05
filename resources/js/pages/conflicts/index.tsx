import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    CheckCircle2, 
    XCircle, 
    ShieldAlert, 
    Search, 
    Eye, 
    RefreshCw, 
    Building2, 
    Laptop, 
    Calendar,
    ArrowRight,
    HelpCircle
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs = [
    { title: 'Sincronización', href: '#' },
    { title: 'Bandeja de Conflictos', href: '/conflicts' },
];

interface ConflictMetrics {
    pending_count: number;
    resolved_count: number;
    rejected_count: number;
    total_count: number;
}

interface BranchItem {
    id: number;
    name: string;
    code: string;
}

interface ConflictItem {
    id: number;
    uuid: string;
    entity_type: string;
    entity_uuid: string;
    conflict_type: string;
    status: string;
    created_at: string;
    resolved_at?: string;
    resolution_notes?: string;
    client_state?: any;
    server_state?: any;
    sync_operation?: {
        id: number;
        user?: { id: number; name: string; email: string };
        device?: { id: number; device_name?: string; branch_id?: number };
    };
    resolver?: { id: number; name: string };
}

const conflictTypeLabels: Record<string, { label: string; color: string }> = {
    INSUFFICIENT_STOCK: { label: 'Stock Insuficiente', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    DUPLICATE_OPERATION: { label: 'Operación Duplicada', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    INACTIVE_PRODUCT: { label: 'Producto Desactivado', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    OUTDATED_DATA: { label: 'Datos Desactualizados', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    ALREADY_PAID: { label: 'Deuda ya Cancelada', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
    OUT_OF_ORDER: { label: 'Fuera de Secuencia', color: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20' },
};

export default function ConflictsIndex({
    conflicts,
    metrics,
    branches = [],
    is_super_admin = false,
    filters = {},
}: {
    conflicts: { data: ConflictItem[]; links: any[]; current_page: number; total: number };
    metrics: ConflictMetrics;
    branches: BranchItem[];
    is_super_admin?: boolean;
    filters: any;
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'PENDING');
    const [conflictType, setConflictType] = useState(filters.conflict_type || 'ALL');
    const [branchId, setBranchId] = useState(filters.branch_id || 'ALL');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [isReloading, setIsReloading] = useState(false);

    const handleReload = () => {
        setIsReloading(true);
        router.reload({
            only: ['conflicts', 'metrics'],
            onFinish: () => {
                setTimeout(() => setIsReloading(false), 600);
            },
        });
    };

    const applyFilters = (newParams: Record<string, any> = {}) => {
        router.get('/conflicts', {
            search,
            status,
            conflict_type: conflictType,
            branch_id: branchId,
            date_from: dateFrom,
            date_to: dateTo,
            ...newParams,
        }, { preserveState: true });
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('ALL');
        setConflictType('ALL');
        setBranchId('ALL');
        setDateFrom('');
        setDateTo('');
        router.get('/conflicts', { status: 'ALL' });
    };

    const renderStatusBadge = (st: string) => {
        switch (st) {
            case 'PENDING':
            case 'UNRESOLVED':
                return (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 font-semibold text-xs py-0.5">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pendiente
                    </Badge>
                );
            case 'RESOLVED':
                return (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold text-xs py-0.5">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        Resuelto
                    </Badge>
                );
            case 'RESOLVED_FORCE':
                return (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 font-semibold text-xs py-0.5">
                        <CheckCircle2 className="size-3 text-blue-600" />
                        Excepción Forzada
                    </Badge>
                );
            case 'REJECTED':
                return (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 font-semibold text-xs py-0.5">
                        <XCircle className="size-3 text-rose-600" />
                        Rechazado
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{st}</Badge>;
        }
    };

    const getBranchName = (c: ConflictItem) => {
        const bId = c.client_state?.branch_id || c.sync_operation?.device?.branch_id;
        const b = branches.find((item) => item.id === Number(bId));
        return b?.name || (bId ? `Sucursal #${bId}` : 'No especificada');
    };

    return (
        <>
            <Head title="Bandeja de Conflictos de Sincronización" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                            <ShieldAlert className="size-7 text-primary" />
                            Bandeja de Conflictos de Sincronización
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Gestión, auditoría y resolución administrativa de operaciones offline rechazadas por el servidor.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs font-medium"
                            onClick={handleReload}
                            disabled={isReloading}
                        >
                            <RefreshCw className={`size-3.5 transition-transform duration-500 ${isReloading ? 'animate-spin' : ''}`} />
                            <span>{isReloading ? 'Actualizando...' : 'Actualizar'}</span>
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Pendientes */}
                    <div className="bg-card text-card-foreground border border-amber-500/30 rounded-xl p-4 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                Conflictos Pendientes
                            </span>
                            <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                                <AlertTriangle className="size-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">
                                {metrics.pending_count}
                            </span>
                            {metrics.pending_count > 0 && (
                                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                    Requiere atención
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                            Operaciones en espera de decisión del supervisor
                        </div>
                    </div>

                    {/* Resueltos */}
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                Resueltos / Aplicados
                            </span>
                            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                <CheckCircle2 className="size-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">
                                {metrics.resolved_count}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                {metrics.total_count > 0 ? `${Math.round((metrics.resolved_count / metrics.total_count) * 100)}%` : '0%'}
                            </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                            Corregidos o autorizados en Kardex
                        </div>
                    </div>

                    {/* Rechazados */}
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                                Rechazados / Descartados
                            </span>
                            <div className="size-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                                <XCircle className="size-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold text-foreground">
                                {metrics.rejected_count}
                            </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                            Operaciones canceladas sin alterar stock
                        </div>
                    </div>

                    {/* Total Incidentes */}
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Total de Incidentes
                            </span>
                            <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                <ShieldAlert className="size-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold text-foreground">
                                {metrics.total_count}
                            </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                            Historial completo de sincronizaciones con conflicto
                        </div>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {/* Status Select */}
                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Estado</label>
                            <Select
                                value={status}
                                onValueChange={(val) => {
                                    setStatus(val);
                                    applyFilters({ status: val });
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">Pendientes (Por Resolver)</SelectItem>
                                    <SelectItem value="RESOLVED">Resueltos / Aplicados</SelectItem>
                                    <SelectItem value="REJECTED">Rechazados</SelectItem>
                                    <SelectItem value="ALL">Todos los Estados</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Conflict Type Select */}
                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Tipo de Conflicto</label>
                            <Select
                                value={conflictType}
                                onValueChange={(val) => {
                                    setConflictType(val);
                                    applyFilters({ conflict_type: val });
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Tipo de Conflicto" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos los Tipos</SelectItem>
                                    <SelectItem value="INSUFFICIENT_STOCK">Stock Insuficiente</SelectItem>
                                    <SelectItem value="DUPLICATE_OPERATION">Operación Duplicada</SelectItem>
                                    <SelectItem value="INACTIVE_PRODUCT">Producto Desactivado</SelectItem>
                                    <SelectItem value="OUTDATED_DATA">Datos Desactualizados</SelectItem>
                                    <SelectItem value="ALREADY_PAID">Deuda ya Cancelada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Branch Select */}
                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Sucursal</label>
                            {is_super_admin && branches.length > 1 ? (
                                <Select
                                    value={String(branchId)}
                                    onValueChange={(val) => {
                                        setBranchId(val);
                                        applyFilters({ branch_id: val });
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todas las Sucursales</SelectItem>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border bg-muted/40 text-xs font-medium">
                                    <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="truncate">{branches[0]?.name || 'Mi Sucursal'}</span>
                                </div>
                            )}
                        </div>

                        {/* Search Input */}
                        <div className="lg:col-span-2">
                            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Búsqueda rápida</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    placeholder="Buscar por UUID, usuario, comprobante o notas..."
                                    className="pl-8 h-9 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                        <div className="text-muted-foreground">
                            Mostrando {conflicts.data.length} de {conflicts.total} registros
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground"
                                onClick={clearFilters}
                            >
                                Limpiar filtros
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                className="h-8 text-xs font-semibold"
                                onClick={() => applyFilters()}
                            >
                                Aplicar filtros
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Conflicts Table */}
                <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider">Fecha / Hora</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider">Tipo de Conflicto</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider">Operación / Entidad</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider">Sucursal & Dispositivo</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider">Usuario / Cajero</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider">Estado</TableHead>
                                <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {conflicts.data.length > 0 ? (
                                conflicts.data.map((c) => {
                                    const typeInfo = conflictTypeLabels[c.conflict_type] || {
                                        label: c.conflict_type,
                                        color: 'bg-zinc-500/10 text-zinc-600',
                                    };

                                    return (
                                        <TableRow key={c.id} className="hover:bg-muted/30 transition-colors border-b border-border/60">
                                            {/* Fecha */}
                                            <TableCell className="text-xs font-medium whitespace-nowrap">
                                                <div>{new Date(c.created_at).toLocaleDateString('es-PE')}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {new Date(c.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </TableCell>

                                            {/* Tipo de Conflicto */}
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                            </TableCell>

                                            {/* Entidad */}
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-xs text-foreground">
                                                        {c.entity_type === 'Sale' ? 'Venta Offline' : c.entity_type === 'Purchase' ? 'Compra Offline' : c.entity_type}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[180px]" title={c.entity_uuid}>
                                                        {c.entity_uuid}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Sucursal & Dispositivo */}
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <div className="font-medium flex items-center gap-1 text-foreground">
                                                        <Building2 className="size-3 text-muted-foreground" />
                                                        {getBranchName(c)}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <Laptop className="size-2.5" />
                                                        {c.sync_operation?.device?.device_name || 'Terminal Local'}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Usuario / Cajero */}
                                            <TableCell className="text-xs">
                                                <div className="font-medium text-foreground">
                                                    {c.sync_operation?.user?.name || 'Usuario Offline'}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                    {c.sync_operation?.user?.email || '-'}
                                                </div>
                                            </TableCell>

                                            {/* Estado */}
                                            <TableCell>
                                                {renderStatusBadge(c.status)}
                                            </TableCell>

                                            {/* Acción */}
                                            <TableCell className="text-right">
                                                <Link href={`/conflicts/${c.id}`}>
                                                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
                                                        <Eye className="size-3.5" />
                                                        <span>Gestionar</span>
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                <CheckCircle2 className="size-5 text-emerald-600" />
                                            </div>
                                            <div className="font-medium text-sm text-foreground">No hay conflictos pendientes</div>
                                            <p className="text-xs max-w-sm">
                                                Todas las sincronizaciones se encuentran procesadas y consistentes con la base de datos central.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Links */}
                    {conflicts.links && conflicts.links.length > 3 && (
                        <div className="flex items-center justify-between p-4 border-t border-border bg-card">
                            <span className="text-xs text-muted-foreground">
                                Página {conflicts.current_page} &bull; Total {conflicts.total} registros
                            </span>
                            <div className="flex items-center gap-1">
                                {conflicts.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        preserveState
                                        className={`px-3 py-1 text-xs rounded-md border ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground border-primary font-bold'
                                                : link.url
                                                ? 'bg-background hover:bg-muted text-foreground border-border'
                                                : 'opacity-40 pointer-events-none border-transparent'
                                        }`}
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

ConflictsIndex.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
