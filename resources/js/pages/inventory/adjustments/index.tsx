import { Head, Link, router } from '@inertiajs/react';
import { ClipboardList, Plus, Search, Filter, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import type { PaginationData } from '@/types';

interface Adjustment {
    id: number;
    uuid: string;
    adjustment_number: string;
    operation_date: string;
    adjustment_type: string;
    status: string;
    notes: string;
    branch: {
        id: number;
        name: string;
    };
    creator: {
        id: number;
        name: string;
    } | null;
}

export default function AdjustmentsIndex({ adjustments, filters }: { 
    adjustments: PaginationData<Adjustment>,
    filters: any 
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [type, setType] = useState(filters.type || '');

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/inventory/adjustments', { search, status, type }, { preserveState: true });
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setType('');
        router.get('/inventory/adjustments');
    };

    return (
        <>
            <Head title="Ajustes de Inventario" />
            
            <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 px-4 mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <ClipboardList className="h-8 w-8 text-primary" />
                            Ajustes Manuales
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Registra entradas y salidas manuales al inventario (ej. mermas, saldos iniciales).
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/inventory/adjustments/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Ajuste
                        </Link>
                    </Button>
                </div>

                <div className="bg-card p-4 rounded-xl border shadow-sm">
                    <form onSubmit={handleFilter} className="flex flex-wrap gap-4 items-center">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar nro de ajuste..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                            >
                                <option value="">Todos los estados</option>
                                <option value="DRAFT">Borrador</option>
                                <option value="CONFIRMED">Confirmado</option>
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="">Todos los tipos</option>
                                <option value="POSITIVE">Entrada (Positivo)</option>
                                <option value="NEGATIVE">Salida (Negativo)</option>
                            </select>
                        </div>
                        <Button type="submit" variant="default">
                            <Filter className="h-4 w-4 mr-2" />
                            Filtrar
                        </Button>
                        {(search || status || type) && (
                            <Button type="button" variant="ghost" onClick={clearFilters}>Limpiar</Button>
                        )}
                    </form>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Número</th>
                                    <th className="px-4 py-3">Sucursal</th>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3">Creado por</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {adjustments.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                            No se encontraron ajustes.
                                        </td>
                                    </tr>
                                ) : (
                                    adjustments.data.map(adj => (
                                        <tr key={adj.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3 font-medium">{adj.adjustment_number}</td>
                                            <td className="px-4 py-3">{adj.branch.name}</td>
                                            <td className="px-4 py-3">{new Date(adj.operation_date).toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                {adj.adjustment_type === 'POSITIVE' ? (
                                                    <Badge className="bg-emerald-500 hover:bg-emerald-600">
                                                        <ArrowDownRight className="mr-1 h-3 w-3" /> ENTRADA
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-orange-500 hover:bg-orange-600">
                                                        <ArrowUpRight className="mr-1 h-3 w-3" /> SALIDA
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{adj.creator?.name || '-'}</td>
                                            <td className="px-4 py-3">
                                                {adj.status === 'CONFIRMED' ? (
                                                    <Badge variant="default" className="bg-blue-600">Confirmado</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Borrador</Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/inventory/adjustments/${adj.id}`}>
                                                        Ver Detalles
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

AdjustmentsIndex.layout = {
    breadcrumbs: [
        { title: 'Inventario', href: '/inventory' },
        { title: 'Ajustes', href: '/inventory/adjustments' }
    ]
};
