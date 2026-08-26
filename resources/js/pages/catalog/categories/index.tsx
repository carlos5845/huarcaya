import { Head, useForm, router } from '@inertiajs/react';
import { LayoutList, Plus, Edit, Power, PowerOff, Hash, CornerDownRight } from 'lucide-react';
import React, { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = {
    id: number;
    parent_id: number | null;
    code: string | null;
    name: string;
    normalized_name: string;
    status: string;
};

type Props = {
    categories: Category[];
    flash: {
        success?: string;
    };
};

export default function CategoriesIndex({ categories, flash }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const { data: createData, setData: setCreateData, post: createPost, processing: createProcessing, errors: createErrors, reset: createReset } = useForm({
        code: '',
        name: '',
        parent_id: 'none',
        status: 'ACTIVE',
    });

    const { data: editData, setData: setEditData, put: editPut, processing: editProcessing, errors: editErrors, reset: editReset } = useForm({
        code: '',
        name: '',
        parent_id: 'none',
        status: 'ACTIVE',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...createData,
            parent_id: createData.parent_id === 'none' ? null : createData.parent_id
        };
        router.post('/categories', payload, {
            onSuccess: () => {
                setIsCreateOpen(false);
                createReset();
            },
        });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingCategory) {
return;
}

        const payload = {
            ...editData,
            parent_id: editData.parent_id === 'none' ? null : editData.parent_id
        };
        router.put(`/categories/${editingCategory.id}`, payload, {
            onSuccess: () => {
                setIsEditOpen(false);
                editReset();
            },
        });
    };

    const toggleStatus = (category: Category) => {
        if (confirm(`¿Estás seguro de que deseas ${category.status === 'ACTIVE' ? 'desactivar' : 'reactivar'} esta categoría?`)) {
            router.delete(`/categories/${category.id}`);
        }
    };

    const openEdit = (category: Category) => {
        setEditingCategory(category);
        setEditData({
            code: category.code || '',
            name: category.name,
            parent_id: category.parent_id ? category.parent_id.toString() : 'none',
            status: category.status,
        });
        setIsEditOpen(true);
    };

    const getParentName = (parentId: number | null) => {
        if (!parentId) {
return null;
}

        const parent = categories.find(c => c.id === parentId);

        return parent ? parent.name : null;
    };

    return (
        <>
            <Head title="Categorías" />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <LayoutList className="h-6 w-6 text-primary" />
                            Categorías
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Clasifica tus repuestos en familias y subcategorías.
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Categoría
                    </Button>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Código</th>
                                    <th className="px-6 py-3 font-medium">Nombre de Categoría</th>
                                    <th className="px-6 py-3 font-medium">Categoría Padre</th>
                                    <th className="px-6 py-3 font-medium">Estado</th>
                                    <th className="px-6 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {categories.map((category) => (
                                    <tr key={category.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">
                                            {category.code ? (
                                                <Badge variant="outline" className="flex w-fit items-center gap-1">
                                                    <Hash className="h-3 w-3" />
                                                    {category.code}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{category.name}</td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {category.parent_id ? (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <CornerDownRight className="h-4 w-4 text-muted-foreground/50" />
                                                    {getParentName(category.parent_id)}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground/50 italic">Ninguna</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {category.status === 'ACTIVE' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Activo</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">Inactivo</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openEdit(category)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant={category.status === 'ACTIVE' ? "destructive" : "secondary"} 
                                                    size="sm" 
                                                    onClick={() => toggleStatus(category)}
                                                    title={category.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar'}
                                                >
                                                    {category.status === 'ACTIVE' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {categories.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                            No hay categorías registradas.
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
                        <DialogTitle>Nueva Categoría</DialogTitle>
                        <DialogDescription>
                            Registra una nueva familia o categoría de repuestos.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="code">Código (Opcional)</Label>
                            <Input id="code" value={createData.code} onChange={(e) => setCreateData('code', e.target.value)} maxLength={50} placeholder="Ej. LUB" />
                            <InputError message={createErrors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre de Categoría <span className="text-red-500">*</span></Label>
                            <Input id="name" value={createData.name} onChange={(e) => setCreateData('name', e.target.value)} required placeholder="Ej. Lubricantes" />
                            <InputError message={createErrors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Categoría Padre (Opcional)</Label>
                            <Select value={createData.parent_id} onValueChange={(val) => setCreateData('parent_id', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoría padre" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Es categoría principal --</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={createErrors.parent_id} />
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
                        <DialogTitle>Editar Categoría</DialogTitle>
                        <DialogDescription>Modifica los datos de la categoría seleccionada.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit_code">Código (Opcional)</Label>
                            <Input id="edit_code" value={editData.code} onChange={(e) => setEditData('code', e.target.value)} maxLength={50} />
                            <InputError message={editErrors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit_name">Nombre de Categoría <span className="text-red-500">*</span></Label>
                            <Input id="edit_name" value={editData.name} onChange={(e) => setEditData('name', e.target.value)} required />
                            <InputError message={editErrors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Categoría Padre (Opcional)</Label>
                            <Select value={editData.parent_id} onValueChange={(val) => setEditData('parent_id', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoría padre" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Es categoría principal --</SelectItem>
                                    {categories.filter(c => c.id !== editingCategory?.id).map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={editErrors.parent_id} />
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

CategoriesIndex.layout = {
    breadcrumbs: [
        { title: 'Catálogo', href: '#' },
        { title: 'Categorías', href: '/categories' },
    ],
};
