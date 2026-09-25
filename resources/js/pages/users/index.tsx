import { Head, useForm, router, usePoll } from '@inertiajs/react';
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
    Users, 
    Plus, 
    Edit, 
    Shield, 
    Power, 
    PowerOff, 
    Building, 
    Pencil, 
    Trash2, 
    SlidersHorizontal, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown,
    User as UserIcon,
    UserPlus,
    Phone,
    KeyRound,
    ShieldCheck,
    CheckCheck,
    X,
    ShoppingCart,
    Truck,
    Package,
    Sparkles,
    WifiOff
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type User = {
    id: number;
    name: string;
    last_name?: string | null;
    mother_last_name?: string | null;
    dni: string;
    phone: string | null;
    email: string | null;
    status: string;
    role: string | null;
    branch_id: number;
    branch_name: string | null;
    dni_ubigeo: string | null;
    dni_expiration_date: string | null;
    last_login_at: string | null;
    is_online?: boolean;
};

type Props = {
    users: User[];
    roles: { id: number, name: string, permissions: string[] }[];
    branches: { id: number; name: string }[];
    flash: {
        success?: string;
    };
};

const permissionLabels: Record<string, string> = {
    view_dashboard: 'Dashboard',
    view_sales: 'Ventas y Cobranzas',
    view_transfers: 'Transferencias',
    view_purchases: 'Compras',
    view_inventory: 'Inventario Sucursal',
    view_inventory_general: 'Inventario General',
    view_products: 'Catálogo de Repuestos',
    view_adjustments: 'Ajustes de Stock',
    view_kardex: 'Kardex',
    view_users: 'Usuarios y Roles',
    view_branches: 'Sucursales',
    view_customers: 'Clientes',
    view_suppliers: 'Proveedores',
    view_import: 'Importación Masiva'
};

const PERMISSION_CATEGORIES = [
    {
        id: 'commercial',
        title: 'Comercial & Ventas',
        icon: ShoppingCart,
        badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        description: 'Ventas de mostrador, cotizaciones y clientes',
        permissions: [
            { key: 'view_sales', label: 'Ventas y Cobranzas', description: 'Cotizaciones, punto de venta y registro de cobranzas' },
            { key: 'view_customers', label: 'Gestión de Clientes', description: 'Directorio y registro de clientes compradores' },
        ],
    },
    {
        id: 'logistics',
        title: 'Operaciones & Logística',
        icon: Truck,
        badgeColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        description: 'Abastecimiento de mercadería y traslados entre sedes',
        permissions: [
            { key: 'view_purchases', label: 'Compras a Proveedores', description: 'Órdenes de compra, facturación y recepción de insumos' },
            { key: 'view_transfers', label: 'Transferencias de Stock', description: 'Envíos y recepción de mercadería entre sucursales' },
            { key: 'view_suppliers', label: 'Gestión de Proveedores', description: 'Directorio, marcas y contactos de proveedores' },
        ],
    },
    {
        id: 'inventory',
        title: 'Inventario & Almacén',
        icon: Package,
        badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        description: 'Catálogo de repuestos, existencias físicas y trazabilidad',
        permissions: [
            { key: 'view_products', label: 'Catálogo de Repuestos', description: 'Maestro de productos, marcas, modelos y precios' },
            { key: 'view_inventory', label: 'Inventario por Sucursal', description: 'Control de stock físico y valorizado en la sede' },
            { key: 'view_inventory_general', label: 'Inventario General', description: 'Visión consolidada de existencias en todas las sedes' },
            { key: 'view_adjustments', label: 'Ajustes de Inventario', description: 'Ingresos y salidas extraordinarias de mercadería' },
            { key: 'view_kardex', label: 'Kardex de Movimientos', description: 'Historial físico y valorizado por repuesto' },
            { key: 'view_import', label: 'Importación Masiva', description: 'Carga masiva de repuestos mediante plantilla Excel' },
        ],
    },
    {
        id: 'admin',
        title: 'Administración & Control',
        icon: ShieldCheck,
        badgeColor: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        description: 'Métricas analíticas, configuración de sedes y personal',
        permissions: [
            { key: 'view_dashboard', label: 'Panel Principal (Dashboard)', description: 'Indicadores clave, gráficos y resúmenes del negocio' },
            { key: 'view_branches', label: 'Gestión de Sucursales', description: 'Administración y alta de sedes operativas' },
            { key: 'view_users', label: 'Usuarios y Permisos', description: 'Cuentas de acceso, perfiles y auditoría de seguridad' },
        ],
    },
];

