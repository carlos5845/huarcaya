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
    Calculator, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    PlusCircle, 
    Eye, 
    Printer, 
    RefreshCw, 
    Building2, 
    Calendar,
    ArrowRight
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { DocumentPreviewModal } from '@/components/document-preview-modal';

const breadcrumbs = [
    { title: 'Caja y Cierres', href: '/closings' },
    { title: 'Cierres Diarios', href: '/closings' },
];

interface BranchItem {
    id: number;
    name: string;
}

interface CashClosingItem {
    id: number;
    uuid: string;
    closing_date: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | string;
    opened_at: string;
    closed_at?: string;
    notes?: string;
    branch?: BranchItem;
    opened_by_user?: {
        name: string;
    };
    closed_by_user?: {
        name: string;
    };
    latest_version?: {
        version_number: number;
        total_expected: string | number;
        total_counted: string | number;
        total_difference: string | number;
    };
}

interface ClosingsIndexProps {
    closings: {
        data: CashClosingItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
    kpis: {
        total: number;
        closed: number;
        pending: number;
    };
    branches: BranchItem[];
    is_super_admin?: boolean;
    filters: {
        branch_id?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
    };
}

export default function ClosingsIndex({
    closings,
    kpis,
    branches,
    is_super_admin = false,
    filters,
}: ClosingsIndexProps) {
    const [selectedBranch, setSelectedBranch] = useState(filters.branch_id || 'ALL');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'ALL');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Print Modal state
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printUrl, setPrintUrl] = useState<string | null>(null);
    const [printTitle, setPrintTitle] = useState('Ticket de Cierre Diario');

    const handleFilterChange = (overrides: Record<string, string> = {}) => {
        const query: Record<string, string> = {
            branch_id: selectedBranch,
            status: selectedStatus,
            start_date: startDate,
            end_date: endDate,
            ...overrides,
        };

        // Remove empty or 'ALL' params
        Object.keys(query).forEach((key) => {
            if (!query[key] || query[key] === 'ALL') {
                delete query[key];
            }
        });

        router.get('/closings', query, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleClearFilters = () => {
        setSelectedBranch('ALL');
        setSelectedStatus('ALL');
        setStartDate('');
        setEndDate('');
        router.get('/closings', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            onFinish: () => setIsRefreshing(false),
        });
    };

    const openPrintModal = (closing: CashClosingItem) => {
        setPrintUrl(`/closings/${closing.id}/print`);
        setPrintTitle(`Ticket Cierre - ${closing.branch?.name || 'Sucursal'} (${closing.closing_date})`);
        setPrintModalOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CLOSED':
                return (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        Cerrado Definitivo
                    </Badge>
                );
            case 'IN_PROGRESS':
                return (
                    <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1.5 w-fit">
                        <Clock className="w-3 h-3" />
                        En Proceso / Borrador
                    </Badge>
                );
            case 'OPEN':
            default:
                return (
                    <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-300 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1.5 w-fit">
                        <AlertCircle className="w-3 h-3" />
                        Abierto
                    </Badge>
                );
        }
    };

    const formatCurrency = (amount: number | string | undefined | null) => {
        const val = Number(amount || 0);
        return `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <>
            <Head title="Cierres Diarios y Arqueo de Caja" />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Calculator className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">Cierres Diarios y Arqueo de Caja</h1>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Supervisión de recaudaciones, arqueo físico de caja por métodos de pago y cierres diarios por sucursal.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>

                        <Button asChild size="sm" className="gap-2">
                            <Link href="/closings/create">
                                <PlusCircle className="w-4 h-4" />
                                Realizar Cierre de Hoy
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Total Cierres
                            </p>
                            <h3 className="text-3xl font-extrabold mt-1">{kpis.total}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Registros en el historial</p>
                        </div>
                        <div className="p-3 bg-muted rounded-full">
                            <Calculator className="w-6 h-6 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Cierres Definitivos
                            </p>
                            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{kpis.closed}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Cajas auditadas y selladas</p>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-full">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Pendientes / En Proceso
                            </p>
                            <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{kpis.pending}</h3>
                            <p className="text-xs text-muted-foreground mt-1">Requieren confirmación física</p>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-full">
                            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Sucursal
                        </label>
                        {is_super_admin && branches.length > 1 ? (
                            <Select
                                value={selectedBranch}
                                onValueChange={(val) => {
                                    setSelectedBranch(val);
                                    handleFilterChange({ branch_id: val });
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Todas las sucursales" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todas las sucursales</SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/40 text-sm font-medium">
                                <Building2 className="w-4 h-4 text-primary shrink-0" />
                                <span className="truncate">{branches[0]?.name || 'Mi Sucursal'}</span>
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-[180px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Estado
                        </label>
                        <Select
                            value={selectedStatus}
                            onValueChange={(val) => {
                                setSelectedStatus(val);
                                handleFilterChange({ status: val });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todos los estados" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los estados</SelectItem>
                                <SelectItem value="CLOSED">Cerrados Definitivos</SelectItem>
                                <SelectItem value="IN_PROGRESS">En Proceso / Borrador</SelectItem>
                                <SelectItem value="OPEN">Abiertos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-full md:w-[160px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Desde
                        </label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                handleFilterChange({ start_date: e.target.value });
                            }}
                        />
                    </div>

                    <div className="w-full md:w-[160px]">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Hasta
                        </label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                handleFilterChange({ end_date: e.target.value });
                            }}
                        />
                    </div>

                    {(selectedBranch !== 'ALL' || selectedStatus !== 'ALL' || startDate || endDate) && (
                        <Button
                            variant="ghost"
                            onClick={handleClearFilters}
                            className="text-xs text-muted-foreground self-end"
                        >
                            Limpiar
                        </Button>
                    )}
                </div>

                {/* Closings Table */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[120px]">Fecha</TableHead>
                                <TableHead>Sucursal</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Esperado Sistema</TableHead>
                                <TableHead className="text-right">Contado Físico</TableHead>
                                <TableHead className="text-right">Diferencia</TableHead>
                                <TableHead>Responsable</TableHead>
                                <TableHead className="text-right w-[150px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {closings.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Calculator className="w-8 h-8 text-muted-foreground/50" />
                                            <p className="font-medium text-base">No se encontraron cierres diarios</p>
                                            <p className="text-sm">Inicia un arqueo diario haciendo clic en "Realizar Cierre de Hoy".</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                closings.data.map((item) => {
                                    const diff = Number(item.latest_version?.total_difference || 0);
                                    const isClosed = item.status === 'CLOSED';

                                    return (
                                        <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-semibold whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    {item.closing_date}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium">{item.branch?.name || 'Sucursal'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(item.status)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {item.latest_version ? formatCurrency(item.latest_version.total_expected) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {item.latest_version ? formatCurrency(item.latest_version.total_counted) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">
                                                {item.latest_version ? (
                                                    <span className={diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-muted-foreground'}>
                                                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {item.closed_by_user?.name || item.opened_by_user?.name || '-'}
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        asChild
                                                        title="Ver Detalle / Auditoría"
                                                    >
                                                        <Link href={`/closings/${item.id}`}>
                                                            <Eye className="w-4 h-4" />
                                                        </Link>
                                                    </Button>

                                                    {!isClosed ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                            asChild
                                                            title="Continuar Arqueo"
                                                        >
                                                            <Link href={`/closings/create?branch_id=${item.branch?.id}&date=${item.closing_date}`}>
                                                                <ArrowRight className="w-4 h-4" />
                                                            </Link>
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => openPrintModal(item)}
                                                            title="Imprimir Ticket 80mm"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {closings.last_page > 1 && (
                        <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                            <div className="text-xs text-muted-foreground">
                                Mostrando página {closings.current_page} de {closings.last_page} ({closings.total} registros)
                            </div>
                            <div className="flex gap-1">
                                {closings.links.map((link, idx) => (
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

            {/* Document Preview Modal */}
            <DocumentPreviewModal
                open={printModalOpen}
                onOpenChange={setPrintModalOpen}
                url={printUrl}
                title={printTitle}
                subtitle="Comprobante térmico oficial para arqueo y cierre diario"
            />
        </>
    );
}

ClosingsIndex.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;

