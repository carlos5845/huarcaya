import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BarChart3,
    PackageSearch,
    ShoppingBag,
    Boxes,
    ArrowRightLeft,
    Calculator,
    Landmark,
    FileSpreadsheet,
    Printer,
    Download,
    Search,
    Calendar,
    Building2,
    ShieldAlert,
    WifiOff,
    Receipt,
    TrendingUp,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { DocumentPreviewModal } from '@/components/document-preview-modal';

const breadcrumbs = [
    { title: 'Gestión', href: '/reports' },
    { title: 'Centro de Reportes', href: '/reports' },
];

interface BranchItem {
    id: number;
    name: string;
}

interface ColumnDef {
    key: string;
    label: string;
    align?: 'right' | 'center' | 'left';
}

interface KpiDef {
    label: string;
    value: string;
}

interface ReportData {
    type: string;
    title: string;
    description: string;
    kpis: KpiDef[];
    columns: ColumnDef[];
    rows: {
        data: Record<string, any>[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
    };
}

interface Props {
    report_type: string;
    report: ReportData;
    branches: BranchItem[];
    is_super_admin: boolean;
    filters: {
        date_from?: string;
        date_to?: string;
        branch_id?: string;
        search?: string;
    };
}

const REPORT_CATALOG = [
    {
        category: 'Inventario y Almacén',
        icon: PackageSearch,
        items: [
            { id: 'branch_inventory', title: 'Inventario por Sucursal', icon: Boxes },
            { id: 'consolidated_inventory', title: 'Inventario Consolidado', icon: Building2 },
            { id: 'kardex', title: 'Kardex Valorado', icon: PackageSearch },
            { id: 'inventory_exits', title: 'Salidas de Almacén', icon: FileSpreadsheet },
        ],
    },
    {
        category: 'Ventas y Comercial',
        icon: ShoppingBag,
        items: [
            { id: 'sales', title: 'Registro de Ventas', icon: Receipt },
            { id: 'purchases', title: 'Registro de Compras', icon: ShoppingBag },
            { id: 'payments', title: 'Pagos y Cobranzas', icon: Landmark },
            { id: 'receivables', title: 'Cuentas por Cobrar', icon: TrendingUp },
        ],
    },
    {
        category: 'Operaciones de Tienda',
        icon: ArrowRightLeft,
        items: [
            { id: 'transfers', title: 'Transferencias', icon: ArrowRightLeft },
            { id: 'daily_closings', title: 'Cierres Diarios', icon: Calculator },
        ],
    },
    {
        category: 'Sincronización y Auditoría',
        icon: ShieldAlert,
        items: [
            { id: 'offline_operations', title: 'Operaciones Offline', icon: WifiOff },
            { id: 'conflicts', title: 'Conflictos Sync', icon: ShieldAlert },
        ],
    },
];

export default function ReportsIndex({
    report_type,
    report,
    branches,
    is_super_admin,
    filters,
}: Props) {
    const [selectedType, setSelectedType] = useState(report_type);
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [branchId, setBranchId] = useState(filters.branch_id || 'ALL');
    const [search, setSearch] = useState(filters.search || '');

    const [printModalOpen, setPrintModalOpen] = useState(false);

    const applyFilters = (typeOverride?: string, newParams?: Partial<typeof filters>) => {
        const type = typeOverride || selectedType;
        const query: any = {
            type,
            date_from: newParams?.date_from !== undefined ? newParams.date_from : dateFrom,
            date_to: newParams?.date_to !== undefined ? newParams.date_to : dateTo,
            branch_id: (newParams?.branch_id !== undefined ? newParams.branch_id : branchId) === 'ALL' ? undefined : (newParams?.branch_id || branchId),
            search: newParams?.search !== undefined ? newParams.search : search,
        };

        router.get('/reports', query, { preserveState: true, preserveScroll: true });
    };

    const handleQuickDate = (period: 'today' | 'week' | 'month' | 'year') => {
        const now = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        let from = new Date();
        const to = formatDate(now);

        if (period === 'today') {
            from = now;
        } else if (period === 'week') {
            from.setDate(now.getDate() - 7);
        } else if (period === 'month') {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'year') {
            from = new Date(now.getFullYear(), 0, 1);
        }

        const newFrom = formatDate(from);
        setDateFrom(newFrom);
        setDateTo(to);
        applyFilters(selectedType, { date_from: newFrom, date_to: to });
    };

    const getQueryString = () => {
        const params = new URLSearchParams();
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (branchId && branchId !== 'ALL') params.append('branch_id', branchId);
        if (search) params.append('search', search);
        return params.toString();
    };

    const handleExportExcel = () => {
        const qs = getQueryString();
        window.location.href = `/reports/export/${selectedType}?${qs}`;
    };

    const handleOpenPrintModal = () => {
        setPrintModalOpen(true);
    };

    const printUrl = `/reports/print/${selectedType}?${getQueryString()}`;

    const assignedBranchName = branches.find(b => String(b.id) === String(branchId))?.name 
        || (branches.length === 1 ? branches[0].name : 'Todas las sucursales');

    return (
        <>
            <Head title={`Reportes: ${report.title}`} />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Cabecera Principal */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Centro de Reportes y Análisis
                            </h1>
                            <Badge variant="outline" className="text-xs">
                                Etapa 15
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Consolidado general de inventarios, facturación, compras, cobranzas y operaciones por sucursal.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleExportExcel}
                            className="gap-2 border-emerald-600/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                            <Download className="h-4 w-4" />
                            Exportar Excel (.xlsx)
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={handleOpenPrintModal}
                            className="gap-2"
                        >
                            <Printer className="h-4 w-4" />
                            Vista Imprimible (A4)
                        </Button>
                    </div>
                </div>

                {/* Catálogo de Reportes por Categoría */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {REPORT_CATALOG.map((cat, catIdx) => (
                        <div key={catIdx} className="rounded-xl border bg-card p-3 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b">
                                <cat.icon className="h-4 w-4 text-primary" />
                                {cat.category}
                            </div>
                            <div className="flex flex-col gap-1">
                                {cat.items.map((item) => {
                                    const isActive = selectedType === item.id;
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedType(item.id);
                                                applyFilters(item.id);
                                            }}
                                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors ${
                                                isActive
                                                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{item.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Barra de Filtros */}
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Período Rápido:</span>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleQuickDate('today')}>Hoy</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleQuickDate('week')}>7 Días</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleQuickDate('month')}>Este Mes</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleQuickDate('year')}>Este Año</Button>
                        </div>
                    </div>

                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 items-center">
                        {/* Selector de Sucursal */}
                        {is_super_admin ? (
                            <Select
                                value={branchId}
                                onValueChange={(val) => {
                                    setBranchId(val);
                                    applyFilters(selectedType, { branch_id: val });
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
                        ) : (
                            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium truncate">{assignedBranchName}</span>
                            </div>
                        )}

                        {/* Fecha Desde */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Desde:</span>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        {/* Fecha Hasta */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Hasta:</span>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        {/* Buscador */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar en reporte..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilters();
                                }}
                                className="pl-9"
                            />
                        </div>

                        {/* Botón Aplicar */}
                        <Button
                            variant="default"
                            onClick={() => applyFilters()}
                            className="w-full"
                        >
                            Consultar Reporte
                        </Button>
                    </div>
                </div>

                {/* Cabecera del Reporte Activo & KPIs */}
                <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
                    <div className="border-b pb-3">
                        <h2 className="text-xl font-bold text-foreground">
                            {report.title}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {report.description}
                        </p>
                    </div>

                    {report.kpis && report.kpis.length > 0 && (
                        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                            {report.kpis.map((kpi, idx) => (
                                <div key={idx} className="rounded-lg border bg-muted/20 p-3.5">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {kpi.label}
                                    </div>
                                    <div className="mt-1 text-xl font-bold text-primary">
                                        {kpi.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tabla de Resultados */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    {report.columns.map((col) => (
                                        <TableHead
                                            key={col.key}
                                            className={`font-semibold ${col.align === 'right' ? 'text-right' : ''}`}
                                        >
                                            {col.label}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.rows.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={report.columns.length}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            No se encontraron registros para los criterios y fechas especificadas.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    report.rows.data.map((row, rIdx) => (
                                        <TableRow key={row.id || rIdx} className="hover:bg-muted/30">
                                            {report.columns.map((col) => (
                                                <TableCell
                                                    key={col.key}
                                                    className={`py-3 ${col.align === 'right' ? 'text-right font-mono' : ''}`}
                                                >
                                                    {row[col.key] !== null && row[col.key] !== undefined ? String(row[col.key]) : '-'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Paginación */}
                    {report.rows.links && report.rows.links.length > 3 && (
                        <div className="flex items-center justify-between border-t p-4">
                            <span className="text-sm text-muted-foreground">
                                Mostrando {report.rows.data.length} de {report.rows.total} registros
                            </span>
                            <div className="flex gap-1">
                                {report.rows.links.map((link, idx) => (
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

            {/* Modal de Previsualización e Impresión Integrado */}
            <DocumentPreviewModal
                open={printModalOpen}
                onOpenChange={setPrintModalOpen}
                url={printUrl}
                title={report.title}
                subtitle="Reporte corporativo en formato A4 listo para impresión"
            />
        </>
    );
}

ReportsIndex.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
