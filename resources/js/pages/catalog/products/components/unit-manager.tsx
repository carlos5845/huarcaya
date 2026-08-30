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
import { cn } from '@/lib/utils';

type Unit = { id: number; name: string; code: string; status: string };

type Props = {
    units: Unit[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
};

export function UnitManager({ units, value, onChange, error }: Props) {
    const [openCombo, setOpenCombo] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [openManage, setOpenManage] = useState(false);
    
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

    // Form for Creating / Editing
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        code: '',
        status: 'ACTIVE',
    });

    const handleOpenCreate = () => {
        clearErrors();
        reset();
        setEditingUnit(null);
        setOpenCreate(true);
        setOpenCombo(false);
    };

    const handleOpenEdit = (unit: Unit) => {
        clearErrors();
        setData({
            name: unit.name,
            code: unit.code,
            status: unit.status,
        });
        setEditingUnit(unit);
        setOpenCreate(true);
    };

    const submitCreateOrEdit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (editingUnit) {
            put(`/units/${editingUnit.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setOpenCreate(false);
                    setEditingUnit(null);
                    reset();
                },
            });
        } else {
            post('/units', {
                preserveScroll: true,
                onSuccess: () => {
                    setOpenCreate(false);
                    reset();
                },
            });
        }
    };

    const deleteUnit = (unit: Unit) => {
        if (confirm(`¿Estás seguro de cambiar el estado de la unidad ${unit.name}?`)) {
            router.delete(`/units/${unit.id}`, {
                preserveScroll: true,
            });
        }
    };

    const selectedUnit = units.find((u) => u.id.toString() === value);

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
                                ? (selectedUnit ? `${selectedUnit.name} (${selectedUnit.code})` : "Seleccione una unidad")
                                : "Seleccione una unidad"}
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
                            <CommandInput placeholder="Buscar unidad..." />
                            <CommandList>
                                <CommandEmpty>
                                    No se encontró la unidad.
                                    <Button 
                                        variant="link" 
                                        className="px-0 mt-2 block text-primary"
                                        onClick={handleOpenCreate}
                                    >
                                        + Crear nueva unidad
                                    </Button>
                                </CommandEmpty>
                                <CommandGroup>
                                    {units.filter(u => u.status === 'ACTIVE').map((unit) => (
                                        <CommandItem
                                            key={unit.id}
                                            value={unit.id.toString()}
                                            keywords={[unit.name, unit.code]}
                                            onSelect={() => {
                                                onChange(unit.id.toString());
                                                setOpenCombo(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === unit.id.toString() ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {unit.name} ({unit.code})
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
                    title="Crear Nueva Unidad"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setOpenManage(true)}
                    title="Gestionar Unidades"
                >
                    <Settings2 className="h-4 w-4" />
                </Button>
            </div>
            {error && <InputError message={error} />}

            {/* CREATE / EDIT DIALOG */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUnit ? 'Editar Unidad' : 'Nueva Unidad'}</DialogTitle>
                        <DialogDescription>
                            {editingUnit ? 'Modifica los datos de la unidad seleccionada.' : 'Ingresa los datos para registrar una nueva unidad de medida.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCreateOrEdit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="unit_name">Nombre de la Unidad <span className="text-red-500">*</span></Label>
                            <Input
                                id="unit_name"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                required
                                placeholder="Ej. Unidades, Kilogramos..."
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="unit_code">Abreviatura / Código <span className="text-red-500">*</span></Label>
                            <Input
                                id="unit_code"
                                value={data.code}
                                onChange={e => setData('code', e.target.value)}
                                required
                                placeholder="Ej. UN, KG, LTS..."
                            />
                            <InputError message={errors.code} />
                        </div>
                        {editingUnit && (
                            <div className="grid gap-2">
                                <Label htmlFor="unit_status">Estado</Label>
                                <select 
                                    id="unit_status" 
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
                        <DialogTitle>Gestionar Unidades</DialogTitle>
                        <DialogDescription>
                            Administra las unidades de medida disponibles en el sistema.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-4">
                        {units.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                No hay unidades registradas.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {units.map(unit => (
                                    <div key={unit.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {unit.name}
                                                {unit.status === 'INACTIVE' && (
                                                    <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Código: {unit.code}</div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(unit)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className={unit.status === 'ACTIVE' ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-600"} 
                                                onClick={() => deleteUnit(unit)}
                                                title={unit.status === 'ACTIVE' ? "Desactivar" : "Activar"}
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
