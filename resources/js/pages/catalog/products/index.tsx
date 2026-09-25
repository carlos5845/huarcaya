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
    PackageOpen, 
    Plus, 
    Edit, 
    Power, 
    PowerOff, 
    Search, 
    Box, 
    Layers, 
    Hash, 
    Settings, 
    SlidersHorizontal, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown 
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Brand = { id: number; name: string };
type Category = { id: number; name: string };
type Unit = { id: number; code: string; name: string };

type Product = {
    id: number;
    internal_code: string | null;
    primary_reference: string;
    name: string;
    product_type: 'SIMPLE' | 'KIT_UNICO' | 'KIT_COMPONENTES';
    status: 'ACTIVE' | 'INACTIVE';
    brand?: Brand | null;
    category?: Category | null;
    unit?: Unit | null;
};

type Pagination = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

type Props = {
    products: {
        data: Product[];
    } & Pagination;
    filters: {
        search?: string;
    };
    flash: {
        success?: string;
    };
};

const columnLabels: Record<string, string> = {
    primary_reference: 'Referencia / Código',
    name: 'Nombre del Repuesto',
    classification: 'Clasificación',
    product_type: 'Tipo de Producto',
    actions: 'Acciones',
};

export default function ProductsIndex({ products, filters, flash }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/products', { search: searchTerm }, { preserveState: true });
    };

    const toggleStatus = (product: Product) => {
        if (confirm(`¿Estás seguro de que deseas ${product.status === 'ACTIVE' ? 'desactivar' : 'reactivar'} este producto?`)) {
            router.delete(`/products/${product.id}`);
        }
    };

    const renderTypeBadge = (type: string) => {
        switch (type) {
            case 'SIMPLE':
                return <Badge variant="outline" className="flex w-fit items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"><Box className="h-3 w-3" /> Simple</Badge>;
            case 'KIT_UNICO':
                return <Badge variant="outline" className="flex w-fit items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"><Layers className="h-3 w-3" /> Kit Único</Badge>;
            case 'KIT_COMPONENTES':
                return <Badge variant="outline" className="flex w-fit items-center gap-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"><Layers className="h-3 w-3" /> Kit Comp.</Badge>;
            default:
                return <Badge>{type}</Badge>;
        }
    };

    const productList = useMemo(() => products.data || [], [products.data]);

    const columns = useMemo<ColumnDef<Product>[]>(() => [
        {
            id: 'primary_reference',
            accessorFn: row => row.primary_reference,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Referencia</span>
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
                const p = row.original;
                return (
                    <div>
                        <div className="font-bold text-sm text-foreground">{p.primary_reference}</div>
                        {p.internal_code && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                                <Hash className="h-3 w-3" /> {p.internal_code}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'name',
            accessorFn: row => row.name,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Nombre</span>
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
                <div className="font-medium text-xs text-foreground max-w-[320px] truncate" title={row.original.name}>
                    {row.original.name}
                </div>
            ),
        },
        {
            id: 'classification',
            accessorFn: row => `${row.brand?.name || ''} ${row.category?.name || ''}`,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Clasificación</span>
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
                const p = row.original;
                return (
                    <div className="text-xs space-y-0.5">
                        <div><span className="text-muted-foreground">Marca:</span> <span className="font-medium text-foreground">{p.brand?.name ?? 'S/M'}</span></div>
                        <div><span className="text-muted-foreground">Cat:</span> <span className="font-medium text-foreground">{p.category?.name ?? 'S/C'}</span></div>
                        <div><span className="text-muted-foreground">Und:</span> <span className="font-medium text-foreground">{p.unit?.code ?? 'N/A'}</span></div>
                    </div>
                );
            },
        },
        {
            id: 'product_type',
            accessorFn: row => row.product_type,
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
                const p = row.original;
                return (
                    <div className="flex flex-col gap-1.5">
                        {renderTypeBadge(p.product_type)}
                        {p.status !== 'ACTIVE' && (
                            <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 w-fit">INACTIVO</Badge>
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
            cell: ({ row }) => {
                const product = row.original;
                return (
                    <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" asChild title="Detalles">
                            <Link href={`/products/${product.id}`}>
                                <Settings className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" asChild title="Editar">
                            <Link href={`/products/${product.id}/edit`}>
                                <Edit className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                        <Button 
                            variant={product.status === 'ACTIVE' ? "outline" : "secondary"} 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleStatus(product)}
                            title={product.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar'}
                        >
                            {product.status === 'ACTIVE' ? <PowerOff className="h-3.5 w-3.5 text-rose-500" /> : <Power className="h-3.5 w-3.5 text-emerald-500" />}
                        </Button>
                    </div>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: productList,
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
            <Head title="Repuestos" />
            
            <div className="flex h-full flex-1 flex-col gap-5 p-4 max-w-7xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                            <PackageOpen className="h-6 w-6 text-primary" />
                            Catálogo de Repuestos
                        </h1>
                        <p className="text-muted-foreground text-xs mt-0.5">
                            El registro maestro único de repuestos y productos de la empresa
                        </p>
                    </div>
                    <Button asChild className="bg-primary text-primary-foreground font-semibold shadow-xs gap-2">
                        <Link href="/products/create">
                            <Plus className="h-4 w-4" />
                            Nuevo Repuesto
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-wrap justify-between items-center bg-card p-4 rounded-xl shadow-xs border border-border gap-3">
                    <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2">
                        <Input 
                            placeholder="Buscar por referencia, nombre, código o alias..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="flex-1 h-9 text-xs bg-background border-input"
                        />
                        <Button type="submit" variant="secondary" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                            <Search className="h-3.5 w-3.5" />
                            Buscar
                        </Button>
                    </form>

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

                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/40 border-b border-border">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <th key={header.id} className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground align-middle">
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
                                        <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                                            {row.getVisibleCells().map((cell) => (
                                                <td key={cell.id} className="px-6 py-3.5 align-middle">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={columns.length} className="px-6 py-12 text-center text-xs text-muted-foreground">
                                            {filters.search 
                                                ? "No se encontraron productos que coincidan con tu búsqueda."
                                                : "Aún no hay repuestos registrados en el catálogo maestro."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {products.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20">
                            <div className="text-xs text-muted-foreground">
                                Mostrando {products.data.length} de {products.total} resultados
                            </div>
                            <div className="flex gap-1">
                                {products.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? "default" : "outline"}
                                        size="sm"
                                        asChild={!!link.url}
                                        disabled={!link.url}
                                        className={!link.url ? "opacity-50 h-8 text-xs" : "h-8 text-xs"}
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

ProductsIndex.layout = {
    breadcrumbs: [
        { title: 'Catálogo', href: '#' },
        { title: 'Repuestos', href: '/products' },
    ],
};
