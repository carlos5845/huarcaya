import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import InputError from '@/components/input-error';
import { Tags, Plus, Edit, Power, PowerOff, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Brand = {
    id: number;
    code: string | null;
    name: string;
    normalized_name: string;
    status: string;
};

type Props = {
    brands: Brand[];
    flash: {
        success?: string;
    };
};

export default function BrandsIndex({ brands, flash }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

    const { data: createData, setData: setCreateData, post: createPost, processing: createProcessing, errors: createErrors, reset: createReset } = useForm({
        code: '',
        name: '',
        status: 'ACTIVE',
    });

    const { data: editData, setData: setEditData, put: editPut, processing: editProcessing, errors: editErrors, reset: editReset } = useForm({
        code: '',
        name: '',
        status: 'ACTIVE',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createPost('/brands', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createReset();
            },
        });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBrand) return;
        editPut(`/brands/${editingBrand.id}`, {
            onSuccess: () => {
                setIsEditOpen(false);
                editReset();
            },
        });
    };

    const toggleStatus = (brand: Brand) => {
        if (confirm(`¿Estás seguro de que deseas ${brand.status === 'ACTIVE' ? 'desactivar' : 'reactivar'} esta marca?`)) {
            router.delete(`/brands/${brand.id}`);
        }
    };

    const openEdit = (brand: Brand) => {
        setEditingBrand(brand);
        setEditData({
            code: brand.code || '',
            name: brand.name,
            status: brand.status,
        });
        setIsEditOpen(true);
    };

    return (
        <>
            <Head title="Marcas" />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Tags className="h-6 w-6 text-primary" />
                            Catálogo de Marcas
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Administra las marcas de los repuestos y productos del sistema.
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Marca
                    </Button>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Código</th>
                                    <th className="px-6 py-3 font-medium">Nombre de Marca</th>
                                    <th className="px-6 py-3 font-medium">Estado</th>
                                    <th className="px-6 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {brands.map((brand) => (
                                    <tr key={brand.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">
                                            {brand.code ? (
                                                <Badge variant="outline" className="flex w-fit items-center gap-1">
                                                    <Hash className="h-3 w-3" />
                                                    {brand.code}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{brand.name}</td>
                                        <td className="px-6 py-4">
                                            {brand.status === 'ACTIVE' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Activo</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">Inactivo</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openEdit(brand)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant={brand.status === 'ACTIVE' ? "destructive" : "secondary"} 
                                                    size="sm" 
                                                    onClick={() => toggleStatus(brand)}
                                                    title={brand.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar'}
                                                >
                                                    {brand.status === 'ACTIVE' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {brands.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                            No hay marcas registradas.
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
                        <DialogTitle>Nueva Marca</DialogTitle>
                        <DialogDescription>
                            Registra una nueva marca de repuestos.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="code">Código (Opcional)</Label>
                            <Input id="code" value={createData.code} onChange={(e) => setCreateData('code', e.target.value)} maxLength={50} placeholder="Ej. TOY" />
                            <InputError message={createErrors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre de Marca <span className="text-red-500">*</span></Label>
                            <Input id="name" value={createData.name} onChange={(e) => setCreateData('name', e.target.value)} required placeholder="Ej. Toyota" />
                            <InputError message={createErrors.name} />
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
                        <DialogTitle>Editar Marca</DialogTitle>
                        <DialogDescription>Modifica los datos de la marca seleccionada.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit_code">Código (Opcional)</Label>
                            <Input id="edit_code" value={editData.code} onChange={(e) => setEditData('code', e.target.value)} maxLength={50} />
                            <InputError message={editErrors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit_name">Nombre de Marca <span className="text-red-500">*</span></Label>
                            <Input id="edit_name" value={editData.name} onChange={(e) => setEditData('name', e.target.value)} required />
                            <InputError message={editErrors.name} />
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

BrandsIndex.layout = {
    breadcrumbs: [
        { title: 'Catálogo', href: '#' },
        { title: 'Marcas', href: '/brands' },
    ],
};
