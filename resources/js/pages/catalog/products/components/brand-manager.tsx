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

type Brand = { id: number; name: string; code?: string | null; status: string };

type Props = {
    brands: Brand[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
};

export function BrandManager({ brands, value, onChange, error }: Props) {
    const [openCombo, setOpenCombo] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [openManage, setOpenManage] = useState(false);
    
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
            post('/brands', {
                preserveScroll: true,
                onSuccess: (page) => {
                    setOpenCreate(false);
                    reset();
                },
            });
        }
    };

    const deleteBrand = (brand: Brand) => {
        if (confirm(`¿Estás seguro de cambiar el estado de la marca ${brand.name}?`)) {
            router.delete(`/brands/${brand.id}`, {
                preserveScroll: true,
            });
        }
    };

    const selectedBrand = brands.find((b) => b.id.toString() === value);

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
                                ? selectedBrand?.name || "Seleccione una marca"
                                : "Seleccione una marca"}
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
                            <CommandInput placeholder="Buscar marca..." />
                            <CommandList>
                                <CommandEmpty>
                                    No se encontró la marca.
                                    <Button 
                                        variant="link" 
                                        className="px-0 mt-2 block text-primary"
                                        onClick={handleOpenCreate}
                                    >
                                        + Crear nueva marca
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
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === brand.id.toString() ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {brand.name}
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
                    title="Crear Nueva Marca"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setOpenManage(true)}
                    title="Gestionar Marcas"
                >
                    <Settings2 className="h-4 w-4" />
                </Button>
            </div>
            {error && <InputError message={error} />}

            {/* CREATE / EDIT DIALOG */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBrand ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle>
                        <DialogDescription>
                            {editingBrand ? 'Modifica los datos de la marca seleccionada.' : 'Ingresa los datos para registrar una nueva marca en el sistema.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreateOrEdit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="brand_name">Nombre de la Marca <span className="text-red-500">*</span></Label>
                            <Input
                                id="brand_name"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="brand_code">Código (Opcional)</Label>
                            <Input
                                id="brand_code"
                                value={data.code}
                                onChange={e => setData('code', e.target.value)}
                            />
                            <InputError message={errors.code} />
                        </div>
                        {editingBrand && (
                            <div className="grid gap-2">
                                <Label htmlFor="brand_status">Estado</Label>
                                <select 
                                    id="brand_status" 
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
                        <DialogTitle>Gestionar Marcas</DialogTitle>
                        <DialogDescription>
                            Administra las marcas disponibles en el sistema.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-4">
                        {brands.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                No hay marcas registradas.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {brands.map(brand => (
                                    <div key={brand.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {brand.name}
                                                {brand.status === 'INACTIVE' && (
                                                    <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                                                )}
                                            </div>
                                            {brand.code && <div className="text-xs text-muted-foreground">Código: {brand.code}</div>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(brand)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className={brand.status === 'ACTIVE' ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-600"} 
                                                onClick={() => deleteBrand(brand)}
                                                title={brand.status === 'ACTIVE' ? "Desactivar" : "Activar"}
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
