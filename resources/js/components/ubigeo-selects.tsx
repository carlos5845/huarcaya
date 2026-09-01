import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

type Department = { id: string; name: string };
type Province = { id: string; name: string; department_id: string };
type District = { id: string; name: string; province_id: string; department_id: string };

interface UbigeoSelectsProps {
    department: string;
    province: string;
    district: string;
    onDepartmentChange: (val: string) => void;
    onProvinceChange: (val: string) => void;
    onDistrictChange: (val: string) => void;
}

export function UbigeoSelects({
    department,
    province,
    district,
    onDepartmentChange,
    onProvinceChange,
    onDistrictChange
}: UbigeoSelectsProps) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);

    const [openDep, setOpenDep] = useState(false);
    const [openProv, setOpenProv] = useState(false);
    const [openDist, setOpenDist] = useState(false);

    useEffect(() => {
        fetch('/data/ubigeo/ubigeo_peru_2016_departamentos.json').then(r => r.json()).then(setDepartments).catch(() => {});
        fetch('/data/ubigeo/ubigeo_peru_2016_provincias.json').then(r => r.json()).then(setProvinces).catch(() => {});
        fetch('/data/ubigeo/ubigeo_peru_2016_distritos.json').then(r => r.json()).then(setDistricts).catch(() => {});
    }, []);

    const filteredProvinces = provinces.filter(p => !department || p.department_id === department);
    const filteredDistricts = districts.filter(d => (!province || d.province_id === province) && (!department || d.department_id === department));

    const selectedDepName = departments.find(d => d.id === department)?.name || "Seleccionar...";
    const selectedProvName = provinces.find(p => p.id === province)?.name || "Seleccionar...";
    const selectedDistName = districts.find(d => d.id === district)?.name || "Seleccionar...";

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
                <Label>Departamento</Label>
                <Popover open={openDep} onOpenChange={setOpenDep} modal={true}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={openDep} className="justify-between">
                            {selectedDepName}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Buscar departamento..." />
                            <CommandList>
                                <CommandEmpty>No se encontró.</CommandEmpty>
                                <CommandGroup>
                                    {departments.map((dep) => (
                                        <CommandItem
                                            key={dep.id}
                                            value={dep.name}
                                            onSelect={() => {
                                                onDepartmentChange(dep.id === department ? "" : dep.id);
                                                onProvinceChange("");
                                                onDistrictChange("");
                                                setOpenDep(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", department === dep.id ? "opacity-100" : "opacity-0")} />
                                            {dep.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="flex flex-col gap-2">
                <Label>Provincia</Label>
                <Popover open={openProv} onOpenChange={setOpenProv} modal={true}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={openProv} className="justify-between" disabled={!department}>
                            {selectedProvName}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Buscar provincia..." />
                            <CommandList>
                                <CommandEmpty>No se encontró.</CommandEmpty>
                                <CommandGroup>
                                    {filteredProvinces.map((prov) => (
                                        <CommandItem
                                            key={prov.id}
                                            value={prov.name}
                                            onSelect={() => {
                                                onProvinceChange(prov.id === province ? "" : prov.id);
                                                onDistrictChange("");
                                                setOpenProv(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", province === prov.id ? "opacity-100" : "opacity-0")} />
                                            {prov.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="flex flex-col gap-2">
                <Label>Distrito</Label>
                <Popover open={openDist} onOpenChange={setOpenDist} modal={true}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={openDist} className="justify-between" disabled={!province}>
                            {selectedDistName}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Buscar distrito..." />
                            <CommandList>
                                <CommandEmpty>No se encontró.</CommandEmpty>
                                <CommandGroup>
                                    {filteredDistricts.map((dist) => (
                                        <CommandItem
                                            key={dist.id}
                                            value={dist.name}
                                            onSelect={() => {
                                                onDistrictChange(dist.id === district ? "" : dist.id);
                                                setOpenDist(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", district === dist.id ? "opacity-100" : "opacity-0")} />
                                            {dist.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
