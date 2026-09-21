import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { 
    useReactTable, 
    getCoreRowModel, 
    getSortedRowModel, 
    getFilteredRowModel, 
    flexRender, 
    type ColumnDef, 
    type SortingState, 
    type ColumnFiltersState, 
    type VisibilityState 
} from '@tanstack/react-table';
import { 
    Search, 
    Plus, 
    Eye, 
    Filter, 
    SlidersHorizontal, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    X, 
    Calendar, 
    Building2, 
    FileText, 
    ExternalLink, 
    Pencil, 
    DollarSign, 
    Package, 
    Layers, 
    Clock, 
    RotateCcw 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compras', href: '/purchases' },
];

const columnLabels: Record<string, string> = {
    document_date: 'Fecha Emisión',
    purchase_number: 'N° Compra',
    supplier: 'Proveedor',
    document: 'Comprobante',
    subtotal_amount: 'Op. Gravada',
    tax_amount: 'IGV (18%)',
    total_amount: 'Total Compra',
    currency_code: 'Moneda',
    status: 'Estado',
};

export default function PurchasesIndex({ 
    purchases, 
    filters, 
    branches = [], 
    isSuperAdmin = false 
}: { 
    purchases: any; 
    filters: any; 
    branches?: any[]; 
    isSuperAdmin?: boolean; 
}) {
    // Server-side filter states
    const [search, setSearch] = useState(filters?.search || '');
    const [status, setStatus] = useState(filters?.status || 'ALL');
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');
    const [branchId, setBranchId] = useState(filters?.branch_id || '');

    // Client-side TanStack Table states
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [showColumnFilters, setShowColumnFilters] = useState(false);

    const purchaseData = useMemo(() => purchases.data || [], [purchases.data]);

    // KPI Metrics calculation
    const kpiMetrics = useMemo(() => {
        const totalPurchases = purchases.total || purchaseData.length;
        const totalPEN = purchaseData
            .filter((p: any) => p.currency_code === 'PEN' && p.status !== 'CANCELLED')
            .reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0);
        const totalUSD = purchaseData
            .filter((p: any) => p.currency_code === 'USD' && p.status !== 'CANCELLED')
            .reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0);
        const draftCount = purchaseData.filter((p: any) => p.status === 'DRAFT').length;

        return { totalPurchases, totalPEN, totalUSD, draftCount };
    }, [purchases.total, purchaseData]);

    const applyServerFilters = () => {
        router.get('/purchases', { 
            search, 
            status: status === 'ALL' ? '' : status,
            date_from: dateFrom,
            date_to: dateTo,
            branch_id: branchId === 'ALL' ? '' : branchId
        }, { preserveState: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyServerFilters();
        }
    };

    const clearServerFilters = () => {
        setSearch('');
        setStatus('ALL');
        setDateFrom('');
        setDateTo('');
        setBranchId('');
        router.get('/purchases');
    };

    // TanStack Column Definitions
    const columns = useMemo<ColumnDef<any>[]>(() => [
        {
            id: 'document_date',
            accessorFn: row => row.document_date || row.created_at,
            header: ({ column }) => (
                <div className="flex flex-col gap-1 py-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>Fecha</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : (
                            <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                    </Button>
                    {showColumnFilters && (
                        <Input
                            placeholder="Filtrar fecha..."
                            value={(column.getFilterValue() as string) ?? ''}
                            onChange={(e) => column.setFilterValue(e.target.value)}
                            className="h-7 text-xs px-2 w-full bg-background border-input font-normal"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            ),
            cell: ({ row }) => {
                const dateStr = row.original.document_date || row.original.created_at;
                const formatted = new Date(dateStr).toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC'
                });
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-xs text-foreground">{formatted}</span>
                        <span className="text-[11px] text-muted-foreground">
                            {new Date(row.original.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'purchase_number',
            accessorFn: row => row.purchase_number,
            header: ({ column }) => (
                <div className="flex flex-col gap-1 py-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>N° Compra</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : (
                            <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                    </Button>
                    {showColumnFilters && (
                        <Input
                            placeholder="Filtrar N°..."
                            value={(column.getFilterValue() as string) ?? ''}
                            onChange={(e) => column.setFilterValue(e.target.value)}
                            className="h-7 text-xs px-2 w-full bg-background border-input font-normal font-mono"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            ),
            cell: ({ row }) => (
                <Link 
                    href={`/purchases/${row.original.id}`} 
                    className="font-mono text-xs font-bold text-primary hover:underline"
                >
                    {row.original.purchase_number}
                </Link>
            ),
        },
        {
            id: 'supplier',
            accessorFn: row => `${row.supplier?.legal_name || ''} ${row.supplier?.document_number || ''}`,
            header: ({ column }) => (
                <div className="flex flex-col gap-1 py-1 min-w-[180px]">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>Proveedor</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : (
                            <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                    </Button>
                    {showColumnFilters && (
                        <Input
                            placeholder="Filtrar proveedor..."
                            value={(column.getFilterValue() as string) ?? ''}
                            onChange={(e) => column.setFilterValue(e.target.value)}
                            className="h-7 text-xs px-2 w-full bg-background border-input font-normal"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            ),
            cell: ({ row }) => {
                const s = row.original.supplier;
                return (
                    <div className="min-w-[180px]">
                        <div className="font-semibold text-sm text-foreground truncate" title={s?.legal_name}>
                            {s?.legal_name || 'Desconocido'}
                        </div>
                        {s?.document_number && (
                            <div className="text-xs text-muted-foreground font-mono">
                                {s.document_type || 'RUC'}: {s.document_number}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'document',
            accessorFn: row => `${row.supplier_document_type || ''} ${row.supplier_document_series || ''} ${row.supplier_document_number || ''}`,
            header: ({ column }) => (
                <div className="flex flex-col gap-1 py-1 min-w-[140px]">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>Comprobante</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : (
                            <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                    </Button>
                    {showColumnFilters && (
                        <Input
                            placeholder="Filtrar doc..."
                            value={(column.getFilterValue() as string) ?? ''}
                            onChange={(e) => column.setFilterValue(e.target.value)}
                            className="h-7 text-xs px-2 w-full bg-background border-input font-normal"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            ),
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div className="space-y-0.5 min-w-[140px]">
                        <Badge variant="outline" className="text-[10px] bg-muted/40 font-semibold uppercase">
                            {p.supplier_document_type || 'FACTURA'}
                        </Badge>
                        <div className="font-mono text-xs text-foreground font-medium">
                            {p.supplier_document_series ? `${p.supplier_document_series}-` : ''}
                            {p.supplier_document_number || 'S/N'}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'subtotal_amount',
            accessorFn: row => Number(row.subtotal_amount || 0),
            header: ({ column }) => (
                <div className="flex flex-col gap-1 py-1 text-right">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-mr-3 ml-auto h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>Op. Gravada</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : (
                            <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                    </Button>
                    {showColumnFilters && (
                        <Input
                            placeholder="Filtrar..."
                            value={(column.getFilterValue() as string) ?? ''}
                            onChange={(e) => column.setFilterValue(e.target.value)}
                            className="h-7 text-xs px-2 w-full bg-background border-input font-normal text-right"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            ),
            cell: ({ row }) => {
                const symbol = row.original.currency_code === 'USD' ? '$' : 'S/';
                return (
                    <div className="text-right text-xs text-muted-foreground">
                        {symbol} {Number(row.original.subtotal_amount || 0).toFixed(2)}
                    </div>
                );
            },
        },
        {
            id: 'tax_amount',
            accessorFn: row => Number(row.tax_amount || 0),
            header: ({ column }) => (
                <div className="flex flex-col gap-1 py-1 text-right">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-mr-3 ml-auto h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>IGV (18%)</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : (
                            <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                    </Button>
                    {showColumnFilters && (
                        <Input
                            placeholder="Filtrar..."
                            value={(column.getFilterValue() as string) ?? ''}
                            onChange={(e) => column.setFilterValue(e.target.value)}
                            className="h-7 text-xs px-2 w-full bg-background border-input font-normal text-right"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            ),
            cell: ({ row }) => {
                const symbol = row.original.currency_code === 'USD' ? '$' : 'S/';
                return (
                    <div className="text-right text-xs text-muted-foreground">
                        {symbol} {Number(row.original.tax_amount || 0).toFixed(2)}
                    </div>
                );
            },
        },
        {
            id: 'total_amount',
            accessorFn: row => Number(row.total_amount || 0),
            header: ({ column }) => (
                <div className="flex flex-col gap-1 py-1 text-right min-w-[110px]">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-mr-3 ml-auto h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>Total Compra</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : (
                            <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                    </Button>
                    {showColumnFilters && (
                        <Input
                            placeholder="Filtrar..."
                            value={(column.getFilterValue() as string) ?? ''}
                            onChange={(e) => column.setFilterValue(e.target.value)}
                            className="h-7 text-xs px-2 w-full bg-background border-input font-normal text-right"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            ),
            cell: ({ row }) => {
                const symbol = row.original.currency_code === 'USD' ? '$' : 'S/';
                return (
                    <div className="text-right font-bold text-sm text-foreground">
                        {symbol} {Number(row.original.total_amount || 0).toFixed(2)}
                    </div>
                );
            },
        },
        {
            id: 'currency_code',
            accessorFn: row => row.currency_code,
            header: ({ column }) => (
                <div className="flex flex-col gap-1 py-1 text-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="mx-auto h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>Moneda</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : (
                            <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                    </Button>
                    {showColumnFilters && (
                        <Input
                            placeholder="PEN/USD"
                            value={(column.getFilterValue() as string) ?? ''}
                            onChange={(e) => column.setFilterValue(e.target.value)}
                            className="h-7 text-xs px-2 w-full bg-background border-input font-normal text-center"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-center">
                    <Badge variant="outline" className="text-[11px] font-semibold bg-muted/30">
                        {row.original.currency_code === 'USD' ? '$ USD' : 'S/ PEN'}
                    </Badge>
                </div>
            ),
        },
        {
            id: 'status',
            accessorFn: row => row.status,
            header: ({ column }) => (
                <div className="flex flex-col gap-1 py-1 text-center min-w-[110px]">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="mx-auto h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>Estado</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                        ) : (
                            <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                    </Button>
                    {showColumnFilters && (
                        <Input
                            placeholder="Filtrar estado..."
                            value={(column.getFilterValue() as string) ?? ''}
                            onChange={(e) => column.setFilterValue(e.target.value)}
                            className="h-7 text-xs px-2 w-full bg-background border-input font-normal text-center"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            ),
            cell: ({ row }) => {
                const st = row.original.status;
                if (st === 'DRAFT') {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Borrador
                            </Badge>
                        </div>
                    );
                }
                if (st === 'CONFIRMED') {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Confirmado
                            </Badge>
                        </div>
                    );
                }
                return (
                    <div className="flex justify-center">
                        <Badge variant="outline" className="text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                            Anulado
                        </Badge>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            enableHiding: false,
            enableSorting: false,
            header: () => (
                <div className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground py-2">
                    Acciones
                </div>
            ),
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div className="flex justify-end items-center gap-1.5">
                        {p.document_file_path && (
                            <a 
                                href={`/storage/${p.document_file_path}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="Ver comprobante adjunto"
                            >
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </a>
                        )}

                        {p.status === 'DRAFT' && (
                            <Link href={`/purchases/${p.id}/edit`}>
                                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-medium">
                                    <Pencil className="h-3.5 w-3.5" /> Editar
                                </Button>
                            </Link>
                        )}

                        <Link href={`/purchases/${p.id}`}>
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-medium">
                                <Eye className="h-3.5 w-3.5" /> Ver
                            </Button>
                        </Link>
                    </div>
                );
            },
        },
    ], [showColumnFilters]);

    // Initialize React Table
    const table = useReactTable({
        data: purchaseData,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const activeColumnFiltersCount = columnFilters.length;

    return (
        <>
            <Head title="Compras" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-7xl mx-auto w-full">
                {/* Header & New Purchase Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                            <span>&rsaquo;</span>
                            <span className="text-foreground font-medium">Compras</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Registro y Resumen de Compras
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Historial de abastecimiento de repuestos e ingresos a inventario Kardex
                        </p>
                    </div>

                    <Link href="/purchases/create">
                        <Button className="bg-primary text-primary-foreground font-semibold shadow-xs gap-2">
                            <Plus className="h-4 w-4" /> Nueva Compra
                        </Button>
                    </Link>
                </div>

                {/* 4 KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Registros
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Package className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-foreground">
                                {kpiMetrics.totalPurchases}
                            </span>
                            <span className="text-xs text-muted-foreground">compras</span>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total en Soles
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-foreground">
                                S/ {kpiMetrics.totalPEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total en Dólares
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-foreground">
                                $ {kpiMetrics.totalUSD.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                En Borrador
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-foreground">
                                {kpiMetrics.draftCount}
                            </span>
                            <span className="text-xs text-muted-foreground">pendientes</span>
                        </div>
                    </div>
                </div>

                {/* Server Filters Bar + Table Controls */}
                <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Global Search */}
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por proveedor, N° comprobante o repuesto..."
                                className="pl-9 h-9 bg-background border-input text-xs"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>

                        {/* Status Filter */}
                        <Select value={status} onValueChange={(val) => setStatus(val)}>
                            <SelectTrigger className="w-[160px] h-9 bg-background border-input text-xs">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los Estados</SelectItem>
                                <SelectItem value="DRAFT">Borrador</SelectItem>
                                <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                                <SelectItem value="CANCELLED">Anulado</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Date Range Inputs */}
                        <div className="flex items-center gap-1.5 bg-muted/40 border border-border px-2 py-0.5 rounded-lg text-xs">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">Desde:</span>
                            <Input 
                                type="date" 
                                value={dateFrom} 
                                onChange={e => setDateFrom(e.target.value)} 
                                className="w-[125px] h-7 text-xs border-none shadow-none bg-transparent p-0" 
                            />
                            <span className="text-muted-foreground border-l border-border pl-1.5">Hasta:</span>
                            <Input 
                                type="date" 
                                value={dateTo} 
                                onChange={e => setDateTo(e.target.value)} 
                                className="w-[125px] h-7 text-xs border-none shadow-none bg-transparent p-0" 
                            />
                        </div>

                        {/* Branch Selector (Super Admin) */}
                        {isSuperAdmin && branches && branches.length > 0 && (
                            <Select value={branchId} onValueChange={(val) => setBranchId(val)}>
                                <SelectTrigger className="w-[160px] h-9 bg-background border-input text-xs">
                                    <SelectValue placeholder="Todas las Sucursales" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todas las Sucursales</SelectItem>
                                    {branches.map((b: any) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={applyServerFilters} 
                            className="h-9 gap-1.5 text-xs font-semibold"
                        >
                            <Filter className="h-3.5 w-3.5" /> Filtrar
                        </Button>

                        {(search || status !== 'ALL' || dateFrom || dateTo || branchId) && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={clearServerFilters} 
                                className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="h-3.5 w-3.5" /> Limpiar
                            </Button>
                        )}
                    </div>

                    {/* Table View Customization: Column Filters Toggle & Column Visibility Dropdown */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                            {/* Toggle Column Filtering Inputs */}
                            <Button
                                type="button"
                                variant={showColumnFilters ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setShowColumnFilters(!showColumnFilters)}
                                className="h-8 gap-1.5 text-xs font-medium"
                            >
                                <Filter className="h-3.5 w-3.5" />
                                <span>{showColumnFilters ? "Ocultar Filtros de Columna" : "Filtrar por Columnas"}</span>
                                {activeColumnFiltersCount > 0 && (
                                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-primary/20 text-primary font-bold">
                                        {activeColumnFiltersCount}
                                    </Badge>
                                )}
                            </Button>

                            {activeColumnFiltersCount > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setColumnFilters([])}
                                    className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" /> Limpiar filtros ({activeColumnFiltersCount})
                                </Button>
                            )}
                        </div>

                        {/* Column Visibility Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 gap-1.5 text-xs font-medium ml-auto"
                                >
                                    <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Columnas</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] bg-popover text-popover-foreground border-border">
                                <DropdownMenuLabel className="text-xs font-semibold">
                                    Visibilidad de Columnas
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {table
                                    .getAllColumns()
                                    .filter((col) => typeof col.accessorFn !== 'undefined' && col.getCanHide())
                                    .map((col) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={col.id}
                                                className="text-xs cursor-pointer capitalize"
                                                checked={col.getIsVisible()}
                                                onCheckedChange={(val) => col.toggleVisibility(!!val)}
                                            >
                                                {columnLabels[col.id] || col.id}
                                            </DropdownMenuCheckboxItem>
                                        );
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Main Interactive Table */}
                <div className="bg-card text-card-foreground border border-border rounded-xl shadow-xs overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-muted/40 border-b border-border">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="px-3 py-2 align-top">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow 
                                        key={row.id} 
                                        className="border-b border-border/70 hover:bg-muted/30 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="px-3 py-3">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="text-center p-12 text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Package className="w-8 h-8 opacity-30 text-primary" />
                                            <p className="text-sm font-semibold">No se encontraron compras registradas</p>
                                            <p className="text-xs opacity-70">Intenta modificando los filtros de búsqueda o registra una nueva compra</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Footer */}
                    {purchases.last_page > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                            <div>
                                Mostrando <strong>{purchases.from || 1}</strong> a <strong>{purchases.to || purchases.data.length}</strong> de <strong>{purchases.total}</strong> compras registradas
                            </div>
                            <div className="flex items-center gap-1">
                                {purchases.links.map((link: any, idx: number) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? "default" : "outline"}
                                        size="sm"
                                        asChild={!!link.url}
                                        disabled={!link.url}
                                        className={`h-8 text-xs ${!link.url ? "opacity-50 pointer-events-none" : ""}`}
                                    >
                                        {link.url ? (
                                            <Link href={link.url} dangerouslySetInnerHTML={{ __html: link.label }} />
                                        ) : (
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

PurchasesIndex.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
