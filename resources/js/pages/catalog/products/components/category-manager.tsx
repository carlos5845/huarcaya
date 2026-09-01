import { useForm, router } from '@inertiajs/react';
import { Plus, Settings2, Check, ChevronsUpDown, Trash2, Edit2, PackageSearch } from 'lucide-react';
import React, { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, normalizeSearch } from '@/lib/utils';

type Category = { id: number; name: string; code?: string | null; parent_id?: number | null; status: string };

type Props = {
    categories: Category[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
};

export function CategoryManager({ categories, value, onChange, error }: Props) {
    const [openCombo, setOpenCombo] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [openManage, setOpenManage] = useState(false);
    
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Form for Creating / Editing
    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } = useForm({
        name: '',
        code: '',
        parent_id: '',
        status: 'ACTIVE',
    });

    const handleOpenCreate = () => {
        clearErrors();
        reset();
        setEditingCategory(null);
        setOpenCreate(true);
        setOpenCombo(false);
    };

    const handleOpenEdit = (category: Category) => {
        clearErrors();
        setData({
            name: category.name,
            code: category.code || '',
            parent_id: category.parent_id ? category.parent_id.toString() : '',
            status: category.status,
        });
        setEditingCategory(category);
        setOpenCreate(true);
    };

    const submitCreateOrEdit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Transform empty string to null for parent_id
        transform((currentData) => ({
            ...currentData,
            parent_id: currentData.parent_id === '' ? null : currentData.parent_id,
        }));

        if (editingCategory) {
            put(`/categories/${editingCategory.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setOpenCreate(false);
                    setEditingCategory(null);
                    reset();
                },
            });
        } else {
            post('/categories', {
                preserveScroll: true,
                onSuccess: () => {
                    setOpenCreate(false);
                    reset();
                },
            });
        }
    };

    const deleteCategory = (category: Category) => {
        if (confirm(`¿Estás seguro de cambiar el estado de la categoría ${category.name}?`)) {
            router.delete(`/categories/${category.id}`, {
                preserveScroll: true,
            });
        }
    };

    const selectedCategory = categories.find((c) => c.id.toString() === value);

    return (
        <div className="space-y-1">
            <div className="flex gap-2 items-center">
                <Popover open={openCombo} onOpenChange={setOpenCombo}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombo}
                            className={cn(
                                "flex-1 justify-between",
                                !value && "text-muted-foreground",
                                error && "border-red-500 focus-visible:ring-red-500"
                            )}
                        >
                            <span className="truncate flex-1 text-left">
                                {value
                                ? selectedCategory?.name || "Seleccione una categoría"
                                : "Seleccione una categoría"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                        <Command filter={(value, search, keywords) => {
                            const extendValue = value + ' ' + (keywords?.join(' ') || '');

                            if (extendValue.toLowerCase().includes(search.toLowerCase())) {
return 1;
}

                            return 0;
                        }}>
                            <CommandInput placeholder="Buscar categoría..." />
                            <CommandList>
                                <CommandEmpty>
                                    No se encontró la categoría.
                                    <Button 
                                        variant="link" 
                                        className="px-0 mt-2 block text-primary"
                                        onClick={handleOpenCreate}
                                    >
                                        + Crear nueva categoría
                                    </Button>
                                </CommandEmpty>
                                <CommandGroup>
                                    {categories.filter(c => c.status === 'ACTIVE').map((category) => (
                                        <CommandItem
                                            key={category.id}
                                            value={category.id.toString()}
                                            keywords={[category.name, category.code || '']}
                                            onSelect={() => {
                                                onChange(category.id.toString());
                                                setOpenCombo(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === category.id.toString() ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {category.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={handleOpenCreate}
                    title="Crear Nueva Categoría"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setOpenManage(true)}
                    title="Gestionar Categorías"
                >
                    <Settings2 className="h-4 w-4" />
                </Button>
            </div>
            {error && <InputError message={error} />}

            {/* CREATE / EDIT DIALOG */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                        <DialogDescription>
                            {editingCategory ? 'Modifica los datos de la categoría seleccionada.' : 'Ingresa los datos para registrar una nueva categoría en el sistema.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreateOrEdit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category_name">Nombre de la Categoría <span className="text-red-500">*</span></Label>
                            <Input
                                id="category_name"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category_code">Código (Opcional)</Label>
                            <Input
                                id="category_code"
                                value={data.code}
                                onChange={e => setData('code', e.target.value)}
                            />
                            <InputError message={errors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category_parent">Categoría Padre (Opcional)</Label>
                            <select 
                                id="category_parent" 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={data.parent_id}
                                onChange={e => setData('parent_id', e.target.value)}
                            >
                                <option value="">-- Ninguna (Es categoría principal) --</option>
                                {categories.filter(c => c.id !== editingCategory?.id).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <InputError message={errors.parent_id} />
                        </div>
                        {editingCategory && (
                            <div className="grid gap-2">
                                <Label htmlFor="category_status">Estado</Label>
                                <select 
                                    id="category_status" 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={data.status}
                                    onChange={e => setData('status', e.target.value)}
                                >
                                    <option value="ACTIVE">Activo</option>
                                    <option value="INACTIVE">Inactivo</option>
                                </select>
                                <InputError message={errors.status} />
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                            <Button type="submit" disabled={processing}>
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MANAGE DIALOG */}
            <Dialog open={openManage} onOpenChange={setOpenManage}>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Gestionar Categorías</DialogTitle>
                        <DialogDescription>
                            Administra las categorías disponibles en el sistema.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-4">
                        {categories.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                No hay categorías registradas.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {categories.map(category => (
                                    <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {category.name}
                                                {category.status === 'INACTIVE' && (
                                                    <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                                                )}
                                            </div>
                                            {category.code && <div className="text-xs text-muted-foreground">Código: {category.code}</div>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(category)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className={category.status === 'ACTIVE' ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-600"} 
                                                onClick={() => deleteCategory(category)}
                                                title={category.status === 'ACTIVE' ? "Desactivar" : "Activar"}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
