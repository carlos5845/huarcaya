import React, { useEffect, useState, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    Plus, 
    Eye, 
    SlidersHorizontal, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown,
    ArrowLeftRight,
    Truck,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Printer,
    FileText,
    Receipt,
    ClipboardList
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs = [
    { title: 'Transferencias', href: '/transfers' },
];

const columnLabels: Record<string, string> = {
    created_at: 'Fecha',
    transfer_number: 'N° Transferencia',
    source_branch: 'Sucursal Origen',
    destination_branch: 'Sucursal Destino',
    lines_count: 'Ítems / Líneas',
    status: 'Estado',
    actions: 'Acciones',
};

interface TransferMetrics {
    total_transfers: number;
    in_transit_count: number;
    completed_count: number;
    discrepancy_count: number;
    draft_count: number;
}

export default function TransfersIndex({ 
    transfers, 
    isSuperAdmin,
    metrics
}: { 
    transfers: any; 
    isSuperAdmin?: boolean;
    metrics?: TransferMetrics;
}) {
    // TanStack states
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['transfers'], preserveScroll: true, preserveState: true });
        }, 15000); // 15 seconds
        
        return () => clearInterval(interval);
    }, []);

    const transferData = useMemo(() => transfers?.data || [], [transfers?.data]);

    const columns = useMemo<ColumnDef<any>[]>(() => [
        {
            id: 'created_at',
            accessorFn: row => row.created_at,
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
                <span className="text-xs font-medium">
                    {new Date(row.original.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
            ),
        },
        {
            id: 'transfer_number',
            accessorFn: row => row.transfer_number,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Número</span>
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
                <span className="font-mono text-xs font-semibold text-foreground">
                    {row.original.transfer_number}
                </span>
            ),
        },
        {
            id: 'source_branch',
            accessorFn: row => row.source_branch?.name || '',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Origen</span>
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
                <span className="text-xs text-foreground font-medium">
                    {row.original.source_branch?.name || '-'}
                </span>
            ),
        },
        {
            id: 'destination_branch',
            accessorFn: row => row.destination_branch?.name || '',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Destino</span>
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
                <span className="text-xs text-foreground font-medium">
                    {row.original.destination_branch?.name || '-'}
                </span>
            ),
        },
        {
            id: 'lines_count',
            accessorFn: row => row.lines?.length || 0,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Líneas</span>
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
                <Badge variant="outline" className="text-xs">
                    {row.original.lines?.length || 0} items
                </Badge>
            ),
        },
        {
            id: 'status',
            accessorFn: row => row.status,
            header: ({ column }) => (
                <div className="text-center">
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
                </div>
            ),
            cell: ({ row }) => {
                const st = row.original.status;
                return (
                    <div className="flex justify-center">
                        {st === 'DRAFT' && <Badge variant="outline" className="text-[11px] bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30">Solicitado</Badge>}
                        {st === 'IN_TRANSIT' && <Badge variant="outline" className="text-[11px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">En Tránsito</Badge>}
                        {st === 'COMPLETED' && <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Completado</Badge>}
                        {st === 'WITH_DISCREPANCY' && <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">Con Observaciones</Badge>}
                        {st === 'CANCELLED' && <Badge variant="outline" className="text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">Cancelado</Badge>}
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
            cell: ({ row }) => (
                <div className="flex justify-end items-center gap-1.5">
                    <Link href={`/transfers/${row.original.id}`}>
                        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-medium">
                            <Eye className="h-3.5 w-3.5" /> Ver
                        </Button>
                    </Link>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Imprimir documentos">
                                <Printer className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[210px] bg-popover text-popover-foreground border-border shadow-md">
                            <DropdownMenuLabel className="text-xs font-semibold">Imprimir Traslado</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => window.open(`/transfers/${row.original.id}/print/internal?format=a4`, '_blank')}
                                className="cursor-pointer text-xs gap-2"
                            >
                                <FileText className="h-3.5 w-3.5 text-blue-600" /> Nota de Traslado (A4)
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => window.open(`/transfers/${row.original.id}/print/internal?format=ticket`, '_blank')}
                                className="cursor-pointer text-xs gap-2"
                            >
                                <Receipt className="h-3.5 w-3.5 text-emerald-600" /> Ticket Térmico (80 mm)
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => window.open(`/transfers/${row.original.id}/print/picking`, '_blank')}
                                className="cursor-pointer text-xs gap-2"
                            >
                                <ClipboardList className="h-3.5 w-3.5 text-amber-600" /> Hoja de Picking
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => window.open(`/transfers/${row.original.id}/print/guide`, '_blank')}
                                className="cursor-pointer text-xs gap-2"
                            >
                                <Truck className="h-3.5 w-3.5 text-primary" /> Guía Remitente (SUNAT)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ], []);

    const table = useReactTable({
        data: transferData,
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
            <Head title="Transferencias" />
            <div className="flex h-full flex-1 flex-col gap-5 p-4 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                            <span>&rsaquo;</span>
                            <span className="text-foreground font-medium">Transferencias</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Transferencias entre Sucursales
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Gestiona y monitorea envíos y recepciones de mercadería entre sucursales
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Column Visibility Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                                    <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Columnas</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[190px] bg-popover text-popover-foreground border-border">
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

                        <Link href="/transfers/create">
                            <Button className="bg-primary text-primary-foreground font-semibold shadow-xs gap-2">
                                <Plus className="h-4 w-4" /> Nueva Transferencia
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* 4 KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Transferencias
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <ArrowLeftRight className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-foreground">
                                {metrics?.total_transfers ?? 0}
                            </span>
                            <span className="text-xs text-muted-foreground">guías</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {metrics?.draft_count ?? 0} solicitudes en borrador
                        </p>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                En Tránsito
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                                <Truck className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-foreground">
                                {metrics?.in_transit_count ?? 0}
                            </span>
                            <span className="text-xs text-muted-foreground">despachadas</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Mercadería viajando entre sedes
                        </p>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Completadas
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-foreground">
                                {metrics?.completed_count ?? 0}
                            </span>
                            <span className="text-xs text-muted-foreground">recibidas</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Conformidad y stock acreditado
                        </p>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Con Observaciones
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-foreground">
                                {metrics?.discrepancy_count ?? 0}
                            </span>
                            <span className="text-xs text-muted-foreground">incidencias</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Discrepancias en cantidad/ítems
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-muted/40 border-b border-border">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="px-3 py-2 align-middle">
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
                                    <TableRow key={row.id} className="border-b border-border/70 hover:bg-muted/30 transition-colors">
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="px-3 py-3">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="text-center p-8 text-xs text-muted-foreground">
                                        No hay transferencias registradas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

TransfersIndex.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
