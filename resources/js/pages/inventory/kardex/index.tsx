import { Head, Link, router } from '@inertiajs/react';
import { 
    useReactTable, 
    getCoreRowModel, 
    getSortedRowModel, 
    flexRender, 
    type ColumnDef, 
    type SortingState, 
    type VisibilityState 
} from '@tanstack/react-table';
import { 
    Package, 
    Search, 
    Filter, 
    History, 
    ArrowDownRight, 
    ArrowUpRight, 
    Ban, 
    SlidersHorizontal, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    RotateCcw,
    Layers,
    Download,
    FileSpreadsheet,
    FileText,
    WifiOff,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KardexEntry {
    id: number;
    sequence_number: number;
    operation_date: string;
    operation_type: string;
    reference: string;
    input_quantity: number | null;
    input_unit_cost: number | null;
    input_total_cost: number | null;
    output_quantity: number | null;
    output_unit_cost: number | null;
    output_total_cost: number | null;
    balance_quantity: number;
    balance_unit_cost: number;
    balance_total_cost: number;
    fifo_input_quantity?: number;
    fifo_input_unit_cost?: number;
    fifo_input_total_cost?: number;
    fifo_output_quantity?: number;
    fifo_output_unit_cost?: number;
    fifo_output_total_cost?: number;
    fifo_balance_quantity?: number;
    fifo_balance_unit_cost?: number;
    fifo_balance_total_cost?: number;
    original_entry_id: number | null;
    reversed_by_entry_id: number | null;
    product: {
        id: number;
        name: string;
        primary_reference: string;
    };
    user: {
        id: number;
        name: string;
    };
    branch?: {
        id: number;
        name: string;
    };
}

interface PaginationData {
    data: KardexEntry[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

const columnLabels: Record<string, string> = {
    sequence_number: '# Secuencia',
    branch: 'Sucursal',
    operation_date: 'Fecha y Referencia',
    operation_type: 'Operación y Usuario',
    product: 'Producto',
    input_group: 'Entradas (Cant, CU, Total)',
    output_group: 'Salidas (Cant, CU, Total)',
    balance_group: 'Saldos (Cant, CU, Total)',
};

export default function KardexIndex({ entries, branches, filters, canSeeAllBranches = false }: { 
    canSeeAllBranches?: boolean, 
    entries: PaginationData, 
    branches: any[], 
    filters: any 
}) {
    const [branchId, setBranchId] = useState(filters.branch_id || 'ALL');
    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [method, setMethod] = useState(filters.method || 'AVERAGE');
    const [showOfflineMovements, setShowOfflineMovements] = useState(false);

    // Reactive Dexie query for pending offline transactions affecting Kardex
    const pendingOfflineSales = useLiveQuery(async () => {
        try {
            return await db.offlineSales
                .filter(s => s.sync_status !== 'SYNCED' && s.action !== 'DRAFT')
                .toArray();
        } catch {
            return [];
        }
    }, []) || [];

    const pendingOfflinePurchases = useLiveQuery(async () => {
        try {
            return await db.offlinePurchases
                .filter(p => p.sync_status !== 'SYNCED' && p.action === 'CONFIRM')
                .toArray();
        } catch {
            return [];
        }
    }, []) || [];

    const pendingOfflineMovements = useMemo(() => {
        const list: Array<{
            type: 'SALIDA' | 'ENTRADA';
            document_number: string;
            date: string;
            product_name: string;
            quantity: number;
            sync_status?: string;
        }> = [];

        for (const s of pendingOfflineSales) {
            for (const l of s.lines) {
                list.push({
                    type: 'SALIDA',
                    document_number: s.sale_number,
                    date: s.operation_date,
                    product_name: l.product_name,
                    quantity: l.quantity,
                    sync_status: s.sync_status,
                });
            }
        }

        for (const p of pendingOfflinePurchases) {
            for (const l of p.lines) {
                list.push({
                    type: 'ENTRADA',
                    document_number: p.temp_purchase_number,
                    date: p.document_date,
                    product_name: l.product_name,
                    quantity: l.quantity,
                    sync_status: p.sync_status,
                });
            }
        }

        return list;
    }, [pendingOfflineSales, pendingOfflinePurchases]);

    // TanStack states
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/kardex', { 
            branch_id: canSeeAllBranches && branchId !== 'ALL' ? branchId : '', 
            search,
            date_from: dateFrom,
            date_to: dateTo,
            method
        }, { preserveState: true });
    };

    const handleMethodChange = (newMethod: string) => {
        setMethod(newMethod);
        router.get('/kardex', { 
            branch_id: canSeeAllBranches && branchId !== 'ALL' ? branchId : '', 
            search,
            date_from: dateFrom,
            date_to: dateTo,
            method: newMethod
        }, { preserveState: true });
    };

    const clearFilters = () => {
        setBranchId('ALL');
        setSearch('');
        setDateFrom('');
        setDateTo('');
        setMethod('AVERAGE');
        router.get('/kardex');
    };

    const exportQueryString = useMemo(() => {
        const params = new URLSearchParams();
        if (canSeeAllBranches && branchId !== 'ALL') {
            params.append('branch_id', branchId);
        }
        if (search) params.append('search', search);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (method) params.append('method', method);
        return params.toString();
    }, [branchId, canSeeAllBranches, search, dateFrom, dateTo, method]);

    const renderOperationType = (type: string, isReversed: boolean) => {
        if (type.includes('REVERSO')) {
            return <Badge variant="destructive" className="flex items-center gap-1 w-fit text-[11px]"><Ban className="h-3 w-3"/> {type}</Badge>;
        }

        if (type.includes('COMPRA') || type.includes('ENTRADA')) {
            return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[11px] flex items-center gap-1 w-fit"><ArrowDownRight className="h-3 w-3"/> {type}</Badge>;
        }

        if (type.includes('VENTA') || type.includes('SALIDA')) {
            return <Badge className="bg-orange-500 hover:bg-orange-600 text-[11px] flex items-center gap-1 w-fit"><ArrowUpRight className="h-3 w-3"/> {type}</Badge>;
        }

        return <Badge variant="secondary" className="text-[11px]">{type}</Badge>;
    };

    const formatCurrency = (val: number | null | string) => {
        if (val === null || val === undefined) {
            return '-';
        }
        return `S/ ${Number(val).toFixed(2)}`;
    };

    const formatQty = (val: number | null | string) => {
        if (val === null || val === undefined) {
            return '-';
        }
        return Number(val).toFixed(2);
    };

    const kardexData = useMemo(() => entries?.data || [], [entries?.data]);

    const columns = useMemo<ColumnDef<KardexEntry>[]>(() => [
        {
            id: 'sequence_number',
            accessorFn: row => row.sequence_number,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>#</span>
                    {column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                    ) : column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                    ) : (
                        <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                </Button>
            ),
            cell: ({ row }) => (
                <span className="font-mono text-xs font-medium text-muted-foreground">
                    {row.original.sequence_number}
                </span>
            ),
        },
        {
            id: 'branch',
            accessorFn: row => row.branch?.name || '',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Sucursal</span>
                    {column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                    ) : column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                    ) : (
                        <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                </Button>
            ),
            cell: ({ row }) => (
                <Badge variant="outline" className="text-[11px] font-medium border-primary/30 bg-primary/5 text-foreground">
                    {row.original.branch?.name || 'Central'}
                </Badge>
            ),
        },
        {
            id: 'operation_date',
            accessorFn: row => row.operation_date,
            header: ({ column }) => (
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
            ),
            cell: ({ row }) => (
                <div className="text-xs">
                    <div>{new Date(row.original.operation_date).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{row.original.reference || 'Sin ref'}</div>
                </div>
            ),
        },
        {
            id: 'operation_type',
            accessorFn: row => row.operation_type,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Operación</span>
                    {column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                    ) : column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                    ) : (
                        <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                </Button>
            ),
            cell: ({ row }) => (
                <div>
                    {renderOperationType(row.original.operation_type, !!row.original.reversed_by_entry_id)}
                    <div className="text-[10px] text-muted-foreground mt-1">
                        Por: {row.original.user?.name || '-'}
                    </div>
                </div>
            ),
        },
        {
            id: 'product',
            accessorFn: row => row.product?.name || '',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Producto</span>
                    {column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                    ) : column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                    ) : (
                        <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                </Button>
            ),
            cell: ({ row }) => (
                <div className="max-w-[200px] truncate" title={row.original.product.name}>
                    <div className="font-bold text-xs text-foreground">{row.original.product.primary_reference}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{row.original.product.name}</div>
                </div>
            ),
        },
        {
            id: 'input_group',
            accessorFn: row => Number((method === 'PEPS' ? row.fifo_input_quantity : row.input_quantity) || 0),
            header: () => (
                <div className="flex flex-col gap-1 w-full min-w-[220px]">
                    <div className="flex items-center justify-center gap-1 font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <ArrowDownRight className="h-3.5 w-3.5" />
                        <span>Entradas</span>
                    </div>
                    <div className="grid grid-cols-3 text-[10px] text-muted-foreground font-semibold px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded">
                        <span className="text-right">Cant.</span>
                        <span className="text-right">C.U.</span>
                        <span className="text-right">Total</span>
                    </div>
                </div>
            ),
            cell: ({ row }) => {
                const isPeps = method === 'PEPS';
                const qty = Number((isPeps ? row.original.fifo_input_quantity : row.original.input_quantity) || 0);
                const unitCost = isPeps ? row.original.fifo_input_unit_cost : row.original.input_unit_cost;
                const totalCost = isPeps ? row.original.fifo_input_total_cost : row.original.input_total_cost;

                if (qty <= 0) {
                    return (
                        <div className="min-w-[220px] text-center text-xs text-muted-foreground/30 py-1.5 font-mono select-none">
                            —
                        </div>
                    );
                }
                return (
                    <div className="min-w-[220px] grid grid-cols-3 text-right text-xs gap-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-mono items-center">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            +{formatQty(qty)}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                            {formatCurrency(unitCost)}
                        </span>
                        <span className="font-bold text-foreground">
                            {formatCurrency(totalCost)}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'output_group',
            accessorFn: row => Number((method === 'PEPS' ? row.fifo_output_quantity : row.output_quantity) || 0),
            header: () => (
                <div className="flex flex-col gap-1 w-full min-w-[220px]">
                    <div className="flex items-center justify-center gap-1 font-bold text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>Salidas</span>
                    </div>
                    <div className="grid grid-cols-3 text-[10px] text-muted-foreground font-semibold px-2 py-0.5 bg-orange-500/10 dark:bg-orange-500/20 rounded">
                        <span className="text-right">Cant.</span>
                        <span className="text-right">{method === 'PEPS' ? 'C.U. PEPS' : 'C.U.'}</span>
                        <span className="text-right">Total</span>
                    </div>
                </div>
            ),
            cell: ({ row }) => {
                const isPeps = method === 'PEPS';
                const qty = Number((isPeps ? row.original.fifo_output_quantity : row.original.output_quantity) || 0);
                const unitCost = isPeps ? row.original.fifo_output_unit_cost : row.original.output_unit_cost;
                const totalCost = isPeps ? row.original.fifo_output_total_cost : row.original.output_total_cost;

                if (qty <= 0) {
                    return (
                        <div className="min-w-[220px] text-center text-xs text-muted-foreground/30 py-1.5 font-mono select-none">
                            —
                        </div>
                    );
                }
                return (
                    <div className="min-w-[220px] grid grid-cols-3 text-right text-xs gap-1.5 bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-mono items-center">
                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                            -{formatQty(qty)}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                            {formatCurrency(unitCost)}
                        </span>
                        <span className="font-bold text-foreground">
                            {formatCurrency(totalCost)}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'balance_group',
            accessorFn: row => Number((method === 'PEPS' ? row.fifo_balance_quantity : row.balance_quantity) || 0),
            header: () => (
                <div className="flex flex-col gap-1 w-full min-w-[220px]">
                    <div className="flex items-center justify-center gap-1 font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        <Layers className="h-3.5 w-3.5" />
                        <span>Saldos</span>
                    </div>
                    <div className="grid grid-cols-3 text-[10px] text-muted-foreground font-semibold px-2 py-0.5 bg-blue-500/10 dark:bg-blue-500/20 rounded">
                        <span className="text-right">Cant.</span>
                        <span className="text-right">{method === 'PEPS' ? 'C.U. PEPS' : 'C.U.P.'}</span>
                        <span className="text-right">Total</span>
                    </div>
                </div>
            ),
            cell: ({ row }) => {
                const isPeps = method === 'PEPS';
                const qty = Number((isPeps ? row.original.fifo_balance_quantity : row.original.balance_quantity) || 0);
                const unitCost = isPeps ? row.original.fifo_balance_unit_cost : row.original.balance_unit_cost;
                const totalCost = isPeps ? row.original.fifo_balance_total_cost : row.original.balance_total_cost;

                return (
                    <div className="min-w-[220px] grid grid-cols-3 text-right text-xs gap-1.5 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-mono items-center">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                            {formatQty(qty)}
                        </span>
                        <span className="text-muted-foreground font-medium text-[11px]">
                            {formatCurrency(unitCost)}
                        </span>
                        <span className="font-bold text-foreground">
                            {formatCurrency(totalCost)}
                        </span>
                    </div>
                );
            },
        },
    ], [method]);

    const table = useReactTable({
        data: kardexData,
        columns,
        state: {
            sorting,
            columnVisibility,
        },
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <>
            <Head title="Kardex Valorizado" />
            
            <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto pb-10 px-4 mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                            <History className="h-6 w-6 text-primary" />
                            Kardex Valorizado
                        </h1>
                        <p className="text-muted-foreground text-xs mt-0.5">
                            Auditoría de movimientos de inventario, costo promedio ponderado y trazabilidad
                        </p>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium border-primary/30 hover:border-primary/50 bg-card text-foreground">
                                    <Download className="h-3.5 w-3.5 text-primary" />
                                    <span>Exportar</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[260px] bg-popover text-popover-foreground border-border shadow-md">
                                <DropdownMenuLabel className="text-xs font-semibold">Reportes Oficiales SUNAT</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="text-xs cursor-pointer p-2.5 focus:bg-accent">
                                    <a href={`/kardex/export/excel?${exportQueryString}`} className="flex items-start gap-2.5 w-full">
                                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 mt-0.5" />
                                        <div>
                                            <div className="font-semibold text-foreground">Formato 13.1 (.xlsx)</div>
                                            <div className="text-[11px] text-muted-foreground">Kardex valorizado detallado Excel</div>
                                        </div>
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="text-xs cursor-pointer p-2.5 focus:bg-accent">
                                    <a href={`/kardex/export/ple?${exportQueryString}`} className="flex items-start gap-2.5 w-full">
                                        <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                                        <div>
                                            <div className="font-semibold text-foreground">Libro PLE 13.1 (.txt)</div>
                                            <div className="text-[11px] text-muted-foreground">Estructura oficial para validador SUNAT</div>
                                        </div>
                                    </a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                                    <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Columnas</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] bg-popover text-popover-foreground border-border">
                                <DropdownMenuLabel className="text-xs font-semibold">Visibilidad de Columnas</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {table
                                    .getAllColumns()
                                    .filter((col) => typeof col.accessorFn !== 'undefined' && col.getCanHide())
                                    .map((col) => (
                                        <DropdownMenuCheckboxItem
                                            key={col.id}
                                            className="text-xs cursor-pointer capitalize"
                                            checked={col.getIsVisible()}
                                            onCheckedChange={(val) => col.toggleVisibility(!!val)}
                                        >
                                            {columnLabels[col.id] || col.id}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Pending Offline Movements Banner for Kardex */}
                {pendingOfflineMovements.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex flex-col gap-3 text-amber-900 dark:text-amber-200 text-xs shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-200/70 dark:bg-amber-800/60 shrink-0">
                                    <WifiOff className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">
                                        Existen {pendingOfflineMovements.length} {pendingOfflineMovements.length === 1 ? 'movimiento físico de contingencia' : 'movimientos físicos de contingencia'} pendientes de asiento en Kardex
                                    </p>
                                    <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                                        El stock físico comercial ya fue actualizado en tu dispositivo. Los asientos contables oficiales de Kardex SUNAT con correlatividad de secuencias se certificarán automáticamente al restablecer la conexión.
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowOfflineMovements(!showOfflineMovements)}
                                className="border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 gap-1.5 self-start sm:self-auto shrink-0 font-medium"
                            >
                                {showOfflineMovements ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                {showOfflineMovements ? 'Ocultar movimientos pendientes' : 'Ver movimientos pendientes'}
                            </Button>
                        </div>

                        {showOfflineMovements && (
                            <div className="border border-amber-200 dark:border-amber-800/80 rounded-lg overflow-hidden bg-background text-foreground mt-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/60 text-[11px]">
                                            <TableHead className="w-[130px]">Tipo Movimiento</TableHead>
                                            <TableHead className="w-[160px]">Código Comprobante</TableHead>
                                            <TableHead className="w-[110px]">Fecha</TableHead>
                                            <TableHead>Producto / Repuesto</TableHead>
                                            <TableHead className="text-right w-[110px]">Cantidad</TableHead>
                                            <TableHead className="w-[140px] text-center">Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingOfflineMovements.map((m, idx) => (
                                            <TableRow key={idx} className="text-xs">
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            m.type === 'SALIDA'
                                                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30 font-semibold'
                                                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold'
                                                        }
                                                    >
                                                        {m.type === 'SALIDA' ? '↓ Salida (Venta)' : '↑ Entrada (Compra)'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono font-medium">{m.document_number}</TableCell>
                                                <TableCell>{m.date}</TableCell>
                                                <TableCell className="font-medium">{m.product_name}</TableCell>
                                                <TableCell className="text-right font-mono font-bold">
                                                    {m.type === 'SALIDA' ? `-${m.quantity}` : `+${m.quantity}`}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {m.sync_status === 'FAILED' ? (
                                                        <Badge variant="destructive" className="text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">
                                                            Error de Sincronización
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                                                            Pendiente Sincronizar
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border shadow-xs flex flex-col gap-3">
                    <form onSubmit={handleFilter} className="flex flex-wrap gap-2.5 items-center">
                        <div className="relative min-w-[280px] flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por repuesto, código, referencia, documento o usuario..."
                                className="pl-8 h-9 text-xs bg-background border-input w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {canSeeAllBranches && (
                            <div className="w-[190px]">
                                <Select value={branchId} onValueChange={(val) => setBranchId(val)}>
                                    <SelectTrigger className="h-9 text-xs bg-background border-input">
                                        <SelectValue placeholder="Todas las sucursales" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todas las sucursales</SelectItem>
                                        {branches.map(b => (
                                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="w-[190px]">
                            <Select value={method} onValueChange={handleMethodChange}>
                                <SelectTrigger className="h-9 text-xs bg-background border-input font-medium">
                                    <SelectValue placeholder="Método" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AVERAGE" className="text-xs font-medium">
                                        Promedio Ponderado
                                    </SelectItem>
                                    <SelectItem value="PEPS" className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                        PEPS / FIFO (SUNAT)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-muted/40 border border-border px-2 py-0.5 rounded-lg text-xs">
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

                        <Button type="submit" variant="secondary" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                            <Filter className="h-3.5 w-3.5" />
                            Filtrar
                        </Button>

                        {((canSeeAllBranches && branchId !== 'ALL') || search || dateFrom || dateTo || method !== 'AVERAGE') && (
                            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <RotateCcw className="h-3.5 w-3.5" /> Limpiar
                            </Button>
                        )}
                    </form>
                </div>

                {method === 'PEPS' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-xl flex items-start gap-3 text-xs shadow-xs">
                        <div className="p-1.5 bg-amber-500/20 rounded-md text-amber-600 dark:text-amber-400 mt-0.5">
                            <Layers className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                <span>Modo Simulación PEPS / FIFO Activo (Auditoría Tributaria SUNAT)</span>
                                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-[10px] h-5">
                                    Proyección en Memoria
                                </Badge>
                            </div>
                            <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90 leading-relaxed text-[11px]">
                                Las salidas y los saldos están siendo valorizados bajo el método <strong>Primeras Entradas, Primeras Salidas</strong> capa por capa en orden cronológico.
                                Este cálculo es una proyección analítica en tiempo de ejecución y <strong>no modifica</strong> el costo promedio transaccional en la base de datos ni altera las operaciones diarias.
                            </p>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1150px] text-sm text-left border-collapse">
                            <thead className="bg-muted/40 border-b border-border">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <th key={header.id} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground align-middle">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {table.getRowModel().rows.length > 0 ? (
                                    table.getRowModel().rows.map((row) => (
                                        <tr key={row.id} className={`hover:bg-muted/30 transition-colors ${row.original.reversed_by_entry_id ? 'opacity-50 line-through' : ''}`}>
                                            {row.getVisibleCells().map((cell) => (
                                                <td key={cell.id} className="px-4 py-3 align-middle">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={columns.length} className="px-4 py-12 text-center text-xs text-muted-foreground">
                                            No se encontraron movimientos en el Kardex.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {entries.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20">
                            <div className="text-xs text-muted-foreground">
                                Mostrando {entries.data.length} de {entries.total} resultados
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {entries.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? "default" : "outline"}
                                        size="sm"
                                        asChild={!!link.url}
                                        disabled={!link.url}
                                        className={!link.url ? "opacity-50 h-8 text-xs" : "h-8 text-xs"}
                                    >
                                        {link.url ? (
                                            <Link preserveState href={link.url} dangerouslySetInnerHTML={{ __html: link.label }} />
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

KardexIndex.layout = {
    breadcrumbs: [
        { title: 'Inventario', href: '#' },
        { title: 'Kardex', href: '/kardex' },
    ],
};
