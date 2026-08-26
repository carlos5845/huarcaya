import { Head, Link, router } from '@inertiajs/react';
import { Package, Search, Filter, History, ArrowDownRight, ArrowUpRight, Ban } from 'lucide-react';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface KardexEntry {
    id: number;
    sequence_number: number;
    operation_date: string;
    operation_type: string;
    reference: string;
    input_quantity: number | null;
    input_unit_cost: number | null;
    input_total_cost: number | null;
    output_quantity: number | null;
    output_unit_cost: number | null;
    output_total_cost: number | null;
    balance_quantity: number;
    balance_unit_cost: number;
    balance_total_cost: number;
    original_entry_id: number | null;
    reversed_by_entry_id: number | null;
    product: {
        id: number;
        name: string;
        primary_reference: string;
    };
    user: {
        id: number;
        name: string;
    };
}

interface PaginationData {
    data: KardexEntry[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

export default function KardexIndex({ entries, branches, products, filters, isSuperAdmin = false }: { isSuperAdmin?: boolean, 
    entries: PaginationData, 
    branches: any[], 
    products: any[], 
    filters: any 
}) {
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [productId, setProductId] = useState(filters.product_id || '');
    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/kardex', { 
            branch_id: branchId, 
            product_id: productId,
            search,
            date_from: dateFrom,
            date_to: dateTo
        }, { preserveState: true });
    };

    const clearFilters = () => {
        setBranchId('');
        setProductId('');
        setSearch('');
        setDateFrom('');
        setDateTo('');
        router.get('/kardex');
    };

    const renderOperationType = (type: string, isReversed: boolean) => {
        if (type.includes('REVERSO')) {
            return <Badge variant="destructive" className="flex items-center gap-1 w-fit"><Ban className="h-3 w-3"/> {type}</Badge>;
        }

        if (type.includes('COMPRA') || type.includes('ENTRADA')) {
            return <Badge className="bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1 w-fit"><ArrowDownRight className="h-3 w-3"/> {type}</Badge>;
        }

        if (type.includes('VENTA') || type.includes('SALIDA')) {
            return <Badge className="bg-orange-500 hover:bg-orange-600 flex items-center gap-1 w-fit"><ArrowUpRight className="h-3 w-3"/> {type}</Badge>;
        }

        return <Badge variant="secondary">{type}</Badge>;
    };

    const formatCurrency = (val: number | null | string) => {
        if (val === null || val === undefined) {
return '-';
}

        return `S/ ${Number(val).toFixed(2)}`;
    };

    const formatQty = (val: number | null | string) => {
        if (val === null || val === undefined) {
return '-';
}

        return Number(val).toFixed(2);
    };

    return (
        <>
            <Head title="Kardex Valorizado" />
            
            <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <History className="h-8 w-8 text-primary" />
                            Kardex Valorizado
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Auditoría de movimientos de inventario y costo promedio.
                        </p>
                    </div>
                </div>

                <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col gap-4">
                    <form onSubmit={handleFilter} className="flex flex-wrap gap-4 items-center">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar usuario, prod, cód, ref..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={branchId}
                                onChange={e => setBranchId(e.target.value)}
                            >
                                <option value="">Todas las sucursales</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={productId}
                                onChange={e => setProductId(e.target.value)}
                            >
                                <option value="">Todos los productos</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.primary_reference} - {p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[130px]" />
                            <span className="text-muted-foreground">-</span>
                            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[130px]" />
                        </div>
                        <Button type="submit" variant="default">
                            <Filter className="h-4 w-4 mr-2" />
                            Filtrar
                        </Button>
                        {(branchId || productId || search || dateFrom || dateTo) && (
                            <Button type="button" variant="ghost" onClick={clearFilters}>Limpiar</Button>
                        )}
                    </form>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr>
                                    <th colSpan={4} className="border-b bg-muted/50"></th>
                                    <th colSpan={3} className="px-4 py-2 border-b border-l bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-center font-bold">ENTRADAS</th>
                                    <th colSpan={3} className="px-4 py-2 border-b border-l bg-orange-500/10 text-orange-700 dark:text-orange-400 text-center font-bold">SALIDAS</th>
                                    <th colSpan={3} className="px-4 py-2 border-b border-l bg-blue-500/10 text-blue-700 dark:text-blue-400 text-center font-bold">SALDOS</th>
                                </tr>
                                <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] sm:text-xs">
                                    <th className="px-4 py-2 font-medium">#</th>
                                    <th className="px-4 py-2 font-medium">Fecha</th>
                                    <th className="px-4 py-2 font-medium">Operación</th>
                                    <th className="px-4 py-2 font-medium">Producto</th>
                                    
                                    <th className="px-2 py-2 font-medium border-l">Cant</th>
                                    <th className="px-2 py-2 font-medium">CU</th>
                                    <th className="px-2 py-2 font-medium">Total</th>
                                    
                                    <th className="px-2 py-2 font-medium border-l">Cant</th>
                                    <th className="px-2 py-2 font-medium">CU</th>
                                    <th className="px-2 py-2 font-medium">Total</th>
                                    
                                    <th className="px-2 py-2 font-medium border-l">Cant</th>
                                    <th className="px-2 py-2 font-medium">CUP</th>
                                    <th className="px-2 py-2 font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {entries.data.map((entry) => (
                                    <tr key={entry.id} className={`hover:bg-muted/30 transition-colors ${entry.reversed_by_entry_id ? 'opacity-50 line-through' : ''}`}>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {entry.sequence_number}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                                            {new Date(entry.operation_date).toLocaleString()}
                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                {entry.reference || 'Sin ref'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {renderOperationType(entry.operation_type, !!entry.reversed_by_entry_id)}
                                            <div className="text-[10px] text-muted-foreground mt-1">
                                                Usuario: {entry.user?.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px] truncate" title={entry.product.name}>
                                            <div className="font-bold text-xs">{entry.product.primary_reference}</div>
                                            <div className="text-xs text-muted-foreground truncate">{entry.product.name}</div>
                                        </td>
                                        
                                        {/* Entradas */}
                                        <td className="px-2 py-3 border-l text-right font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">{formatQty(entry.input_quantity)}</td>
                                        <td className="px-2 py-3 text-right text-xs bg-emerald-500/5">{formatCurrency(entry.input_unit_cost)}</td>
                                        <td className="px-2 py-3 text-right text-xs bg-emerald-500/5">{formatCurrency(entry.input_total_cost)}</td>
                                        
                                        {/* Salidas */}
                                        <td className="px-2 py-3 border-l text-right font-medium text-orange-600 dark:text-orange-400 bg-orange-500/5">{formatQty(entry.output_quantity)}</td>
                                        <td className="px-2 py-3 text-right text-xs bg-orange-500/5">{formatCurrency(entry.output_unit_cost)}</td>
                                        <td className="px-2 py-3 text-right text-xs bg-orange-500/5">{formatCurrency(entry.output_total_cost)}</td>
                                        
                                        {/* Saldos */}
                                        <td className="px-2 py-3 border-l text-right font-bold text-blue-600 dark:text-blue-400 bg-blue-500/5">{formatQty(entry.balance_quantity)}</td>
                                        <td className="px-2 py-3 text-right text-xs bg-blue-500/5">{formatCurrency(entry.balance_unit_cost)}</td>
                                        <td className="px-2 py-3 text-right font-medium bg-blue-500/5">{formatCurrency(entry.balance_total_cost)}</td>
                                    </tr>
                                ))}
                                {entries.data.length === 0 && (
                                    <tr>
                                        <td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">
                                            No se encontraron movimientos en el Kardex.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {entries.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {entries.data.length} de {entries.total} resultados
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {entries.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? "default" : "outline"}
                                        size="sm"
                                        asChild={!!link.url}
                                        disabled={!link.url}
                                        className={!link.url ? "opacity-50" : ""}
                                    >
                                        {link.url ? (
                                            <Link preserveState href={link.url} dangerouslySetInnerHTML={{ __html: link.label }} />
                                        ) : (
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

KardexIndex.layout = {
    breadcrumbs: [
        { title: 'Inventario', href: '#' },
        { title: 'Kardex', href: '/kardex' },
    ],
};
