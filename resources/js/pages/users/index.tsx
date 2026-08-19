import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import InputError from '@/components/input-error';
import { Users, Plus, Edit, Shield, Power, PowerOff, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type User = {
    id: number;
    name: string;
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
};

type Props = {
    users: User[];
    roles: string[];
    branches: { id: number; name: string }[];
    flash: {
        success?: string;
    };
};

export default function UsersIndex({ users, roles, branches, flash }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const { data: createData, setData: setCreateData, post: createPost, processing: createProcessing, errors: createErrors, reset: createReset } = useForm({
        name: '',
        dni: '',
        phone: '',
        email: '',
        role: roles.length > 0 ? roles[0] : '',
        branch_id: branches.length > 0 ? branches[0].id.toString() : '',
        status: 'ACTIVE',
    });

    const { data: editData, setData: setEditData, put: editPut, processing: editProcessing, errors: editErrors, reset: editReset } = useForm({
        name: '',
        dni: '',
        phone: '',
        email: '',
        role: '',
        branch_id: '',
        status: 'ACTIVE',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createPost('/users', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createReset();
            },
        });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        editPut(`/users/${editingUser.id}`, {
            onSuccess: () => {
                setIsEditOpen(false);
                editReset();
            },
        });
    };

    const toggleStatus = (user: User) => {
        if (confirm(`¿Estás seguro de que deseas ${user.status === 'ACTIVE' ? 'desactivar' : 'reactivar'} este usuario?`)) {
            router.delete(`/users/${user.id}`);
        }
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setEditData({
            name: user.name,
            dni: user.dni,
            phone: user.phone || '',
            email: user.email || '',
            role: user.role || '',
            branch_id: user.branch_id ? user.branch_id.toString() : '',
            status: user.status,
        });
        setIsEditOpen(true);
    };

    return (
        <>
            <Head title="Gestión de Usuarios" />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Users className="h-6 w-6 text-primary" />
                            Usuarios
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">Administra los accesos y el personal del sistema.</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo Usuario
                    </Button>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Empleado</th>
                                    <th className="px-6 py-3 font-medium">DNI</th>
                                    <th className="px-6 py-3 font-medium">Rol</th>
                                    <th className="px-6 py-3 font-medium">Sucursal</th>
                                    <th className="px-6 py-3 font-medium">Estado</th>
                                    <th className="px-6 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 font-medium">
                                            <div className="flex flex-col">
                                                <span>{user.name}</span>
                                                {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{user.dni}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="flex w-fit items-center gap-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400">
                                                <Shield className="h-3 w-3" />
                                                {user.role || 'Sin rol'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            <div className="flex items-center gap-1 text-sm">
                                                <Building className="h-4 w-4" />
                                                {user.branch_name || 'Sin sucursal'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.status === 'ACTIVE' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Activo</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">Inactivo</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => router.get(`/users/${user.id}/sessions`)} title="Ver Sesiones">
                                                    <Shield className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => openEdit(user)} title="Editar Usuario">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant={user.status === 'ACTIVE' ? "destructive" : "secondary"} 
                                                    size="sm" 
                                                    onClick={() => toggleStatus(user)}
                                                    title={user.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar'}
                                                >
                                                    {user.status === 'ACTIVE' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            No hay usuarios registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Crear */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                            La contraseña por defecto será el mismo DNI del usuario. 
                            Se le pedirá cambiarla al iniciar sesión por primera vez.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre completo <span className="text-red-500">*</span></Label>
                            <Input id="name" value={createData.name} onChange={(e) => setCreateData('name', e.target.value)} required />
                            <InputError message={createErrors.name} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dni">DNI <span className="text-red-500">*</span></Label>
                                <Input id="dni" value={createData.dni} onChange={(e) => setCreateData('dni', e.target.value)} maxLength={8} required />
                                <InputError message={createErrors.dni} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Celular</Label>
                                <Input id="phone" value={createData.phone} onChange={(e) => setCreateData('phone', e.target.value)} />
                                <InputError message={createErrors.phone} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico (Opcional)</Label>
                            <Input id="email" type="email" value={createData.email} onChange={(e) => setCreateData('email', e.target.value)} />
                            <InputError message={createErrors.email} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Rol de Sistema</Label>
                                <Select value={createData.role} onValueChange={(val) => setCreateData('role', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={createErrors.role} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Sucursal Base</Label>
                                <Select value={createData.branch_id} onValueChange={(val) => setCreateData('branch_id', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona la sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={createErrors.branch_id} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={createProcessing}>Crear Usuario</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Editar */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuario</DialogTitle>
                        <DialogDescription>Modifica la información y accesos del usuario.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit_name">Nombre completo <span className="text-red-500">*</span></Label>
                            <Input id="edit_name" value={editData.name} onChange={(e) => setEditData('name', e.target.value)} required />
                            <InputError message={editErrors.name} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_dni">DNI <span className="text-red-500">*</span></Label>
                                <Input id="edit_dni" value={editData.dni} onChange={(e) => setEditData('dni', e.target.value)} maxLength={8} required />
                                <InputError message={editErrors.dni} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit_phone">Celular</Label>
                                <Input id="edit_phone" value={editData.phone} onChange={(e) => setEditData('phone', e.target.value)} />
                                <InputError message={editErrors.phone} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit_email">Correo Electrónico (Opcional)</Label>
                            <Input id="edit_email" type="email" value={editData.email} onChange={(e) => setEditData('email', e.target.value)} />
                            <InputError message={editErrors.email} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Rol de Sistema</Label>
                                <Select value={editData.role} onValueChange={(val) => setEditData('role', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={editErrors.role} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Sucursal Base</Label>
                                <Select value={editData.branch_id} onValueChange={(val) => setEditData('branch_id', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona la sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={editErrors.branch_id} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={editProcessing}>Actualizar</Button>
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
