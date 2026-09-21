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
    ChevronsUpDown, 
    X,
    RotateCcw
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
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
    operation_date: 'Fecha y Referencia',
    operation_type: 'Operación y Usuario',
    product: 'Producto',
    input_group: 'Entradas (Cant, CU, Total)',
    output_group: 'Salidas (Cant, CU, Total)',
    balance_group: 'Saldos (Cant, CUP, Total)',
};

export default function KardexIndex({ entries, branches, selectedProduct, filters, canSeeAllBranches = false }: { 
    canSeeAllBranches?: boolean, 
    entries: PaginationData, 
    branches: any[], 
    selectedProduct: any | null, 
    filters: any 
}) {
    const [branchId, setBranchId] = useState(filters.branch_id || 'ALL');
    const [productId, setProductId] = useState(filters.product_id || '');
    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const [searchProductQuery, setSearchProductQuery] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [isSearchingProduct, setIsSearchingProduct] = useState(false);
    const [openProductCombo, setOpenProductCombo] = useState(false);
    const [displayProductName, setDisplayProductName] = useState(selectedProduct ? `${selectedProduct.primary_reference || selectedProduct.internal_code || 'Sin cód'} - ${selectedProduct.name}` : 'Todos los productos');

    // TanStack states
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    useEffect(() => {
        if (searchProductQuery.length < 2) {
            setProductResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            setIsSearchingProduct(true);
            fetch(`/products/search?q=${encodeURIComponent(searchProductQuery)}`, {
                headers: { 'Accept': 'application/json' }
            })
            .then(res => res.json())
            .then(data => {
                setProductResults(data);
                setIsSearchingProduct(false);
            })
            .catch(() => setIsSearchingProduct(false));
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchProductQuery]);

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/kardex', { 
            branch_id: branchId === 'ALL' ? '' : branchId, 
            product_id: productId,
            search,
            date_from: dateFrom,
            date_to: dateTo
        }, { preserveState: true });
    };

    const clearFilters = () => {
        setBranchId('ALL');
        setProductId('');
        setDisplayProductName('Todos los productos');
        setSearch('');
        setDateFrom('');
        setDateTo('');
        router.get('/kardex');
    };

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
            accessorFn: row => Number(row.input_quantity || 0),
            header: () => (
                <div className="text-center font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Entradas (Cant / CU / Total)
                </div>
            ),
            cell: ({ row }) => (
                <div className="grid grid-cols-3 text-right text-xs gap-1 bg-emerald-500/5 px-2 py-1.5 rounded">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatQty(row.original.input_quantity)}</span>
                    <span className="text-muted-foreground">{formatCurrency(row.original.input_unit_cost)}</span>
                    <span className="font-medium text-foreground">{formatCurrency(row.original.input_total_cost)}</span>
                </div>
            ),
        },
        {
            id: 'output_group',
            accessorFn: row => Number(row.output_quantity || 0),
            header: () => (
                <div className="text-center font-bold text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Salidas (Cant / CU / Total)
                </div>
            ),
            cell: ({ row }) => (
                <div className="grid grid-cols-3 text-right text-xs gap-1 bg-orange-500/5 px-2 py-1.5 rounded">
                    <span className="font-medium text-orange-600 dark:text-orange-400">{formatQty(row.original.output_quantity)}</span>
                    <span className="text-muted-foreground">{formatCurrency(row.original.output_unit_cost)}</span>
                    <span className="font-medium text-foreground">{formatCurrency(row.original.output_total_cost)}</span>
                </div>
            ),
        },
        {
            id: 'balance_group',
            accessorFn: row => Number(row.balance_quantity || 0),
            header: () => (
                <div className="text-center font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Saldos (Cant / CUP / Total)
                </div>
            ),
            cell: ({ row }) => (
                <div className="grid grid-cols-3 text-right text-xs gap-1 bg-blue-500/5 px-2 py-1.5 rounded">
                    <span className="font-bold text-blue-600 dark:text-blue-400">{formatQty(row.original.balance_quantity)}</span>
                    <span className="text-muted-foreground">{formatCurrency(row.original.balance_unit_cost)}</span>
                    <span className="font-medium text-foreground">{formatCurrency(row.original.balance_total_cost)}</span>
                </div>
            ),
        },
    ], []);

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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span className="text-foreground font-medium">Dashboard</span>
                            <span>&rsaquo;</span>
                            <span className="text-foreground font-medium">Inventario</span>
                            <span>&rsaquo;</span>
                            <span className="text-foreground font-medium">Kardex</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                            <History className="h-6 w-6 text-primary" />
                            Kardex Valorizado
                        </h1>
                        <p className="text-muted-foreground text-xs mt-0.5">
                            Auditoría de movimientos de inventario, costo promedio ponderado y trazabilidad
                        </p>
                    </div>

                    <div className="ml-auto">
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

                <div className="bg-card text-card-foreground p-4 rounded-xl border border-border shadow-xs flex flex-col gap-3">
                    <form onSubmit={handleFilter} className="flex flex-wrap gap-2.5 items-center">
                        <div className="relative min-w-[180px] flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por usuario o referencia..."
                                className="pl-8 h-9 text-xs bg-background border-input"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="w-[180px]">
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

                        <div className="flex-1 min-w-[220px]">
                            <Popover open={openProductCombo} onOpenChange={setOpenProductCombo}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openProductCombo}
                                        className="w-full h-9 justify-between font-normal text-xs bg-background border-input"
                                    >
                                        <span className="truncate mr-2">
                                            {displayProductName}
                                        </span>
                                        {productId ? (
                                            <X 
                                                className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setProductId('');
                                                    setDisplayProductName('Todos los productos');
                                                }}
                                            />
                                        ) : (
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[360px] p-0 bg-popover text-popover-foreground border-border" align="start">
                                    <Command shouldFilter={false}>
                                        <CommandInput 
                                            placeholder="Buscar repuesto..." 
                                            value={searchProductQuery}
                                            onValueChange={setSearchProductQuery}
                                            className="h-9 text-xs"
                                        />
                                        <CommandList>
                                            {isSearchingProduct && <CommandEmpty>Buscando...</CommandEmpty>}
                                            {!isSearchingProduct && productResults.length === 0 && searchProductQuery.length >= 2 && (
                                                <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                            )}
                                            {!isSearchingProduct && searchProductQuery.length < 2 && (
                                                <div className="py-6 text-center text-xs text-muted-foreground">
                                                    Escribe al menos 2 caracteres...
                                                </div>
                                            )}
                                            <CommandGroup>
                                                {productResults.map((product) => {
                                                    const totalStock = product.inventories?.reduce((acc: number, inv: any) => acc + Number(inv.quantity), 0) || 0;
                                                    const sku = product.primary_reference || product.internal_code || 'Sin SKU';
                                                    
                                                    return (
                                                        <CommandItem
                                                            key={product.id}
                                                            value={product.id.toString()}
                                                            onSelect={() => {
                                                                setProductId(product.id.toString());
                                                                setDisplayProductName(`${sku} - ${product.name}`);
                                                                setOpenProductCombo(false);
                                                            }}
                                                            className="flex flex-col items-start py-2 cursor-pointer"
                                                        >
                                                            <div className="font-medium text-xs">{product.name}</div>
                                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                                SKU: {sku} | Stock: {totalStock}
                                                            </div>
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
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

                        {(branchId !== 'ALL' || productId || search || dateFrom || dateTo) && (
                            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <RotateCcw className="h-3.5 w-3.5" /> Limpiar
                            </Button>
                        )}
                    </form>
                </div>

                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
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
