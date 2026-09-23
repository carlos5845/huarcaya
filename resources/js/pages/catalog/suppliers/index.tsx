import React, { useState, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
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
    Edit, 
    Trash2, 
    CheckCircle2, 
    SlidersHorizontal, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown,
    Truck,
    Building2,
    UserCheck,
    Phone,
    Mail,
    MapPin,
    Check,
    Eye,
    FileText,
    Sparkles,
    Loader2,
    FileSpreadsheet,
    WifiOff
} from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { toast } from 'sonner';
import { normalizeSearch, cn } from '@/lib/utils';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Catálogo', href: '#' },
    { title: 'Proveedores', href: '/suppliers' },
];

const columnLabels: Record<string, string> = {
    document: 'Documento',
    legal_name: 'Razón Social / Nombre',
    contact_name: 'Contacto',
    contact_info: 'Teléfono / Email',
    status: 'Estado',
    actions: 'Acciones',
};

export default function SuppliersIndex({ suppliers }: { suppliers: any[] }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // TanStack states
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const { data, setData, post, put, reset, errors, clearErrors, processing } = useForm({
        document_type: 'RUC',
        document_number: '',
        legal_name: '',
        trade_name: '',
        phone: '',
        email: '',
        address: '',
        contact_name: '',
        notes: '',
        status: 'ACTIVE',
    });

    const getDocumentConfig = (type: string) => {
        switch(type) {
            case 'RUC': 
                return { maxLength: 11, placeholder: '11 dígitos (10 o 20...)', exactLength: 11, label: 'RUC SUNAT' };
            case 'DNI': 
                return { maxLength: 8, placeholder: '8 dígitos numéricos', exactLength: 8, label: 'DNI Peruano' };
            case 'CE': 
                return { maxLength: 12, placeholder: 'Carnet de extranjería', exactLength: null, label: 'Extranjería' };
            case 'PASAPORTE': 
                return { maxLength: 15, placeholder: 'Número de pasaporte', exactLength: null, label: 'Pasaporte' };
            default: 
                return { maxLength: 20, placeholder: 'Número de documento', exactLength: null, label: 'Documento' };
        }
    };

    const docConfig = getDocumentConfig(data.document_type);

    const counts = useMemo(() => {
        const total = (suppliers || []).length;
        const active = (suppliers || []).filter(s => s.status === 'ACTIVE').length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [suppliers]);

    const filteredSuppliers = useMemo(() => {
        return (suppliers || []).filter(s => {
            const matchesSearch = 
                normalizeSearch(s.legal_name).includes(normalizeSearch(search)) ||
                (s.document_number && s.document_number.includes(search)) ||
                (s.trade_name && normalizeSearch(s.trade_name).includes(normalizeSearch(search))) ||
                (s.contact_name && normalizeSearch(s.contact_name).includes(normalizeSearch(search))) ||
                (s.phone && s.phone.includes(search)) ||
                (s.email && normalizeSearch(s.email).includes(normalizeSearch(search)));

            const matchesStatus = statusFilter === 'ALL' ? true : s.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [suppliers, search, statusFilter]);

    const openCreate = () => {
        setEditingId(null);
        reset();
        setData({
            document_type: 'RUC',
            document_number: '',
            legal_name: '',
            trade_name: '',
            phone: '',
            email: '',
            address: '',
            contact_name: '',
            notes: '',
            status: 'ACTIVE',
        });
        clearErrors();
        setIsOpen(true);
    };

    const openEdit = (supplier: any) => {
        setEditingId(supplier.id);
        setData({
            document_type: supplier.document_type || 'RUC',
            document_number: supplier.document_number || '',
            legal_name: supplier.legal_name || '',
            trade_name: supplier.trade_name || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            contact_name: supplier.contact_name || '',
            notes: supplier.notes || '',
            status: supplier.status || 'ACTIVE',
        });
        clearErrors();
        setIsOpen(true);
    };

    const { isOnline } = useNetworkStatus();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!isOnline) {
            toast.warning('Modo sin conexión', {
                description: 'La creación o edición de proveedores desde este módulo requiere conexión activa al servidor.',
            });
            return;
        }

        if (editingId) {
            put(`/suppliers/${editingId}`, {
                onSuccess: () => {
                    setIsOpen(false);
                    toast.success('Proveedor actualizado correctamente');
                },
                onError: () => toast.error('Error al actualizar proveedor'),
            });
        } else {
            post('/suppliers', {
                onSuccess: () => {
                    setIsOpen(false);
                    toast.success('Proveedor registrado correctamente');
                },
                onError: () => toast.error('Error al registrar proveedor'),
            });
        }
    };

    const toggleStatus = (id: number) => {
        if (!isOnline) {
            toast.warning('Modo sin conexión', {
                description: 'El cambio de estado de proveedores requiere conexión activa al servidor.',
            });
            return;
        }

        if (confirm('¿Estás seguro de cambiar el estado de este proveedor?')) {
            router.delete(`/suppliers/${id}`);
        }
    };

    // Contributor type detector
    const supplierContributorType = useMemo(() => {
        if (data.document_type === 'RUC') {
            if (data.document_number.startsWith('20')) {
                return 'Persona Jurídica (Empresa)';
            }
            if (data.document_number.startsWith('10')) {
                return 'Persona Natural con Negocio';
            }
            return 'RUC Jurídico / Proveedor';
        }
        if (data.document_type === 'DNI') {
            return 'Persona Natural';
        }
        return data.document_type || 'Proveedor';
    }, [data.document_type, data.document_number]);

    const columns = useMemo<ColumnDef<any>[]>(() => [
        {
            id: 'document',
            accessorFn: row => `${row.document_type || ''} ${row.document_number || ''}`,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Documento</span>
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
                    <div className="font-mono text-xs font-semibold text-foreground">{row.original.document_number || '-'}</div>
                    <div className="text-[11px] text-muted-foreground font-medium">{row.original.document_type || ''}</div>
                </div>
            ),
        },
        {
            id: 'legal_name',
            accessorFn: row => row.legal_name,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Razón Social / Nombre</span>
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
                    <div className="font-semibold text-xs text-foreground uppercase">{row.original.legal_name}</div>
                    {row.original.trade_name && (
                        <div className="text-[11px] text-muted-foreground">{row.original.trade_name}</div>
                    )}
                </div>
            ),
        },
        {
            id: 'contact_name',
            accessorFn: row => row.contact_name || '',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Contacto</span>
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
                <span className="text-xs text-foreground">{row.original.contact_name || '-'}</span>
            ),
        },
        {
            id: 'contact_info',
            accessorFn: row => `${row.phone || ''} ${row.email || ''}`,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Teléfono / Email</span>
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
                <div className="space-y-0.5">
                    {row.original.phone && <div className="text-xs font-mono text-muted-foreground">{row.original.phone}</div>}
                    {row.original.email && <div className="text-[11px] text-muted-foreground truncate max-w-[170px]">{row.original.email}</div>}
                    {!row.original.phone && !row.original.email && <span className="text-xs text-muted-foreground">-</span>}
                </div>
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
                const isActive = row.original.status === 'ACTIVE';
                return (
                    <div className="flex justify-center">
                        <Badge 
                            variant="outline"
                            className={cn(
                                "text-[11px] font-medium",
                                isActive 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                    : "bg-muted text-muted-foreground border-border"
                            )}
                        >
                            {isActive ? 'Activo' : 'Inactivo'}
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
                const s = row.original;
                return (
                    <div className="flex justify-end gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground" 
                            onClick={() => openEdit(s)} 
                            title="Editar proveedor"
                        >
                            <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                                "h-8 w-8",
                                s.status === 'ACTIVE' 
                                    ? "text-red-500 hover:text-red-600 hover:bg-red-500/10" 
                                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            )} 
                            onClick={() => toggleStatus(s.id)} 
                            title={s.status === 'ACTIVE' ? "Desactivar proveedor" : "Activar proveedor"}
                        >
                            {s.status === 'ACTIVE' ? <Trash2 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: filteredSuppliers,
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
            <Head title="Proveedores" />

            <div className="flex h-full flex-1 flex-col gap-5 rounded-xl p-4 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span className="text-foreground font-medium">Dashboard</span>
                            <span>&rsaquo;</span>
                            <span className="text-foreground font-medium">Catálogo</span>
                            <span>&rsaquo;</span>
                            <span className="text-foreground font-medium">Proveedores</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Truck className="h-6 w-6 text-primary" />
                            Directorio de Proveedores
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Administra fabricantes, distribuidores y contactos para abastecimiento y órdenes de compra
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
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

                        <Button onClick={openCreate} className="bg-primary text-primary-foreground font-semibold shadow-xs gap-2">
                            <Plus className="h-4 w-4" /> Nuevo Proveedor
                        </Button>
                    </div>
                </div>

                {!isOnline && (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                        <WifiOff className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                            <p className="font-semibold text-xs sm:text-sm">Estás trabajando en modo sin conexión</p>
                            <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-400">
                                La creación, edición y administración de proveedores en el catálogo requiere conexión activa con el servidor.
                            </p>
                        </div>
                    </div>
                )}

                {/* Filters Row: Search & Status Tabs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por nombre, RUC, contacto o teléfono..."
                            className="pl-8 h-9 text-xs bg-background border-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Tabs value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)} className="w-full sm:w-auto">
                        <TabsList className="grid grid-cols-3 w-full sm:w-auto h-9">
                            <TabsTrigger value="ALL" className="text-xs px-3">
                                Todos ({counts.total})
                            </TabsTrigger>
                            <TabsTrigger value="ACTIVE" className="text-xs px-3">
                                Activos ({counts.active})
                            </TabsTrigger>
                            <TabsTrigger value="INACTIVE" className="text-xs px-3">
                                Inactivos ({counts.inactive})
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Table */}
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
                                    <TableCell colSpan={columns.length} className="h-28 text-center text-xs text-muted-foreground">
                                        No se encontraron proveedores con los criterios especificados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* MODAL: NUEVO / EDITAR PROVEEDOR (Rediseñado en 2 Columnas) */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card text-card-foreground border-border">
                        <DialogHeader className="p-6 pb-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                    <Truck className="h-6 w-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold tracking-tight">
                                        {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                        {editingId 
                                            ? 'Actualiza los datos de facturación y contacto con el proveedor.' 
                                            : 'Registra un proveedor comercial para órdenes de compra y recepción de inventario.'}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {!isOnline && (
                                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs">
                                    <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                    <span>
                                        <strong>Modo sin conexión:</strong> Para guardar o modificar proveedores en el catálogo general se requiere conexión activa con el servidor.
                                    </span>
                                </div>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                
                                {/* Columna Izquierda: Formulario (7 columnas) */}
                                <div className="lg:col-span-7 space-y-5">
                                    
                                    {/* Bloque 1: Identificación Fiscal */}
                                    <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                                            <Building2 className="h-4 w-4 text-primary" />
                                            <span>Identificación Fiscal / SUNAT</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                            <div className="sm:col-span-5 space-y-1.5">
                                                <Label htmlFor="document_type" className="text-xs">
                                                    Tipo de Documento <span className="text-red-500">*</span>
                                                </Label>
                                                <Select 
                                                    value={data.document_type} 
                                                    onValueChange={(val) => {
                                                        setData('document_type', val);
                                                        const conf = getDocumentConfig(val);
                                                        if (conf.exactLength && data.document_number.length > conf.maxLength) {
                                                            setData('document_number', data.document_number.slice(0, conf.maxLength));
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full bg-background border-input h-9 text-xs">
                                                        <SelectValue placeholder="Seleccione..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="RUC">RUC (Empresa / Negocio)</SelectItem>
                                                        <SelectItem value="DNI">DNI (Persona Natural)</SelectItem>
                                                        <SelectItem value="CE">Carnet de Extranjería</SelectItem>
                                                        <SelectItem value="OTRO">Otro Documento</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <InputError message={errors.document_type} />
                                            </div>

                                            <div className="sm:col-span-7 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="document_number" className="text-xs">
                                                        Número de RUC / Documento <span className="text-red-500">*</span>
                                                    </Label>
                                                    {docConfig.exactLength && (
                                                        <span className={cn(
                                                            "text-[10px] font-mono",
                                                            data.document_number.length === docConfig.exactLength
                                                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                                                : "text-muted-foreground"
                                                        )}>
                                                            {data.document_number.length} / {docConfig.exactLength}
                                                        </span>
                                                    )}
                                                </div>
                                                <Input 
                                                    id="document_number" 
                                                    value={data.document_number} 
                                                    className="bg-background border-input h-9 text-xs font-mono font-semibold"
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (data.document_type === 'DNI' || data.document_type === 'RUC') {
                                                            val = val.replace(/\D/g, '');
                                                        }
                                                        if (docConfig.maxLength && val.length > docConfig.maxLength) {
                                                            val = val.slice(0, docConfig.maxLength);
                                                        }
                                                        setData('document_number', val);
                                                    }} 
                                                    placeholder={docConfig.placeholder}
                                                    maxLength={docConfig.maxLength}
                                                    required
                                                />
                                                <InputError message={errors.document_number} />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="legal_name" className="text-xs">
                                                Razón Social o Nombre del Proveedor <span className="text-red-500">*</span>
                                            </Label>
                                            <Input 
                                                id="legal_name" 
                                                className="bg-background border-input h-9 text-xs uppercase" 
                                                value={data.legal_name} 
                                                onChange={(e) => setData('legal_name', e.target.value)} 
                                                placeholder="Ej. DISTRIBUIDORA DE FILTROS DEL PERÚ S.A.C."
                                                required 
                                            />
                                            <InputError message={errors.legal_name} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="trade_name" className="text-xs">
                                                Nombre Comercial / Marca (Opcional)
                                            </Label>
                                            <Input 
                                                id="trade_name" 
                                                className="bg-background border-input h-9 text-xs" 
                                                value={data.trade_name} 
                                                onChange={(e) => setData('trade_name', e.target.value)} 
                                                placeholder="Ej. Filtros Perú"
                                            />
                                            <InputError message={errors.trade_name} />
                                        </div>
                                    </div>

                                    {/* Bloque 2: Contacto Comercial y Notas */}
                                    <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                                            <UserCheck className="h-4 w-4 text-primary" />
                                            <span>Contacto y Representante</span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="contact_name" className="text-xs">
                                                Persona de Contacto / Asesor de Ventas
                                            </Label>
                                            <Input 
                                                id="contact_name" 
                                                className="bg-background border-input h-9 text-xs" 
                                                value={data.contact_name} 
                                                onChange={(e) => setData('contact_name', e.target.value)} 
                                                placeholder="Ej. Ing. Carlos Mendoza (Ventas)"
                                            />
                                            <InputError message={errors.contact_name} />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="phone" className="text-xs">Teléfono / WhatsApp</Label>
                                                <Input 
                                                    id="phone" 
                                                    className="bg-background border-input h-9 text-xs font-mono" 
                                                    value={data.phone} 
                                                    onChange={(e) => setData('phone', e.target.value)} 
                                                    placeholder="Ej. (01) 456-7890 o 998877665"
                                                />
                                                <InputError message={errors.phone} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="email" className="text-xs">Correo Electrónico</Label>
                                                <Input 
                                                    id="email" 
                                                    type="email" 
                                                    className="bg-background border-input h-9 text-xs" 
                                                    value={data.email} 
                                                    onChange={(e) => setData('email', e.target.value)} 
                                                    placeholder="ventas@proveedor.com"
                                                />
                                                <InputError message={errors.email} />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="address" className="text-xs">Dirección / Planta / Almacén</Label>
                                            <Textarea 
                                                id="address" 
                                                className="bg-background border-input text-xs resize-none" 
                                                rows={2}
                                                value={data.address} 
                                                onChange={(e) => setData('address', e.target.value)} 
                                                placeholder="Av. Industrial 456, Parque Industrial..."
                                            />
                                            <InputError message={errors.address} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="notes" className="text-xs">
                                                Condiciones Comerciales / Notas Internas
                                            </Label>
                                            <Textarea 
                                                id="notes" 
                                                className="bg-background border-input text-xs resize-y" 
                                                rows={2}
                                                value={data.notes} 
                                                onChange={(e) => setData('notes', e.target.value)} 
                                                placeholder="Ej. Crédito a 30 días, entrega en almacén central, despachos los jueves..."
                                            />
                                            <InputError message={errors.notes} />
                                        </div>
                                    </div>

                                    {/* Bloque 3: Estado Operativo */}
                                    <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                                        <Label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                                            Estado del Proveedor
                                        </Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div 
                                                onClick={() => setData('status', 'ACTIVE')}
                                                className={cn(
                                                    "p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                                                    data.status === 'ACTIVE' 
                                                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
                                                        : "border-border bg-card hover:bg-muted/40"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "h-2.5 w-2.5 rounded-full",
                                                        data.status === 'ACTIVE' ? "bg-emerald-500" : "bg-muted-foreground"
                                                    )} />
                                                    <span className="text-xs font-medium">Activo</span>
                                                </div>
                                                {data.status === 'ACTIVE' && <Check className="h-4 w-4" />}
                                            </div>

                                            <div 
                                                onClick={() => setData('status', 'INACTIVE')}
                                                className={cn(
                                                    "p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                                                    data.status === 'INACTIVE' 
                                                        ? "border-muted-foreground/50 bg-muted/60 text-foreground" 
                                                        : "border-border bg-card hover:bg-muted/40"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "h-2.5 w-2.5 rounded-full",
                                                        data.status === 'INACTIVE' ? "bg-rose-500" : "bg-muted-foreground"
                                                    )} />
                                                    <span className="text-xs font-medium">Inactivo</span>
                                                </div>
                                                {data.status === 'INACTIVE' && <Check className="h-4 w-4" />}
                                            </div>
                                        </div>
                                        <InputError message={errors.status} />
                                    </div>

                                </div>

                                {/* Columna Derecha: Live Supplier Card Preview (5 columnas) */}
                                <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-0">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                                        <Eye className="h-4 w-4" />
                                        <span>Ficha de Proveedor en Vivo</span>
                                    </div>

                                    <Card className="border-2 border-primary/20 shadow-xs overflow-hidden">
                                        <div className="bg-primary/5 px-4 py-3 border-b border-primary/10 flex items-center justify-between">
                                            <Badge variant="outline" className="text-[10px] font-medium bg-background/80">
                                                {supplierContributorType}
                                            </Badge>
                                            <Badge 
                                                variant="outline" 
                                                className={cn(
                                                    "text-[10px] font-medium",
                                                    data.status === 'ACTIVE'
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                        : "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                {data.status === 'ACTIVE' ? 'Habilitado' : 'Bloqueado'}
                                            </Badge>
                                        </div>

                                        <CardContent className="p-4 space-y-3.5">
                                            <div>
                                                <div className="text-[11px] text-muted-foreground">Razón Social</div>
                                                <div className="text-sm font-bold uppercase text-foreground break-words mt-0.5">
                                                    {data.legal_name || 'NOMBRE DEL PROVEEDOR'}
                                                </div>
                                                {data.trade_name && (
                                                    <div className="text-xs text-muted-foreground mt-0.5 italic">
                                                        "{data.trade_name}"
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-2.5 rounded-lg bg-muted/40 border space-y-1">
                                                <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                                                    {data.document_type || 'RUC'}
                                                </div>
                                                <div className="text-sm font-bold font-mono tracking-wider text-foreground">
                                                    {data.document_number || '-----------'}
                                                </div>
                                            </div>

                                            <Separator />

                                            <div className="space-y-2 text-xs">
                                                {data.contact_name && (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <UserCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                        <span className="text-foreground font-medium">{data.contact_name}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                    <span className="font-mono text-foreground">{data.phone || 'Sin teléfono registrado'}</span>
                                                </div>

                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                    <span className="text-foreground truncate">{data.email || 'Sin correo registrado'}</span>
                                                </div>

                                                <div className="flex items-start gap-2 text-muted-foreground">
                                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                                                    <span className="text-foreground text-[11px] leading-tight">
                                                        {data.address || 'Sin dirección registrada'}
                                                    </span>
                                                </div>

                                                {data.notes && (
                                                    <div className="pt-1 text-[11px] bg-muted/40 p-2 rounded border text-muted-foreground">
                                                        <strong className="text-foreground">Condiciones:</strong> {data.notes}
                                                    </div>
                                                )}
                                            </div>

                                            <Separator />

                                            <div className="p-2.5 rounded-lg bg-primary/5 text-primary text-[11px] leading-relaxed flex items-start gap-2 border border-primary/10">
                                                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                <span>Disponible para Órdenes de Compra, Registro de Facturas y Cuentas por Pagar.</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                            </div>

                            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={processing || !isOnline}>
                                    {processing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <span>{isOnline ? (editingId ? 'Actualizar Proveedor' : 'Registrar Proveedor') : 'Conexión requerida'}</span>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

SuppliersIndex.layout = {
    breadcrumbs,
};
