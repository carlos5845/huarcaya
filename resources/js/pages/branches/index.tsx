import { Head, useForm, router } from '@inertiajs/react';
import { Building, Plus, Edit, Store, Power, PowerOff, Phone, MapPin } from 'lucide-react';
import React, { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Branch = {
    id: number;
    uuid: string;
    company_id: number;
    name: string;
    code: string | null;
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

export default function BranchesIndex({ branches, flash }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    const { data: createData, setData: setCreateData, post: createPost, processing: createProcessing, errors: createErrors, reset: createReset } = useForm({
        name: '',
        code: '',
        address: '',
        phone: '',
        type: 'STORE',
        status: 'ACTIVE',
    });

    const { data: editData, setData: setEditData, put: editPut, processing: editProcessing, errors: editErrors, reset: editReset } = useForm({
        name: '',
        code: '',
        address: '',
        phone: '',
        type: 'STORE',
        status: 'ACTIVE',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createPost('/branches', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createReset();
            },
        });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingBranch) {
return;
}

        editPut(`/branches/${editingBranch.id}`, {
            onSuccess: () => {
                setIsEditOpen(false);
                editReset();
            },
        });
    };

    const toggleStatus = (branch: Branch) => {
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
        });
        setIsEditOpen(true);
    };

    return (
        <>
            <Head title="Gestión de Sucursales" />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Building className="h-6 w-6 text-primary" />
                            Sucursales
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">Administra las tiendas y almacenes del sistema.</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Sucursal
                    </Button>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Código</th>
                                    <th className="px-6 py-3 font-medium">Nombre</th>
                                    <th className="px-6 py-3 font-medium">Tipo</th>
                                    <th className="px-6 py-3 font-medium">Estado</th>
                                    <th className="px-6 py-3 font-medium">Contacto</th>
                                    <th className="px-6 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {branches.map((branch) => (
                                    <tr key={branch.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">{branch.code || 'S/N'}</td>
                                        <td className="px-6 py-4 font-medium flex items-center gap-2">
                                            <Store className="h-4 w-4 text-muted-foreground" />
                                            {branch.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {branch.type === 'STORE' ? (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">Tienda</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400">Almacén</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {branch.status === 'ACTIVE' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Activo</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">Inactivo</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            <div className="flex flex-col gap-1">
                                                {branch.phone && <span className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" /> {branch.phone}</span>}
                                                {branch.address && <span className="flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" /> {branch.address}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openEdit(branch)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant={branch.status === 'ACTIVE' ? "destructive" : "secondary"} 
                                                    size="sm" 
                                                    onClick={() => toggleStatus(branch)}
                                                    title={branch.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar'}
                                                >
                                                    {branch.status === 'ACTIVE' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {branches.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            No hay sucursales registradas.
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
                        <DialogTitle>Nueva Sucursal</DialogTitle>
                        <DialogDescription>Completa los datos para registrar una nueva tienda o almacén.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
                            <Input id="name" value={createData.name} onChange={(e) => setCreateData('name', e.target.value)} required />
                            <InputError message={createErrors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input id="phone" value={createData.phone} onChange={(e) => setCreateData('phone', e.target.value)} />
                            <InputError message={createErrors.phone} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Dirección</Label>
                            <Input id="address" value={createData.address} onChange={(e) => setCreateData('address', e.target.value)} />
                            <InputError message={createErrors.address} />
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={createProcessing}>Guardar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Editar */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Sucursal</DialogTitle>
                        <DialogDescription>Actualiza los datos de la sucursal seleccionada.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit_name">Nombre <span className="text-red-500">*</span></Label>
                            <Input id="edit_name" value={editData.name} onChange={(e) => setEditData('name', e.target.value)} required />
                            <InputError message={editErrors.name} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_code">Código Interno</Label>
                                <Input id="edit_code" value={editData.code} onChange={(e) => setEditData('code', e.target.value)} />
                                <InputError message={editErrors.code} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit_phone">Teléfono</Label>
                                <Input id="edit_phone" value={editData.phone} onChange={(e) => setEditData('phone', e.target.value)} />
                                <InputError message={editErrors.phone} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit_address">Dirección</Label>
                            <Input id="edit_address" value={editData.address} onChange={(e) => setEditData('address', e.target.value)} />
                            <InputError message={editErrors.address} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tipo de Sucursal</Label>
                            <Select value={editData.type} onValueChange={(val) => setEditData('type', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STORE">Tienda (Ventas)</SelectItem>
                                    <SelectItem value="WAREHOUSE">Almacén (Solo Inventario)</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={editErrors.type} />
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

BranchesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Sucursales',
            href: '/branches',
        },
    ],
};