const initialPermissions: Record<string, boolean> = {
    view_dashboard: true,
    view_sales: false,
    view_transfers: false,
    view_purchases: false,
    view_inventory: false,
    view_inventory_general: false,
    view_products: false,
    view_adjustments: false,
    view_kardex: false,
    view_users: false,
    view_branches: false,
    view_customers: false,
    view_suppliers: false,
    view_import: false,
};

const columnLabels: Record<string, string> = {
    name: 'Empleado / Usuario',
    dni: 'DNI',
    role: 'Rol de Sistema',
    branch_name: 'Sucursal Base',
    status: 'Estado',
    session: 'Sesión',
    actions: 'Acciones',
};

export default function UsersIndex({ users, roles, branches, flash }: Props) {
    const { isOnline } = useNetworkStatus();
    usePoll(5000, { only: ['users'] });
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isEditingRole, setIsEditingRole] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

    // TanStack states
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const { data: roleData, setData: setRoleData, post: postRole, put: putRole, delete: deleteRole, processing: roleProcessing, reset: resetRole, errors: roleErrors } = useForm({
        name: '',
        permissions: { ...initialPermissions }
    });

    const activePermCount = useMemo(() => {
        return Object.values(roleData.permissions).filter(Boolean).length;
    }, [roleData.permissions]);

    const isCategoryAllSelected = (catPermissions: { key: string }[]) => {
        return catPermissions.every(p => Boolean(roleData.permissions[p.key as keyof typeof roleData.permissions]));
    };

    const toggleCategory = (catPermissions: { key: string }[]) => {
        const allSelected = isCategoryAllSelected(catPermissions);
        const newPerms = { ...roleData.permissions };
        catPermissions.forEach(p => {
            (newPerms as any)[p.key] = !allSelected;
        });
        setRoleData('permissions', newPerms);
    };

    const selectAllPermissions = () => {
        const newPerms = { ...roleData.permissions };
        Object.keys(newPerms).forEach(k => {
            (newPerms as any)[k] = true;
        });
        setRoleData('permissions', newPerms);
    };

    const deselectAllPermissions = () => {
        const newPerms = { ...roleData.permissions };
        Object.keys(newPerms).forEach(k => {
            (newPerms as any)[k] = false;
        });
        setRoleData('permissions', newPerms);
    };

    const openCreateRoleModal = () => {
        setIsEditingRole(false);
        setEditingRoleId(null);
        setRoleData({
            name: '',
            permissions: { ...initialPermissions }
        });
        setIsRoleModalOpen(true);
    };

    const openEditRoleModal = (roleName: string) => {
        const role = roles.find(r => r.name === roleName);
        if (!role) return;
        
        setIsEditingRole(true);
        setEditingRoleId(role.id);
        
        const permObj: Record<string, boolean> = {
            view_dashboard: false,
            view_sales: false,
            view_transfers: false,
            view_purchases: false,
            view_inventory: false,
            view_inventory_general: false,
            view_products: false,
            view_adjustments: false,
            view_kardex: false,
            view_users: false,
            view_branches: false,
            view_customers: false,
            view_suppliers: false,
            view_import: false,
        };
        role.permissions.forEach(p => {
            if (p in permObj) permObj[p] = true;
        });
        
        setRoleData({
            name: role.name,
            permissions: permObj
        });
        
        setIsRoleModalOpen(true);
    };

    const renderRolePreview = (roleName: string) => {
        const role = roles.find(r => r.name === roleName);
        if (!role) {
            return (
                <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground bg-muted/20">
                    Selecciona un rol para visualizar los módulos y permisos asignados al usuario.
                </div>
            );
        }

        const isSuperAdmin = role.name === 'Super Admin';
        const totalPossible = 14;
        const grantedCount = isSuperAdmin ? totalPossible : (role.permissions || []).length;

        return (
            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-500" />
                        <span className="text-xs font-semibold text-foreground">
                            Permisos asignados: <span className="text-purple-600 dark:text-purple-400 font-bold">{role.name}</span>
                        </span>
                    </div>
                    <Badge variant="outline" className="text-[11px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-medium">
                        {grantedCount} de {totalPossible} módulos activos
                    </Badge>
                </div>

                {isSuperAdmin ? (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>Este rol cuenta con acceso completo e irrestricto a todas las funciones y configuraciones del sistema.</span>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto">
                        {(role.permissions && role.permissions.length > 0) ? (
                            role.permissions.map(perm => (
                                <span 
                                    key={perm}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-background border border-border text-foreground shadow-2xs"
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {permissionLabels[perm] || perm}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-amber-500 italic">
                                Este rol no cuenta con ningún permiso activo en este momento.
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const filteredUsers = useMemo(() => {
        return (users || []).filter(u => {
            if (statusFilter === 'ACTIVE') return u.status === 'ACTIVE';
            if (statusFilter === 'INACTIVE') return u.status === 'INACTIVE';
            return true;
        });
    }, [users, statusFilter]);

    const { data: createData, setData: setCreateData, post: createPost, processing: createProcessing, errors: createErrors, reset: createReset } = useForm({
        name: '',
        last_name: '',
        mother_last_name: '',
        dni: '',
        phone: '',
        email: '',
        role: roles.length > 0 ? roles[0].name : '',
        branch_id: branches.length > 0 ? branches[0].id.toString() : '',
        status: 'ACTIVE',
    });

    const { data: editData, setData: setEditData, put: editPut, processing: editProcessing, errors: editErrors, reset: editReset } = useForm({
        name: '',
        last_name: '',
        mother_last_name: '',
        dni: '',
        phone: '',
        email: '',
        role: '',
        branch_id: '',
        status: 'ACTIVE',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!isOnline) {
            toast.warning('Modo sin conexión', {
                description: 'La creación de usuarios requiere conexión activa al servidor.',
            });
            return;
        }

        createPost('/users', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createReset();
                toast.success('Usuario registrado exitosamente');
            },
            onError: () => toast.error('Error al registrar usuario'),
        });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        if (!isOnline) {
            toast.warning('Modo sin conexión', {
                description: 'La edición de usuarios requiere conexión activa al servidor.',
            });
            return;
        }

        editPut(`/users/${editingUser.id}`, {
            onSuccess: () => {
                setIsEditOpen(false);
                editReset();
                toast.success('Usuario actualizado exitosamente');
            },
            onError: () => toast.error('Error al actualizar usuario'),
        });
    };

    const toggleStatus = (user: User) => {
        if (!isOnline) {
            toast.warning('Modo sin conexión', {
                description: 'El cambio de estado de usuarios requiere conexión activa al servidor.',
            });
            return;
        }

        if (confirm(`¿Estás seguro de que deseas ${user.status === 'ACTIVE' ? 'desactivar' : 'reactivar'} este usuario?`)) {
            router.delete(`/users/${user.id}`);
        }
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setEditData({
            name: user.name,
            last_name: user.last_name || '',
            mother_last_name: user.mother_last_name || '',
            dni: user.dni,
            phone: user.phone || '',
            email: user.email || '',
            role: user.role || '',
            branch_id: user.branch_id ? user.branch_id.toString() : '',
            status: user.status,
        });
        setIsEditOpen(true);
    };

    const columns = useMemo<ColumnDef<User>[]>(() => [
        {
            id: 'name',
            accessorFn: row => `${row.name} ${row.email || ''}`,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Empleado</span>
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
                const user = row.original;
                const fullName = [user.name, user.last_name, user.mother_last_name].filter(Boolean).join(' ');
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-xs text-foreground">{fullName || user.name}</span>
                        {user.email && <span className="text-[11px] text-muted-foreground">{user.email}</span>}
                    </div>
                );
            },
        },
        {
            id: 'dni',
            accessorFn: row => row.dni,
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>DNI</span>
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
                    {row.original.dni}
                </span>
            ),
        },
        {
            id: 'role',
            accessorFn: row => row.role || '',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                    <span>Rol</span>
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
                <Badge variant="outline" className="flex w-fit items-center gap-1 text-[11px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                    <Shield className="h-3 w-3" />
                    {row.original.role || 'Sin rol'}
                </Badge>
            ),
        },
        {
            id: 'branch_name',
            accessorFn: row => row.branch_name || '',
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
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{row.original.branch_name || 'Sin sucursal'}</span>
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
            id: 'session',
            accessorFn: row => (row.is_online ? 'online' : 'offline'),
            header: ({ column }) => (
                <div className="text-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="mx-auto h-8 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                        <span>Sesión</span>
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
                <div className="flex justify-center">
                    {row.original.is_online ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            En línea
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30">
                            Fuera de línea
                        </Badge>
                    )}
                </div>
            ),
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
                const user = row.original;
                return (
                    <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => router.get(`/users/${user.id}/sessions`)} title="Ver Sesiones">
                            <Shield className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(user)} title="Editar Usuario">
                            <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => toggleStatus(user)}
                            disabled={user.role === "Super Admin"}
                            title={user.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar'}
                        >
                            {user.status === 'ACTIVE' ? <PowerOff className="h-3.5 w-3.5 text-rose-500" /> : <Power className="h-3.5 w-3.5 text-emerald-500" />}
                        </Button>
                    </div>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: filteredUsers,
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
            <Head title="Gestión de Usuarios" />
            
            <div className="flex h-full flex-1 flex-col gap-5 p-4 max-w-7xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                            <Users className="h-6 w-6 text-primary" />
                            Gestión de Usuarios y Roles
                        </h1>
                        <p className="text-muted-foreground text-xs mt-0.5">Administra los accesos, permisos y personal operativo del sistema</p>
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
                            Nuevo Usuario
                        </Button>
                    </div>
                </div>

                {!isOnline && (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                        <WifiOff className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                            <p className="font-semibold text-xs sm:text-sm">Estás trabajando en modo sin conexión</p>
                            <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-400">
                                La creación, edición y administración de usuarios, roles y permisos requiere conexión activa con el servidor.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between gap-4">
                    <Tabs defaultValue="ACTIVE" onValueChange={setStatusFilter} className="w-full">
                        <TabsList className="bg-muted/50 border border-border">
                            <TabsTrigger value="ACTIVE" className="text-xs">Activos</TabsTrigger>
                            <TabsTrigger value="INACTIVE" className="text-xs">Inactivos</TabsTrigger>
                            <TabsTrigger value="ALL" className="text-xs">Todos</TabsTrigger>
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
                                            No hay usuarios registrados con este filtro.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Crear Usuario */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">Nuevo Usuario</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Registra una nueva cuenta de acceso para el personal operativo o administrativo.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Banner informativo de credenciales */}
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5 text-xs text-foreground">
                        <KeyRound className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <span className="font-semibold text-primary">Credenciales de acceso inicial:</span>
                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                El <strong className="text-foreground">DNI (8 dígitos)</strong> será asignado automáticamente como usuario y contraseña temporal. El sistema obligará al usuario a crear una nueva contraseña en su primer inicio de sesión.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4 py-1">
                        {!isOnline && (
                            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs">
                                <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>
                                    <strong>Modo sin conexión:</strong> Para registrar nuevos usuarios se requiere conexión activa con el servidor.
                                </span>
                            </div>
                        )}
                        {/* 1. Datos Personales */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <UserIcon className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Datos Personales</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-xs font-semibold">Nombres <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="name" 
                                        className="bg-background border-input text-xs" 
                                        placeholder="Ej. Juan Carlos" 
                                        value={createData.name} 
                                        onChange={(e) => setCreateData('name', e.target.value)} 
                                        required 
                                    />
                                    <InputError message={createErrors.name} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="last_name" className="text-xs font-semibold">Apellido Paterno</Label>
                                    <Input 
                                        id="last_name" 
                                        className="bg-background border-input text-xs" 
                                        placeholder="Ej. Pérez" 
                                        value={createData.last_name} 
                                        onChange={(e) => setCreateData('last_name', e.target.value)} 
                                    />
                                    <InputError message={createErrors.last_name} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="mother_last_name" className="text-xs font-semibold">Apellido Materno</Label>
                                    <Input 
                                        id="mother_last_name" 
                                        className="bg-background border-input text-xs" 
                                        placeholder="Ej. Quispe" 
                                        value={createData.mother_last_name} 
                                        onChange={(e) => setCreateData('mother_last_name', e.target.value)} 
                                    />
                                    <InputError message={createErrors.mother_last_name} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1.5">
                                    <Label htmlFor="dni" className="text-xs font-semibold">DNI (8 Dígitos) <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="dni" 
                                        className="bg-background border-input font-mono text-xs" 
                                        placeholder="12345678" 
                                        value={createData.dni} 
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                            setCreateData('dni', val);
                                        }} 
                                        maxLength={8} 
                                        required 
                                    />
                                    <InputError message={createErrors.dni} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="create_status" className="text-xs font-semibold">Estado de Cuenta</Label>
                                    <Select value={createData.status} onValueChange={(val) => setCreateData('status', val)}>
                                        <SelectTrigger id="create_status" className="w-full bg-background border-input text-xs">
                                            <SelectValue placeholder="Selecciona estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Activo (Habilitado)</SelectItem>
                                            <SelectItem value="INACTIVE" className="text-xs text-rose-600 dark:text-rose-400 font-medium">Inactivo (Suspendido)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={createErrors.status} />
                                </div>
                            </div>
                        </div>

                        {/* 2. Medios de Contacto */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <Phone className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Medios de Contacto</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-xs font-semibold">Celular / WhatsApp</Label>
                                    <Input 
                                        id="phone" 
                                        className="bg-background border-input text-xs" 
                                        placeholder="Ej. 987654321" 
                                        value={createData.phone} 
                                        onChange={(e) => setCreateData('phone', e.target.value)} 
                                    />
                                    <InputError message={createErrors.phone} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-semibold">Correo Electrónico (Opcional)</Label>
                                    <Input 
                                        id="email" 
                                        type="email" 
                                        className="bg-background border-input text-xs" 
                                        placeholder="usuario@empresa.com" 
                                        value={createData.email} 
                                        onChange={(e) => setCreateData('email', e.target.value)} 
                                    />
                                    <InputError message={createErrors.email} />
                                </div>
                            </div>
                        </div>

                        {/* 3. Asignación y Permisos */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <Shield className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Asignación de Rol y Sucursal</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Rol de Sistema <span className="text-red-500">*</span></Label>
                                    <div className="flex gap-1.5 items-center w-full min-w-0">
                                        <div className="flex-1 min-w-0">
                                            <Select value={createData.role} onValueChange={(val) => setCreateData('role', val)}>
                                                <SelectTrigger className="w-full bg-background border-input text-xs">
                                                    <SelectValue placeholder="Selecciona un rol" className="truncate" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map((role) => (
                                                        <SelectItem key={role.id} value={role.name} className="text-xs">{role.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="icon" 
                                            onClick={openCreateRoleModal} 
                                            title="Crear nuevo rol" 
                                            className="h-9 w-9 shrink-0"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                        {createData.role && createData.role !== 'Super Admin' && (
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="icon" 
                                                onClick={() => openEditRoleModal(createData.role)} 
                                                title="Configurar permisos de este rol" 
                                                className="h-9 w-9 shrink-0"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                    <InputError message={createErrors.role} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Sucursal Base <span className="text-red-500">*</span></Label>
                                    <Select value={createData.branch_id} onValueChange={(val) => setCreateData('branch_id', val)}>
                                        <SelectTrigger className="w-full bg-background border-input text-xs">
                                            <SelectValue placeholder="Selecciona la sucursal" className="truncate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()} className="text-xs">{branch.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={createErrors.branch_id} />
                                </div>
                            </div>

                            {/* Previsualizador de permisos del rol en vivo */}
                            {renderRolePreview(createData.role)}
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={createProcessing || !isOnline} className="font-semibold">
                                {createProcessing ? 'Guardando...' : (isOnline ? 'Crear Usuario' : 'Conexión requerida')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Editar Usuario */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Edit className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">Editar Usuario</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Modifica los datos personales, roles y sucursal asignada.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleEdit} className="space-y-4 py-1">
                        {!isOnline && (
                            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs">
                                <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>
                                    <strong>Modo sin conexión:</strong> Para modificar usuarios se requiere conexión activa con el servidor.
                                </span>
                            </div>
                        )}
                        {/* 1. Datos Personales */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <UserIcon className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Datos Personales</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_name" className="text-xs font-semibold">Nombres <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="edit_name" 
                                        className="bg-background border-input text-xs" 
                                        value={editData.name} 
                                        onChange={(e) => setEditData('name', e.target.value)} 
                                        required 
                                    />
                                    <InputError message={editErrors.name} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_last_name" className="text-xs font-semibold">Apellido Paterno</Label>
                                    <Input 
                                        id="edit_last_name" 
                                        className="bg-background border-input text-xs" 
                                        value={editData.last_name} 
                                        onChange={(e) => setEditData('last_name', e.target.value)} 
                                    />
                                    <InputError message={editErrors.last_name} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_mother_last_name" className="text-xs font-semibold">Apellido Materno</Label>
                                    <Input 
                                        id="edit_mother_last_name" 
                                        className="bg-background border-input text-xs" 
                                        value={editData.mother_last_name} 
                                        onChange={(e) => setEditData('mother_last_name', e.target.value)} 
                                    />
                                    <InputError message={editErrors.mother_last_name} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_dni" className="text-xs font-semibold">DNI (8 Dígitos) <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="edit_dni" 
                                        className="bg-background border-input font-mono text-xs" 
                                        value={editData.dni} 
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                            setEditData('dni', val);
                                        }} 
                                        maxLength={8} 
                                        required 
                                    />
                                    <InputError message={editErrors.dni} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_status" className="text-xs font-semibold">Estado de Cuenta</Label>
                                    <Select value={editData.status} onValueChange={(val) => setEditData('status', val)}>
                                        <SelectTrigger id="edit_status" className="w-full bg-background border-input text-xs">
                                            <SelectValue placeholder="Selecciona estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Activo (Habilitado)</SelectItem>
                                            <SelectItem value="INACTIVE" className="text-xs text-rose-600 dark:text-rose-400 font-medium">Inactivo (Suspendido)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={editErrors.status} />
                                </div>
                            </div>
                        </div>

                        {/* 2. Medios de Contacto */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <Phone className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Medios de Contacto</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_phone" className="text-xs font-semibold">Celular / WhatsApp</Label>
                                    <Input 
                                        id="edit_phone" 
                                        className="bg-background border-input text-xs" 
                                        value={editData.phone} 
                                        onChange={(e) => setEditData('phone', e.target.value)} 
                                    />
                                    <InputError message={editErrors.phone} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit_email" className="text-xs font-semibold">Correo Electrónico (Opcional)</Label>
                                    <Input 
                                        id="edit_email" 
                                        type="email" 
                                        className="bg-background border-input text-xs" 
                                        value={editData.email} 
                                        onChange={(e) => setEditData('email', e.target.value)} 
                                    />
                                    <InputError message={editErrors.email} />
                                </div>
                            </div>
                        </div>

                        {/* 3. Asignación y Permisos */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <Shield className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Asignación de Rol y Sucursal</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Rol de Sistema <span className="text-red-500">*</span></Label>
                                    <div className="flex gap-1.5 items-center w-full min-w-0">
                                        <div className="flex-1 min-w-0">
                                            <Select 
                                                value={editData.role} 
                                                onValueChange={(val) => setEditData('role', val)} 
                                                disabled={editingUser?.role === "Super Admin"}
                                            >
                                                <SelectTrigger className="w-full bg-background border-input text-xs">
                                                    <SelectValue placeholder="Selecciona un rol" className="truncate" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map((role) => (
                                                        <SelectItem key={role.id} value={role.name} className="text-xs">{role.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="icon" 
                                            onClick={openCreateRoleModal} 
                                            title="Crear nuevo rol" 
                                            className="h-9 w-9 shrink-0"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                        {editData.role && editData.role !== 'Super Admin' && (
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="icon" 
                                                onClick={() => openEditRoleModal(editData.role)} 
                                                title="Configurar permisos de este rol" 
                                                className="h-9 w-9 shrink-0"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                    <InputError message={editErrors.role} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Sucursal Base <span className="text-red-500">*</span></Label>
                                    <Select value={editData.branch_id} onValueChange={(val) => setEditData('branch_id', val)}>
                                        <SelectTrigger className="w-full bg-background border-input text-xs">
                                            <SelectValue placeholder="Selecciona la sucursal" className="truncate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()} className="text-xs">{branch.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={editErrors.branch_id} />
                                </div>
                            </div>

                            {/* Previsualizador de permisos del rol en vivo */}
                            {renderRolePreview(editData.role)}
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={editProcessing || !isOnline} className="font-semibold">
                                {editProcessing ? 'Guardando...' : (isOnline ? 'Actualizar Usuario' : 'Conexión requerida')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Crear / Editar Rol con Bloques de Permisos Categorizados */}
            <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    {isEditingRole ? `Editar Rol: ${roleData.name}` : 'Crear Nuevo Rol'}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Asigna un nombre descriptivo y selecciona los módulos permitidos para este perfil operativo.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const options = {
                            preserveState: true,
                            onSuccess: () => {
                                setIsRoleModalOpen(false);
                                setCreateData('role', roleData.name);
                                setEditData('role', roleData.name);
                                resetRole();
                            }
                        };
                        if (isEditingRole && editingRoleId) {
                            putRole(`/roles/${editingRoleId}`, options);
                        } else {
                            postRole('/roles', options);
                        }
                    }} className="space-y-4 py-1">
                        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                            <Label htmlFor="role_name" className="text-xs font-semibold">Nombre del Rol <span className="text-red-500">*</span></Label>
                            <Input 
                                id="role_name" 
                                className="bg-background border-input text-xs" 
                                placeholder="Ej. Supervisor de Ventas, Jefe de Almacén, Cajero..." 
                                value={roleData.name} 
                                onChange={(e) => setRoleData('name', e.target.value)} 
                                required
                            />
                            <InputError message={roleErrors.name} />
                        </div>

                        {/* Toolbar de acciones masivas de permisos */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 px-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Módulos del Sistema</span>
                                <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20 font-semibold">
                                    {activePermCount} / 14 activos
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={selectAllPermissions}
                                    className="h-7 text-xs gap-1"
                                >
                                    <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                                    Marcar Todos
                                </Button>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={deselectAllPermissions}
                                    className="h-7 text-xs gap-1"
                                >
                                    <X className="h-3.5 w-3.5 text-rose-500" />
                                    Desmarcar Todos
                                </Button>
                            </div>
                        </div>

                        {/* Categorías de Permisos */}
                        <div className="space-y-3">
                            {PERMISSION_CATEGORIES.map((cat) => {
                                const CatIcon = cat.icon;
                                const catAllSelected = isCategoryAllSelected(cat.permissions);
                                const catActiveCount = cat.permissions.filter(p => Boolean(roleData.permissions[p.key as keyof typeof roleData.permissions])).length;

                                return (
                                    <div key={cat.id} className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-md border ${cat.badgeColor}`}>
                                                    <CatIcon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-xs font-bold text-foreground">{cat.title}</h4>
                                                        <span className="text-[10px] text-muted-foreground">({catActiveCount}/{cat.permissions.length})</span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">{cat.description}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => toggleCategory(cat.permissions)}
                                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                            >
                                                {catAllSelected ? 'Desmarcar cat.' : 'Marcar cat.'}
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {cat.permissions.map((perm) => {
                                                const isChecked = Boolean(roleData.permissions[perm.key as keyof typeof roleData.permissions]);
                                                return (
                                                    <div 
                                                        key={perm.key}
                                                        onClick={() => setRoleData('permissions', { ...roleData.permissions, [perm.key]: !isChecked })}
                                                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                                                            isChecked
                                                                ? 'bg-primary/5 border-primary/40 text-foreground'
                                                                : 'bg-background border-border hover:bg-muted/30 text-muted-foreground'
                                                        }`}
                                                    >
                                                        <Checkbox 
                                                            id={`perm_${perm.key}`} 
                                                            checked={isChecked}
                                                            onCheckedChange={(checked) => setRoleData('permissions', { ...roleData.permissions, [perm.key]: checked === true })}
                                                            className="mt-0.5 pointer-events-none"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-semibold text-foreground flex items-center justify-between gap-1">
                                                                <span className="truncate">{perm.label}</span>
                                                                {isChecked && (
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                                                                {perm.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2">
                            {isEditingRole && editingRoleId && roleData.name !== 'Super Admin' ? (
                                <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => {
                                        if (confirm(`¿Estás seguro de que deseas eliminar el rol "${roleData.name}"?`)) {
                                            deleteRole(`/roles/${editingRoleId}`, {
                                                preserveState: true,
                                                onSuccess: () => {
                                                    setIsRoleModalOpen(false);
                                                    setCreateData('role', '');
                                                    setEditData('role', '');
                                                    resetRole();
                                                }
                                            });
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 mr-1.5" /> Eliminar Rol
                                </Button>
                            ) : <div />}

                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                                <Button type="button" variant="outline" onClick={() => setIsRoleModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={roleProcessing} className="font-semibold">
                                    {roleProcessing ? 'Guardando...' : (isEditingRole ? 'Actualizar Rol' : 'Crear Rol')}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Usuarios',
            href: '/users',
        },
    ],
};
