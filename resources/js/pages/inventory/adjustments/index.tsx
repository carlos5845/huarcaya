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
    ClipboardList, 
    Plus, 
    Search, 
    Filter, 
    ArrowDownRight, 
    ArrowUpRight, 
    SlidersHorizontal, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown,
    RotateCcw,
    Eye
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PaginationData } from '@/types';

interface Adjustment {
    id: number;
    uuid: string;
    adjustment_number: string;
    operation_date: string;
    adjustment_type: string;
    status: string;
    notes: string;
    branch: {
        id: number;
        name: string;
    };
    creator: {
        id: number;
        name: string;
    } | null;
}

const columnLabels: Record<string, string> = {
    adjustment_number: 'N° Ajuste',
    branch: 'Sucursal',
    operation_date: 'Fecha',
    adjustment_type: 'Tipo de Ajuste',
    creator: 'Creado por',
    status: 'Estado',
    actions: 'Acciones',
};

export default function AdjustmentsIndex({ adjustments, filters }: { 
    adjustments: PaginationData<Adjustment>,
    filters: any 
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'ALL');
    const [type, setType] = useState(filters.type || 'ALL');

    // TanStack states
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const adjustmentData = useMemo(() => adjustments?.data || [], [adjustments?.data]);

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/inventory/adjustments', { 
            search, 
            status: status === 'ALL' ? '' : status, 
            type: type === 'ALL' ? '' : type 
        }, { preserveState: true });
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('ALL');
        setType('ALL');
        router.get('/inventory/adjustments');
    };

    const columns = useMemo<ColumnDef<Adjustment>[]>(() => [
        {
            id: 'adjustment_number',
            accessorFn: row => row.adjustment_number,
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
                    {row.original.adjustment_number}
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
                <span className="text-xs font-medium text-foreground">
                    {row.original.branch?.name || '-'}
                </span>
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
                <span className="text-xs text-foreground">
                    {new Date(row.original.operation_date).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
            ),
        },
        {
            id: 'adjustment_type',
            accessorFn: row => row.adjustment_type,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Tipo</span>
                    {column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
                    ) : column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
                    ) : (
                        <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                </Button>
            ),
            cell: ({ row }) => {
                const isPositive = row.original.adjustment_type === 'POSITIVE';
                return isPositive ? (
                    <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                        <ArrowDownRight className="h-3 w-3" /> ENTRADA
                    </Badge>
                ) : (
                    <Badge variant="outline" className="text-[11px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 gap-1">
                        <ArrowUpRight className="h-3 w-3" /> SALIDA
                    </Badge>
                );
            },
        },
        {
            id: 'creator',
            accessorFn: row => row.creator?.name || '',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Creado por</span>
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
                <span className="text-xs text-muted-foreground">{row.original.creator?.name || '-'}</span>
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
                const isConfirmed = row.original.status === 'CONFIRMED';
                return (
                    <div className="flex justify-center">
                        {isConfirmed ? (
                            <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Confirmado
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                Borrador
                            </Badge>
                        )}
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
                <div className="flex justify-end">
                    <Link href={`/inventory/adjustments/${row.original.id}`}>
                        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-medium">
                            <Eye className="h-3.5 w-3.5" /> Ver Detalle
                        </Button>
                    </Link>
                </div>
            ),
        },
    ], []);

    const table = useReactTable({
        data: adjustmentData,
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
            <Head title="Ajustes de Inventario" />
            
            <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto pb-10 px-4 mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span className="text-foreground font-medium">Dashboard</span>
                            <span>&rsaquo;</span>
                            <span className="text-foreground font-medium">Inventario</span>
                            <span>&rsaquo;</span>
                            <span className="text-foreground font-medium">Ajustes</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                            <ClipboardList className="h-6 w-6 text-primary" />
                            Ajustes Manuales de Inventario
                        </h1>
                        <p className="text-muted-foreground text-xs mt-0.5">
                            Registra entradas y salidas directas de stock por mermas, desmedros o balance inicial
                        </p>
                    </div>
                    <Button asChild className="bg-primary text-primary-foreground font-semibold shadow-xs gap-2">
                        <Link href="/inventory/adjustments/create">
                            <Plus className="h-4 w-4" />
                            Nuevo Ajuste
                        </Link>
                    </Button>
                </div>

                <div className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-xs">
                    <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-center">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por número o notas..."
                                className="pl-8 h-9 text-xs bg-background border-input"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        
                        <Select value={status} onValueChange={(val) => setStatus(val)}>
                            <SelectTrigger className="w-[160px] h-9 text-xs bg-background border-input">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los estados</SelectItem>
                                <SelectItem value="DRAFT">Borrador</SelectItem>
                                <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={type} onValueChange={(val) => setType(val)}>
                            <SelectTrigger className="w-[170px] h-9 text-xs bg-background border-input">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los tipos</SelectItem>
                                <SelectItem value="POSITIVE">Entrada (Positivo)</SelectItem>
                                <SelectItem value="NEGATIVE">Salida (Negativo)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button type="submit" variant="secondary" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                            <Filter className="h-3.5 w-3.5" />
                            Filtrar
                        </Button>

                        {(search || status !== 'ALL' || type !== 'ALL') && (
                            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <RotateCcw className="h-3.5 w-3.5" /> Limpiar
                            </Button>
                        )}

                        <div className="ml-auto">
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
                        </div>
                    </form>
                </div>

                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-muted/40 border-b border-border">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground align-middle">
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
                                            <TableCell key={cell.id} className="px-4 py-3 align-middle">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="px-4 py-8 text-center text-xs text-muted-foreground">
                                        No se encontraron ajustes con los filtros actuales.
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

AdjustmentsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventario', href: '/inventory' },
        { title: 'Ajustes', href: '/inventory/adjustments' }
    ]
};
