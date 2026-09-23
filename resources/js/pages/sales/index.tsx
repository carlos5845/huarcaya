import React, { useState, useMemo } from 'react';
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
    Search, 
    Plus, 
    Eye, 
    Filter, 
    SlidersHorizontal, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    RotateCcw,
    Calendar,
    Pencil,
    WifiOff,
    Clock,
    Trash2
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
import { useMergedSales } from '@/hooks/use-merged-sales';
import { OfflineSaleDetailDialog } from '@/components/offline-sale-detail-dialog';
import type { LocalOfflineSale } from '@/lib/db';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Ventas', href: '/sales' },
];

const columnLabels: Record<string, string> = {
    created_at: 'Fecha y Hora',
    customer: 'Cliente y Detalle',
    sale_type: 'Tipo Comprobante',
    payment_type: 'Condición Pago',
    series_number: 'Serie y Número',
    subtotal_amount: 'Op. Gravada',
    tax_amount: 'IGV',
    currency_code: 'Moneda',
    total_amount: 'Total Venta',
    status: 'Estado',
    actions: 'Acciones',
};

export default function SalesIndex({ sales, filters, branches = [], isSuperAdmin = false }: { sales: any, filters: any, branches?: any[], isSuperAdmin?: boolean }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [status, setStatus] = useState(filters?.status || 'ALL');
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');
    const [branchId, setBranchId] = useState(filters?.branch_id || '');

    // Offline detail modal state
    const [selectedOfflineSale, setSelectedOfflineSale] = useState<LocalOfflineSale | null>(null);
    const [openOfflineDialog, setOpenOfflineDialog] = useState(false);

    // TanStack states
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        subtotal_amount: true,
        tax_amount: true,
    });

    const { mergedSales, pendingOfflineCount, pendingOfflineTotal, discardOfflineSale } = useMergedSales(sales, branchId);


    const applyFilters = () => {
        router.get('/sales', { 
            search, 
            status: status === 'ALL' ? '' : status,
            date_from: dateFrom,
            date_to: dateTo,
            branch_id: branchId === 'ALL' ? '' : branchId
        }, { preserveState: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('ALL');
        setDateFrom('');
        setDateTo('');
        setBranchId('');
        router.get('/sales');
    };

    // Columns Definition
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
                    <span>Fecha y Hora</span>
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
                const date = new Date(row.original.created_at);
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-xs">{date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        <span className="text-[11px] text-muted-foreground">{date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    </div>
                );
            },
        },
        {
            id: 'customer',
            accessorFn: row => row.customer_name_snapshot || row.customer?.legal_name || '',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Cliente</span>
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
                    <div className="max-w-[220px]">
                        <div className="font-medium text-xs text-foreground truncate">{p.customer_name_snapshot || p.customer?.legal_name || 'Desconocido'}</div>
                        <div className="text-[11px] text-muted-foreground truncate" title={p.lines?.map((l: any) => l.product_name_snapshot || l.product?.name).join(', ')}>
                            {p.lines?.map((l: any) => l.product_name_snapshot || l.product?.name).join(', ') || 'Sin productos'}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'sale_type',
            accessorFn: row => row.sale_type,
            header: ({ column }) => (
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
            ),
            cell: ({ row }) => (
                <Badge variant="outline" className="text-[11px] font-semibold">{row.original.sale_type || 'N/A'}</Badge>
            ),
        },
        {
            id: 'payment_type',
            accessorFn: row => row.payment_type,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Condición</span>
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
                const isCredit = row.original.payment_type === 'CREDIT';
                return (
                    <Badge 
                        variant="outline" 
                        className={isCredit 
                            ? 'text-[11px] border-amber-500/40 text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' 
                            : 'text-[11px] border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'}
                    >
                        {isCredit ? 'Crédito' : 'Contado'}
                    </Badge>
                );
            },
        },
        {
            id: 'series_number',
            accessorFn: row => `${row.external_document_series || ''}-${row.external_document_number || ''}`,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Serie y N°</span>
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
                <span className="font-mono text-xs font-medium text-foreground">
                    {row.original.external_document_series ? `${row.original.external_document_series}-${row.original.external_document_number || ''}` : (row.original.external_document_number || '-')}
                </span>
            ),
        },
        {
            id: 'subtotal_amount',
            accessorFn: row => Number(row.subtotal_amount || 0),
            header: ({ column }) => (
                <div className="text-right">
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
                <div className="text-right">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-mr-3 ml-auto h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>IGV</span>
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
                const symbol = row.original.currency_code === 'USD' ? '$' : 'S/';
                return (
                    <div className="text-right text-xs text-muted-foreground">
                        {symbol} {Number(row.original.tax_amount || 0).toFixed(2)}
                    </div>
                );
            },
        },
        {
            id: 'currency_code',
            accessorFn: row => row.currency_code,
            header: ({ column }) => (
                <div className="text-center">
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
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-center text-xs font-medium">
                    {row.original.currency_code === 'USD' ? 'USD' : 'PEN'}
                </div>
            ),
        },
        {
            id: 'total_amount',
            accessorFn: row => Number(row.total_amount || 0),
            header: ({ column }) => (
                <div className="text-right">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-mr-3 ml-auto h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>Total Venta</span>
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
                const symbol = row.original.currency_code === 'USD' ? '$' : 'S/';
                return (
                    <div className="text-right font-bold text-xs text-foreground">
                        {symbol} {Number(row.original.total_amount || 0).toFixed(2)}
                    </div>
                );
            },
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
                const isOffline = row.original.is_offline;
                const st = row.original.status;

                if (isOffline) {
                    if (st === 'DRAFT_LOCAL') {
                        return (
                            <div className="flex justify-center">
                                <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-medium">
                                    <Clock className="h-3 w-3" />
                                    Borrador Local
                                </Badge>
                            </div>
                        );
                    }
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-medium">
                                <WifiOff className="h-3 w-3" />
                                Pendiente Sincronizar
                            </Badge>
                        </div>
                    );
                }

                if (st === 'DRAFT') {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
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

                if (p.is_offline) {
                    return (
                        <div className="flex justify-end items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSelectedOfflineSale(p.raw_offline_data);
                                    setOpenOfflineDialog(true);
                                }}
                                className="h-8 gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            >
                                <Eye className="h-3.5 w-3.5" /> Ver Detalle
                            </Button>
                            {p.status === 'DRAFT_LOCAL' && (
                                <Link href={`/sales/create?offline_uuid=${p.uuid}`}>
                                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40">
                                        <Pencil className="h-3.5 w-3.5" /> Editar
                                    </Button>
                                </Link>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (confirm('¿Deseas descartar esta venta offline? Se cancelará el envío y se repondrá el inventario local.')) {
                                        discardOfflineSale(p.uuid);
                                    }
                                }}
                                className="h-8 gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Descartar
                            </Button>
                        </div>
                    );
                }

                return (
                    <div className="flex justify-end items-center gap-1.5">
                        <Link href={`/sales/${p.id}`}>
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-medium">
                                <Eye className="h-3.5 w-3.5" /> Ver
                            </Button>
                        </Link>
                        {p.status === 'DRAFT' && (
                            <Link href={`/sales/${p.id}/edit`}>
                                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-medium">
                                    <Pencil className="h-3.5 w-3.5" /> Editar
                                </Button>
                            </Link>
                        )}
                    </div>
                );
            },
        },
    ], [discardOfflineSale]);

    const table = useReactTable({
        data: mergedSales,
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
            <Head title="Ventas" />

            <div className="flex h-full flex-1 flex-col gap-5 rounded-xl p-4 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                            <span>&rsaquo;</span>
                            <span className="text-foreground font-medium">Ventas</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Registro de Ventas
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Historial de facturación, boletas, cotizaciones y salidas comerciales
                        </p>
                    </div>

                    <Link href="/sales/create">
                        <Button className="bg-primary text-primary-foreground font-semibold shadow-xs gap-2">
                            <Plus className="h-4 w-4" /> Nueva Venta
                        </Button>
                    </Link>
                </div>

                {/* Pending Offline Sales Summary Banner */}
                {pendingOfflineCount > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-200/70 dark:bg-amber-800/60 shrink-0">
                                <WifiOff className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">
                                    {pendingOfflineCount} {pendingOfflineCount === 1 ? 'venta registrada en modo offline' : 'ventas registradas en modo offline'}
                                </p>
                                <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                                    Monto acumulado: <span className="font-bold font-mono">S/ {pendingOfflineTotal.toFixed(2)}</span>. El inventario local fue descontado preventivamente; se enviarán al servidor central al restablecerse la conexión.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter and Table Customization Bar */}
                <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar cliente, producto o doc..."
                                className="pl-8 h-9 text-xs bg-background border-input"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
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
                                <SelectItem value="CANCELLED">Anulado</SelectItem>
                            </SelectContent>
                        </Select>

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

                        {isSuperAdmin && branches && branches.length > 0 && (
                            <Select value={branchId} onValueChange={(val) => setBranchId(val)}>
                                <SelectTrigger className="w-[170px] h-9 text-xs bg-background border-input">
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

                        <Button variant="secondary" size="sm" onClick={applyFilters} className="h-9 gap-1.5 text-xs font-semibold">
                            <Filter className="h-3.5 w-3.5" /> Filtrar
                        </Button>

                        {(search || status !== 'ALL' || dateFrom || dateTo || branchId) && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <RotateCcw className="h-3.5 w-3.5" /> Limpiar
                            </Button>
                        )}

                        {/* Column Visibility Menu */}
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
                                        No se encontraron ventas con los filtros actuales.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <OfflineSaleDetailDialog
                sale={selectedOfflineSale}
                open={openOfflineDialog}
                onOpenChange={setOpenOfflineDialog}
                onDiscard={discardOfflineSale}
            />
        </>
    );
}

SalesIndex.layout = {
    breadcrumbs,
};
