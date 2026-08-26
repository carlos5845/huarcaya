import { Head, useForm, router } from '@inertiajs/react';
import { Scale, Plus, Edit, Power, PowerOff, Hash } from 'lucide-react';
import React, { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Unit = {
    id: number;
    code: string;
    name: string;
    status: string;
};

type Props = {
    units: Unit[];
    flash: {
        success?: string;
    };
};

export default function UnitsIndex({ units, flash }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

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
        createPost('/units', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createReset();
            },
        });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingUnit) {
return;
}

        editPut(`/units/${editingUnit.id}`, {
            onSuccess: () => {
                setIsEditOpen(false);
                editReset();
            },
        });
    };

    const toggleStatus = (unit: Unit) => {
        if (confirm(`¿Estás seguro de que deseas ${unit.status === 'ACTIVE' ? 'desactivar' : 'reactivar'} esta unidad?`)) {
            router.delete(`/units/${unit.id}`);
        }
    };

    const openEdit = (unit: Unit) => {
        setEditingUnit(unit);
        setEditData({
            code: unit.code,
            name: unit.name,
            status: unit.status,
        });
        setIsEditOpen(true);
    };

    return (
        <>
            <Head title="Unidades" />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Scale className="h-6 w-6 text-primary" />
                            Unidades de Medida
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Administra las formas en las que se miden y venden los repuestos.
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Unidad
                    </Button>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Abreviatura / Código</th>
                                    <th className="px-6 py-3 font-medium">Nombre de Unidad</th>
                                    <th className="px-6 py-3 font-medium">Estado</th>
                                    <th className="px-6 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {units.map((unit) => (
                                    <tr key={unit.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">
                                            <Badge variant="outline" className="flex w-fit items-center gap-1 font-bold">
                                                {unit.code}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{unit.name}</td>
                                        <td className="px-6 py-4">
                                            {unit.status === 'ACTIVE' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Activo</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">Inactivo</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openEdit(unit)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant={unit.status === 'ACTIVE' ? "destructive" : "secondary"} 
                                                    size="sm" 
                                                    onClick={() => toggleStatus(unit)}
                                                    title={unit.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar'}
                                                >
                                                    {unit.status === 'ACTIVE' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {units.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                            No hay unidades registradas.
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
                        <DialogTitle>Nueva Unidad</DialogTitle>
                        <DialogDescription>
                            Registra una nueva unidad (Ej. PZA, UND, JGO).
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="code">Abreviatura / Código <span className="text-red-500">*</span></Label>
                            <Input id="code" value={createData.code} onChange={(e) => setCreateData('code', e.target.value.toUpperCase())} maxLength={10} required placeholder="Ej. PZA" className="uppercase" />
                            <InputError message={createErrors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre de Unidad <span className="text-red-500">*</span></Label>
                            <Input id="name" value={createData.name} onChange={(e) => setCreateData('name', e.target.value)} required placeholder="Ej. Pieza" />
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
                        <DialogTitle>Editar Unidad</DialogTitle>
                        <DialogDescription>Modifica los datos de la unidad seleccionada.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit_code">Abreviatura / Código <span className="text-red-500">*</span></Label>
                            <Input id="edit_code" value={editData.code} onChange={(e) => setEditData('code', e.target.value.toUpperCase())} maxLength={10} required className="uppercase" />
                            <InputError message={editErrors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit_name">Nombre de Unidad <span className="text-red-500">*</span></Label>
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

UnitsIndex.layout = {
    breadcrumbs: [
        { title: 'Catálogo', href: '#' },
        { title: 'Unidades', href: '/units' },
    ],
};
