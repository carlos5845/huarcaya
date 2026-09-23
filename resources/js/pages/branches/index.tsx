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
    Building, 
    Building2,
    Plus, 
    Edit, 
    Store, 
    Power, 
    PowerOff, 
    Phone, 
    MapPin, 
    SlidersHorizontal, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown,
    Sparkles,
    CheckCircle2,
    WifiOff
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UbigeoSelects } from '@/components/ubigeo-selects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Branch = {
    id: number;
    uuid: string;
    company_id: number;
    name: string;
    code: string | null;
    department?: string | null;
    province?: string | null;
    district?: string | null;
    address: string | null;
    phone: string | null;
    type: string;
    status: string;
    created_at: string;
};

type Props = {
    branches: Branch[];
    flash: {
        success?: string;
    };
};

const columnLabels: Record<string, string> = {
    code: 'Código',
    name: 'Nombre Sucursal',
    type: 'Tipo',
    status: 'Estado',
    ubigeo: 'Ubicación (Ubigeo)',
    contact: 'Contacto / Dirección',
    actions: 'Acciones',
};

export default function BranchesIndex({ branches, flash }: Props) {
    const { isOnline } = useNetworkStatus();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [depDict, setDepDict] = useState<Record<string, string>>({});
    const [provDict, setProvDict] = useState<Record<string, string>>({});
    const [distDict, setDistDict] = useState<Record<string, string>>({});

    // TanStack states
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [statusFilter, setStatusFilter] = useState('ACTIVE');

    useEffect(() => {
        fetch('/data/ubigeo/ubigeo_peru_2016_departamentos.json').then(res => res.json()).then((data: any[]) => { const dict: Record<string, string> = {}; data.forEach(d => dict[d.id] = d.name); setDepDict(dict); }).catch(() => {});
        fetch('/data/ubigeo/ubigeo_peru_2016_provincias.json').then(res => res.json()).then((data: any[]) => { const dict: Record<string, string> = {}; data.forEach(d => dict[d.id] = d.name); setProvDict(dict); }).catch(() => {});
        fetch('/data/ubigeo/ubigeo_peru_2016_distritos.json').then(res => res.json()).then((data: any[]) => { const dict: Record<string, string> = {}; data.forEach(d => dict[d.id] = d.name); setDistDict(dict); }).catch(() => {});
    }, []);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    const { data: createData, setData: setCreateData, post: createPost, processing: createProcessing, errors: createErrors, reset: createReset } = useForm({
        name: '',
        code_prefix: 'SUC',
        code: '',
        address: '',
        phone: '',
        type: 'STORE',
        status: 'ACTIVE',
        department: '',
        province: '',
        district: '',
    });

    const { data: editData, setData: setEditData, put: editPut, processing: editProcessing, errors: editErrors, reset: editReset } = useForm({
        name: '',
        code: '',
        address: '',
        phone: '',
        type: 'STORE',
        status: 'ACTIVE',
        department: '',
        province: '',
        district: '',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!isOnline) {
            toast.warning('Modo sin conexión', {
                description: 'La creación de sucursales requiere conexión activa al servidor.',
            });
            return;
        }

        createPost('/branches', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createReset();
                toast.success('Sucursal creada exitosamente');
            },
            onError: () => toast.error('Error al registrar sucursal'),
        });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBranch) return;

        if (!isOnline) {
            toast.warning('Modo sin conexión', {
                description: 'La edición de sucursales requiere conexión activa al servidor.',
            });
            return;
        }

        editPut(`/branches/${editingBranch.id}`, {
            onSuccess: () => {
                setIsEditOpen(false);
                editReset();
                toast.success('Sucursal actualizada exitosamente');
            },
            onError: () => toast.error('Error al actualizar sucursal'),
        });
    };

    const toggleStatus = (branch: Branch) => {
        if (!isOnline) {
            toast.warning('Modo sin conexión', {
                description: 'El cambio de estado de sucursales requiere conexión activa al servidor.',
            });
            return;
        }

        if (confirm(`¿Estás seguro de que deseas ${branch.status === 'ACTIVE' ? 'desactivar' : 'reactivar'} esta sucursal?`)) {
            router.delete(`/branches/${branch.id}`);
        }
    };

    const openEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setEditData({
            name: branch.name,
            code: branch.code || '',
            address: branch.address || '',
            phone: branch.phone || '',
            type: branch.type,
            status: branch.status,
            department: branch.department || '',
            province: branch.province || '',
            district: branch.district || '',
        });
        setIsEditOpen(true);
    };

    const filteredBranches = useMemo(() => {
        return (branches || []).filter(b => {
            if (statusFilter === 'ACTIVE') return b.status === 'ACTIVE';
            if (statusFilter === 'INACTIVE') return b.status === 'INACTIVE';
            return true;
        });
    }, [branches, statusFilter]);

    const branchList = filteredBranches;

    const renderBranchPreview = (data: {
        name: string;
        type: string;
        code_prefix?: string;
        code?: string;
        department?: string;
        province?: string;
        district?: string;
        address?: string;
        phone?: string;
        status?: string;
    }, isEdit: boolean = false) => {
        const isStore = data.type === 'STORE';
        const depName = data.department ? depDict[data.department] : '';
        const provName = data.province ? provDict[data.province] : '';
        const distName = data.district ? distDict[data.district] : '';
        const locationParts = [distName, provName, depName].filter(Boolean);
        const locationStr = locationParts.length > 0 ? locationParts.join(', ') : 'Ubicación aún no seleccionada';

        return (
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg border ${
                            isStore 
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                            {isStore ? <Store className="h-4 w-4" /> : <Building className="h-4 w-4" />}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-foreground">
                                {data.name || 'Nombre de la Sucursal'}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono font-semibold text-foreground">
                                    {isEdit ? (data.code || 'S/N') : `${data.code_prefix || 'SUC'}-XXX (Correlativo)`}
                                </span>
                                <span>&bull;</span>
                                <span>{isStore ? 'Tienda Comercial' : 'Almacén / Depósito'}</span>
                            </div>
                        </div>
                    </div>

                    <Badge variant="outline" className={`text-[11px] ${
                        data.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    }`}>
                        {data.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50 text-muted-foreground">
                    <div className="flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <span className="text-foreground font-medium truncate block">{locationStr}</span>
                            {data.address && <span className="text-[11px] text-muted-foreground line-clamp-1">{data.address}</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-foreground font-medium">{data.phone || 'Sin teléfono asignado'}</span>
                    </div>
                </div>
            </div>
        );
    };

    const columns = useMemo<ColumnDef<Branch>[]>(() => [
        {
            id: 'code',
            accessorFn: row => row.code || '',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Código</span>
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
                    {row.original.code || 'S/N'}
                </span>
            ),
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
                <div className="font-medium text-xs text-foreground flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{row.original.name}</span>
                </div>
            ),
        },
        {
            id: 'type',
            accessorFn: row => row.type,
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
            cell: ({ row }) => (
                row.original.type === 'STORE' ? (
                    <Badge variant="outline" className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">Tienda</Badge>
                ) : (
                    <Badge variant="outline" className="text-[11px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">Almacén</Badge>
                )
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
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            isActive 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}>
                            {isActive ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'ubigeo',
            accessorFn: row => `${row.department || ''} ${row.province || ''} ${row.district || ''}`,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Ubigeo</span>
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
                const branch = row.original;
                return (
                    <div className="text-xs text-muted-foreground">
                        {branch.department ? `${depDict[branch.department] || ''}, ${provDict[branch.province || ''] || ''}, ${distDict[branch.district || ''] || ''}` : '-'}
                    </div>
                );
            },
        },
        {
            id: 'contact',
            accessorFn: row => `${row.phone || ''} ${row.address || ''}`,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Contacto / Dirección</span>
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
                const branch = row.original;
                return (
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {branch.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {branch.phone}</span>}
                        {branch.address && <span className="flex items-center gap-1 text-[11px] truncate max-w-[200px]" title={branch.address}><MapPin className="h-3 w-3" /> {branch.address}</span>}
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
                const branch = row.original;
                return (
                    <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(branch)} title="Editar">
                            <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0" 
                            onClick={() => toggleStatus(branch)}
                            title={branch.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar'}
                        >
                            {branch.status === 'ACTIVE' ? <PowerOff className="h-3.5 w-3.5 text-rose-500" /> : <Power className="h-3.5 w-3.5 text-emerald-500" />}
                        </Button>
                    </div>
                );
            },
        },
    ], [depDict, provDict, distDict]);

    const table = useReactTable({
        data: branchList,
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
            <Head title="Gestión de Sucursales" />
            
            <div className="flex h-full flex-1 flex-col gap-5 p-4 max-w-7xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span className="text-foreground font-medium">Dashboard</span>
                            <span>&rsaquo;</span>
                            <span className="text-foreground font-medium">Sucursales</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                            <Building className="h-6 w-6 text-primary" />
                            Sucursales y Almacenes
                        </h1>
                        <p className="text-muted-foreground text-xs mt-0.5">Administra las sedes, tiendas y bodegas comerciales del sistema</p>
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

                        <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground font-semibold shadow-xs gap-2">
                            <Plus className="h-4 w-4" />
                            Nueva Sucursal
                        </Button>
                    </div>
                </div>

                {!isOnline && (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                        <WifiOff className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                            <p className="font-semibold text-xs sm:text-sm">Estás trabajando en modo sin conexión</p>
                            <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-400">
                                La creación, edición y administración de sucursales requiere conexión activa con el servidor.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between gap-4">
                    <Tabs defaultValue="ACTIVE" onValueChange={setStatusFilter} className="w-full">
                        <TabsList className="bg-muted/50 border border-border">
                            <TabsTrigger value="ACTIVE" className="text-xs">Activas</TabsTrigger>
                            <TabsTrigger value="INACTIVE" className="text-xs">Inactivas</TabsTrigger>
                            <TabsTrigger value="ALL" className="text-xs">Todas</TabsTrigger>
                        </TabsList>
                    </Tabs>
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
                                        <td colSpan={columns.length} className="px-6 py-8 text-center text-xs text-muted-foreground">
                                            No hay sucursales registradas con este filtro.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Crear Sucursal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Building className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">Nueva Sucursal o Almacén</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Registra una nueva tienda de ventas o depósito de almacenamiento para la empresa.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleCreate} className="space-y-4 py-1">
                        {!isOnline && (
                            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs">
                                <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>
                                    <strong>Modo sin conexión:</strong> Para registrar nuevas sucursales se requiere conexión activa con el servidor.
                                </span>
                            </div>
                        )}
                        {/* 1. Identificación y Tipo Operativo */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Identificación y Rol Operativo</h3>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs font-semibold">Nombre de la Sucursal <span className="text-red-500">*</span></Label>
                                <Input 
                                    id="name" 
                                    className="bg-background border-input text-xs" 
                                    placeholder="Ej. Sucursal Huancayo Centro, Almacén San Jerónimo..." 
                                    value={createData.name} 
                                    onChange={(e) => setCreateData('name', e.target.value)} 
                                    required 
                                />
                                <InputError message={createErrors.name} />
                            </div>

                            {/* Selector Interactivo de Tipo Operativo */}
                            <div className="space-y-1.5 pt-1">
                                <Label className="text-xs font-semibold">Tipo de Establecimiento <span className="text-red-500">*</span></Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div 
                                        onClick={() => setCreateData('type', 'STORE')}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                            createData.type === 'STORE'
                                                ? 'bg-primary/5 border-primary text-foreground ring-1 ring-primary/30'
                                                : 'bg-card border-border hover:bg-muted/40 text-muted-foreground'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg border ${
                                            createData.type === 'STORE'
                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                                : 'bg-muted text-muted-foreground border-border'
                                        }`}>
                                            <Store className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-foreground flex items-center justify-between">
                                                <span>Tienda Comercial</span>
                                                {createData.type === 'STORE' && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                                Atención directa al público, emisión de comprobantes, cotizaciones y ventas en mostrador.
                                            </p>
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => setCreateData('type', 'WAREHOUSE')}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                            createData.type === 'WAREHOUSE'
                                                ? 'bg-primary/5 border-primary text-foreground ring-1 ring-primary/30'
                                                : 'bg-card border-border hover:bg-muted/40 text-muted-foreground'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg border ${
                                            createData.type === 'WAREHOUSE'
                                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                : 'bg-muted text-muted-foreground border-border'
                                        }`}>
                                            <Building className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-foreground flex items-center justify-between">
                                                <span>Almacén / Depósito</span>
                                                {createData.type === 'WAREHOUSE' && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                                Custodia de stock, recepción de proveedores, despacho y transferencias entre sucursales.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <InputError message={createErrors.type} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Prefijo del Código Interno <span className="text-red-500">*</span></Label>
                                    <Select value={createData.code_prefix} onValueChange={(val) => setCreateData('code_prefix', val)}>
                                        <SelectTrigger className="w-full bg-background border-input text-xs">
                                            <SelectValue placeholder="Seleccionar prefijo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SUC" className="text-xs font-medium">SUC (Sucursal / Tienda de Ventas)</SelectItem>
                                            <SelectItem value="SED" className="text-xs font-medium">SED (Sede Central / Almacén)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">
                                        El sistema generará el correlativo automático: <span className="font-mono font-semibold text-foreground">{createData.code_prefix}-00X</span>.
                                    </p>
                                    <InputError message={createErrors.code_prefix} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="create_status" className="text-xs font-semibold">Estado Inicial</Label>
                                    <Select value={createData.status} onValueChange={(val) => setCreateData('status', val)}>
                                        <SelectTrigger id="create_status" className="w-full bg-background border-input text-xs">
                                            <SelectValue placeholder="Selecciona estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Activa (Operativa)</SelectItem>
                                            <SelectItem value="INACTIVE" className="text-xs text-rose-600 dark:text-rose-400 font-medium">Inactiva (Cerrada)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={createErrors.status} />
                                </div>
                            </div>
                        </div>

                        {/* 2. Ubicación Geográfica */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Ubicación Geográfica (Ubigeo)</h3>
                            </div>
                            
                            <UbigeoSelects 
                                department={createData.department || ""}
                                province={createData.province || ""}
                                district={createData.district || ""}
                                onDepartmentChange={(val) => setCreateData('department', val)}
                                onProvinceChange={(val) => setCreateData('province', val)}
                                onDistrictChange={(val) => setCreateData('district', val)}
                            />

                            <div className="space-y-1.5 pt-1">
                                <Label htmlFor="address" className="text-xs font-semibold">Dirección Física o Referencia Comercial</Label>
                                <Input 
                                    id="address" 
                                    className="bg-background border-input text-xs" 
                                    placeholder="Ej. Av. Ferrocarril 456 (frente a la plaza principal)" 
                                    value={createData.address || ""} 
                                    onChange={(e) => setCreateData('address', e.target.value)} 
                                />
                                <InputError message={createErrors.address} />
                            </div>
                        </div>

                        {/* 3. Contacto y Previsualización */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <Phone className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Contacto y Previsualización</h3>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-xs font-semibold">Teléfono / Celular de la Sede</Label>
                                <Input 
                                    id="phone" 
                                    className="bg-background border-input text-xs" 
                                    placeholder="Ej. 064-234567 o 987654321" 
                                    value={createData.phone || ""} 
                                    onChange={(e) => setCreateData('phone', e.target.value)} 
                                />
                                <InputError message={createErrors.phone} />
                            </div>

                            {/* Previsualizador en vivo */}
                            {renderBranchPreview(createData, false)}
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={createProcessing || !isOnline} className="font-semibold">
                                {createProcessing ? 'Guardando...' : (isOnline ? 'Crear Sucursal' : 'Conexión requerida')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Editar Sucursal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Edit className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">Editar Sucursal</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Actualiza los datos de clasificación, ubicación y contacto de la sede seleccionada.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleEdit} className="space-y-4 py-1">
                        {!isOnline && (
                            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs">
                                <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>
                                    <strong>Modo sin conexión:</strong> Para modificar sucursales se requiere conexión activa con el servidor.
                                </span>
                            </div>
                        )}
                        {/* 1. Identificación y Tipo Operativo */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Identificación y Rol Operativo</h3>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_name" className="text-xs font-semibold">Nombre de la Sucursal <span className="text-red-500">*</span></Label>
                                <Input 
                                    id="edit_name" 
                                    className="bg-background border-input text-xs" 
                                    value={editData.name} 
                                    onChange={(e) => setEditData('name', e.target.value)} 
                                    required 
                                />
                                <InputError message={editErrors.name} />
                            </div>

                            {/* Selector Interactivo de Tipo Operativo */}
                            <div className="space-y-1.5 pt-1">
                                <Label className="text-xs font-semibold">Tipo de Establecimiento <span className="text-red-500">*</span></Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div 
                                        onClick={() => setEditData('type', 'STORE')}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                            editData.type === 'STORE'
                                                ? 'bg-primary/5 border-primary text-foreground ring-1 ring-primary/30'
                                                : 'bg-card border-border hover:bg-muted/40 text-muted-foreground'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg border ${
                                            editData.type === 'STORE'
                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                                : 'bg-muted text-muted-foreground border-border'
                                        }`}>
                                            <Store className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-foreground flex items-center justify-between">
                                                <span>Tienda Comercial</span>
                                                {editData.type === 'STORE' && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                                Atención directa al público, emisión de comprobantes, cotizaciones y ventas en mostrador.
                                            </p>
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => setEditData('type', 'WAREHOUSE')}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                            editData.type === 'WAREHOUSE'
                                                ? 'bg-primary/5 border-primary text-foreground ring-1 ring-primary/30'
                                                : 'bg-card border-border hover:bg-muted/40 text-muted-foreground'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg border ${
                                            editData.type === 'WAREHOUSE'
                                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                : 'bg-muted text-muted-foreground border-border'
                                        }`}>
                                            <Building className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-foreground flex items-center justify-between">
                                                <span>Almacén / Depósito</span>
                                                {editData.type === 'WAREHOUSE' && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                                Custodia de stock, recepción de proveedores, despacho y transferencias entre sucursales.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <InputError message={editErrors.type} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_code" className="text-xs font-semibold">Código Asignado</Label>
                                    <Input 
                                        id="edit_code" 
                                        className="bg-muted border-input font-mono text-xs font-semibold" 
                                        value={editData.code || "S/N"} 
                                        disabled 
                                    />
                                    <p className="text-[10px] text-muted-foreground">Identificador único protegido de la sede.</p>
                                    <InputError message={editErrors.code} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_status" className="text-xs font-semibold">Estado de la Sede</Label>
                                    <Select value={editData.status} onValueChange={(val) => setEditData('status', val)}>
                                        <SelectTrigger id="edit_status" className="w-full bg-background border-input text-xs">
                                            <SelectValue placeholder="Selecciona estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Activa (Operativa)</SelectItem>
                                            <SelectItem value="INACTIVE" className="text-xs text-rose-600 dark:text-rose-400 font-medium">Inactiva (Cerrada)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={editErrors.status} />
                                </div>
                            </div>
                        </div>

                        {/* 2. Ubicación Geográfica */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Ubicación Geográfica (Ubigeo)</h3>
                            </div>

                            <UbigeoSelects 
                                department={editData.department || ""}
                                province={editData.province || ""}
                                district={editData.district || ""}
                                onDepartmentChange={(val) => setEditData('department', val)}
                                onProvinceChange={(val) => setEditData('province', val)}
                                onDistrictChange={(val) => setEditData('district', val)}
                            />

                            <div className="space-y-1.5 pt-1">
                                <Label htmlFor="edit_address" className="text-xs font-semibold">Dirección Física o Referencia Comercial</Label>
                                <Input 
                                    id="edit_address" 
                                    className="bg-background border-input text-xs" 
                                    value={editData.address || ""} 
                                    onChange={(e) => setEditData('address', e.target.value)} 
                                />
                                <InputError message={editErrors.address} />
                            </div>
                        </div>

                        {/* 3. Contacto y Previsualización */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <Phone className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Contacto y Previsualización</h3>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit_phone" className="text-xs font-semibold">Teléfono / Celular de la Sede</Label>
                                <Input 
                                    id="edit_phone" 
                                    className="bg-background border-input text-xs" 
                                    value={editData.phone || ""} 
                                    onChange={(e) => setEditData('phone', e.target.value)} 
                                />
                                <InputError message={editErrors.phone} />
                            </div>

                            {/* Previsualizador en vivo */}
                            {renderBranchPreview(editData, true)}
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={editProcessing || !isOnline} className="font-semibold">
                                {editProcessing ? 'Guardando...' : (isOnline ? 'Actualizar Sucursal' : 'Conexión requerida')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

BranchesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Sucursales',
            href: '/branches',
        },
    ],
};
