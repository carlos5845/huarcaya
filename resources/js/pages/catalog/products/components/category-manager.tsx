import { useForm, router } from '@inertiajs/react';
import { Plus, Settings2, Check, ChevronsUpDown, Trash2, Edit2, PackageSearch, Search, FolderTree } from 'lucide-react';
import React, { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Category = { id: number; name: string; code?: string | null; parent_id?: number | null; status: string };

type Props = {
    categories: Category[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
    label?: string;
    required?: boolean;
};

export function CategoryManager({ categories, value, onChange, error, label, required }: Props) {
    const [openCombo, setOpenCombo] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [openManage, setOpenManage] = useState(false);
    const [manageSearch, setManageSearch] = useState('');
    
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
            parent_id: currentData.parent_id === '' || currentData.parent_id === 'NONE' ? null : currentData.parent_id,
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
            const createdName = data.name.trim().toLowerCase();
            post('/categories', {
                preserveScroll: true,
                onSuccess: (page: any) => {
                    setOpenCreate(false);
                    reset();
                    // Auto-select newly created category
                    const freshCategories = page?.props?.categories as Category[] | undefined;
                    if (freshCategories) {
                        const matched = freshCategories.find(c => c.name.trim().toLowerCase() === createdName);
                        if (matched) {
                            onChange(matched.id.toString());
                        }
                    }
                },
            });
        }
    };

    const deleteCategory = (category: Category) => {
        if (confirm(`¿Estás seguro de cambiar el estado de la categoría "${category.name}"?`)) {
            router.delete(`/categories/${category.id}`, {
                preserveScroll: true,
            });
        }
    };

    const selectedCategory = categories.find((c) => c.id.toString() === value);

    const filteredManageCategories = categories.filter(c => 
        c.name.toLowerCase().includes(manageSearch.toLowerCase()) || 
        (c.code && c.code.toLowerCase().includes(manageSearch.toLowerCase()))
    );

    return (
        <div className="space-y-1.5">
            {label && (
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1">
                        {label} {required && <span className="text-red-500">*</span>}
                    </Label>
                    <div className="flex items-center gap-1">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleOpenCreate}
                            title="Crear Nueva Categoría"
                            className="h-6 px-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-0.5 rounded"
                        >
                            <Plus className="h-3 w-3" />
                            <span>Nueva</span>
                        </Button>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setOpenManage(true)}
                            title="Gestionar Categorías"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground rounded"
                        >
                            <Settings2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex gap-1.5 items-center">
                <Popover open={openCombo} onOpenChange={setOpenCombo}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombo}
                            className={cn(
                                "w-full justify-between text-left font-normal",
                                !value && "text-muted-foreground",
                                error && "border-red-500 focus-visible:ring-red-500"
                            )}
                        >
                            <span className="truncate flex-1 mr-2">
                                {value
                                ? selectedCategory?.name || "Seleccione una categoría"
                                : "Seleccione una categoría"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
                        <Command filter={(itemVal, search, keywords) => {
                            const extendValue = itemVal + ' ' + (keywords?.join(' ') || '');
                            if (extendValue.toLowerCase().includes(search.toLowerCase())) {
                                return 1;
                            }
                            return 0;
                        }}>
                            <CommandInput placeholder="Buscar categoría..." />
                            <CommandList>
                                <CommandEmpty className="p-4 text-center text-sm">
                                    <p className="text-muted-foreground mb-2">No se encontró la categoría.</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="w-full text-xs"
                                        onClick={handleOpenCreate}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        Crear nueva categoría
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
                                            className="flex items-center justify-between cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Check
                                                    className={cn(
                                                        "h-4 w-4 text-primary",
                                                        value === category.id.toString() ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <span className="font-medium">{category.name}</span>
                                            </div>
                                            {category.code && (
                                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground font-mono">
                                                    {category.code}
                                                </Badge>
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {!label && (
                    <>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            onClick={handleOpenCreate}
                            title="Crear Nueva Categoría"
                            className="shrink-0 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>

                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setOpenManage(true)}
                            title="Gestionar Categorías"
                            className="shrink-0 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>
            {error && <InputError message={error} />}

            {/* CREATE / EDIT DIALOG */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                        <DialogDescription>
                            {editingCategory ? 'Modifica los datos de la categoría seleccionada.' : 'Registra una nueva categoría. Se seleccionará automáticamente al guardarla.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreateOrEdit} className="space-y-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="category_name">Nombre de la Categoría <span className="text-red-500">*</span></Label>
                            <Input
                                id="category_name"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="Ej. Filtros, Hidráulica, Sellos..."
                                required
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category_code">Código o Abreviatura (Opcional)</Label>
                            <Input
                                id="category_code"
                                value={data.code}
                                onChange={e => setData('code', e.target.value)}
                                placeholder="Ej. CAT-FIL, CAT-HID"
                            />
                            <InputError message={errors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category_parent">Categoría Padre (Opcional)</Label>
                            <Select 
                                value={data.parent_id || 'NONE'} 
                                onValueChange={(v) => setData('parent_id', v === 'NONE' ? '' : v)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="-- Ninguna (Categoría principal) --" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">-- Ninguna (Categoría principal) --</SelectItem>
                                    {categories.filter(c => c.id !== editingCategory?.id).map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.parent_id} />
                        </div>
                        {editingCategory && (
                            <div className="grid gap-2">
                                <Label htmlFor="category_status">Estado</Label>
                                <Select 
                                    value={data.status} 
                                    onValueChange={(v) => setData('status', v)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecciona un estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Activo</SelectItem>
                                        <SelectItem value="INACTIVE">Inactivo</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.status} />
                            </div>
                        )}
                        <DialogFooter className="gap-2 sm:gap-0 pt-3">
                            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                            <Button type="submit" disabled={processing}>
                                {editingCategory ? 'Actualizar Categoría' : 'Guardar y Seleccionar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MANAGE DIALOG */}
            <Dialog open={openManage} onOpenChange={setOpenManage}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderTree className="h-5 w-5 text-primary" />
                            Gestionar Categorías
                        </DialogTitle>
                        <DialogDescription>
                            Administra, edita o desactiva las categorías del catálogo maestro.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between gap-3 pt-2 pb-1 border-b">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar categorías..."
                                value={manageSearch}
                                onChange={(e) => setManageSearch(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                        <Button 
                            type="button" 
                            size="sm" 
                            onClick={() => {
                                handleOpenCreate();
                            }}
                            className="shrink-0"
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Nueva Categoría
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2 pr-1">
                        {filteredManageCategories.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No se encontraron categorías</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {manageSearch ? 'Prueba con otro término de búsqueda' : 'No hay categorías registradas'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredManageCategories.map(category => {
                                    const parentCategory = categories.find(c => c.id === category.parent_id);
                                    return (
                                        <div 
                                            key={category.id} 
                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors"
                                        >
                                            <div className="min-w-0 pr-4">
                                                <div className="font-medium flex items-center gap-2">
                                                    <span className="truncate">{category.name}</span>
                                                    {category.status === 'ACTIVE' ? (
                                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                            Activo
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            Inactivo
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                                    {category.code && (
                                                        <span className="font-mono">Código: {category.code}</span>
                                                    )}
                                                    {parentCategory && (
                                                        <span>Subcategoría de: <strong className="text-foreground/80">{parentCategory.name}</strong></span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleOpenEdit(category)}
                                                    title="Editar categoría"
                                                    className="h-8 w-8"
                                                >
                                                    <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className={cn(
                                                        "h-8 w-8",
                                                        category.status === 'ACTIVE' 
                                                            ? "text-red-500 hover:text-red-600 hover:bg-red-500/10" 
                                                            : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                                    )} 
                                                    onClick={() => deleteCategory(category)}
                                                    title={category.status === 'ACTIVE' ? "Desactivar categoría" : "Activar categoría"}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
