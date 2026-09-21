import { useForm, router } from '@inertiajs/react';
import { Plus, Settings2, Check, ChevronsUpDown, Trash2, Edit2, PackageSearch, Search } from 'lucide-react';
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

type Brand = { id: number; name: string; code?: string | null; status: string };

type Props = {
    brands: Brand[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
    label?: string;
    required?: boolean;
};

export function BrandManager({ brands, value, onChange, error, label, required }: Props) {
    const [openCombo, setOpenCombo] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [openManage, setOpenManage] = useState(false);
    const [manageSearch, setManageSearch] = useState('');
    
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

    // Form for Creating / Editing
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        code: '',
        status: 'ACTIVE',
    });

    const handleOpenCreate = () => {
        clearErrors();
        reset();
        setEditingBrand(null);
        setOpenCreate(true);
        setOpenCombo(false);
    };

    const handleOpenEdit = (brand: Brand) => {
        clearErrors();
        setData({
            name: brand.name,
            code: brand.code || '',
            status: brand.status,
        });
        setEditingBrand(brand);
        setOpenCreate(true);
    };

    const submitCreateOrEdit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (editingBrand) {
            put(`/brands/${editingBrand.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setOpenCreate(false);
                    setEditingBrand(null);
                    reset();
                },
            });
        } else {
            const createdName = data.name.trim().toLowerCase();
            post('/brands', {
                preserveScroll: true,
                onSuccess: (page: any) => {
                    setOpenCreate(false);
                    reset();
                    // Auto-select newly created brand
                    const freshBrands = page?.props?.brands as Brand[] | undefined;
                    if (freshBrands) {
                        const matched = freshBrands.find(b => b.name.trim().toLowerCase() === createdName);
                        if (matched) {
                            onChange(matched.id.toString());
                        }
                    }
                },
            });
        }
    };

    const deleteBrand = (brand: Brand) => {
        if (confirm(`¿Estás seguro de cambiar el estado de la marca "${brand.name}"?`)) {
            router.delete(`/brands/${brand.id}`, {
                preserveScroll: true,
            });
        }
    };

    const selectedBrand = brands.find((b) => b.id.toString() === value);

    const filteredManageBrands = brands.filter(b => 
        b.name.toLowerCase().includes(manageSearch.toLowerCase()) || 
        (b.code && b.code.toLowerCase().includes(manageSearch.toLowerCase()))
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
                            title="Crear Nueva Marca"
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
                            title="Gestionar Marcas"
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
                                ? selectedBrand?.name || "Seleccione una marca"
                                : "Seleccione una marca"}
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
                            <CommandInput placeholder="Buscar marca..." />
                            <CommandList>
                                <CommandEmpty className="p-4 text-center text-sm">
                                    <p className="text-muted-foreground mb-2">No se encontró la marca.</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="w-full text-xs"
                                        onClick={handleOpenCreate}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        Crear nueva marca
                                    </Button>
                                </CommandEmpty>
                                <CommandGroup>
                                    {brands.filter(b => b.status === 'ACTIVE').map((brand) => (
                                        <CommandItem
                                            key={brand.id}
                                            value={brand.id.toString()}
                                            keywords={[brand.name, brand.code || '']}
                                            onSelect={() => {
                                                onChange(brand.id.toString());
                                                setOpenCombo(false);
                                            }}
                                            className="flex items-center justify-between cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Check
                                                    className={cn(
                                                        "h-4 w-4 text-primary",
                                                        value === brand.id.toString() ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <span className="font-medium">{brand.name}</span>
                                            </div>
                                            {brand.code && (
                                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground font-mono">
                                                    {brand.code}
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
                            title="Crear Nueva Marca"
                            className="shrink-0 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>

                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setOpenManage(true)}
                            title="Gestionar Marcas"
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
                        <DialogTitle>{editingBrand ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle>
                        <DialogDescription>
                            {editingBrand ? 'Modifica los datos de la marca seleccionada.' : 'Registra una nueva marca. Se seleccionará automáticamente al guardarla.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreateOrEdit} className="space-y-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="brand_name">Nombre de la Marca <span className="text-red-500">*</span></Label>
                            <Input
                                id="brand_name"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="Ej. Bosch, Donaldson, Baldwin..."
                                required
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="brand_code">Código o Abreviatura (Opcional)</Label>
                            <Input
                                id="brand_code"
                                value={data.code}
                                onChange={e => setData('code', e.target.value)}
                                placeholder="Ej. BOS, DON, BAL"
                            />
                            <InputError message={errors.code} />
                        </div>
                        {editingBrand && (
                            <div className="grid gap-2">
                                <Label htmlFor="brand_status">Estado</Label>
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
                                {editingBrand ? 'Actualizar Marca' : 'Guardar y Seleccionar'}
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
                            <Settings2 className="h-5 w-5 text-primary" />
                            Gestionar Marcas
                        </DialogTitle>
                        <DialogDescription>
                            Administra, edita o desactiva las marcas del catálogo maestro.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between gap-3 pt-2 pb-1 border-b">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar marcas..."
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
                            Nueva Marca
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2 pr-1">
                        {filteredManageBrands.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No se encontraron marcas</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {manageSearch ? 'Prueba con otro término de búsqueda' : 'No hay marcas registradas'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredManageBrands.map(brand => (
                                    <div 
                                        key={brand.id} 
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="min-w-0 pr-4">
                                            <div className="font-medium flex items-center gap-2">
                                                <span className="truncate">{brand.name}</span>
                                                {brand.status === 'ACTIVE' ? (
                                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                        Activo
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        Inactivo
                                                    </Badge>
                                                )}
                                            </div>
                                            {brand.code && (
                                                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                    Código: {brand.code}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleOpenEdit(brand)}
                                                title="Editar marca"
                                                className="h-8 w-8"
                                            >
                                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className={cn(
                                                    "h-8 w-8",
                                                    brand.status === 'ACTIVE' 
                                                        ? "text-red-500 hover:text-red-600 hover:bg-red-500/10" 
                                                        : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                                )} 
                                                onClick={() => deleteBrand(brand)}
                                                title={brand.status === 'ACTIVE' ? "Desactivar marca" : "Activar marca"}
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
