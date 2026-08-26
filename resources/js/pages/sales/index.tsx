import { Head, Link, router } from '@inertiajs/react';
import { Search, Plus, Eye, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Ventas', href: '/sales' },
];

export default function SalesIndex({ sales, filters, branches = [], isSuperAdmin = false }: { sales: any, filters: any, branches?: any[], isSuperAdmin?: boolean }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [status, setStatus] = useState(filters?.status || 'ALL');
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');
    const [branchId, setBranchId] = useState(filters?.branch_id || '');

    const applyFilters = () => {
        router.get('/sales', { 
            search, 
            status: status === 'ALL' ? '' : status,
            date_from: dateFrom,
            date_to: dateTo,
            branch_id: branchId === 'ALL' ? '' : branchId
        }, { preserveState: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('ALL');
        setDateFrom('');
        setDateTo('');
        router.get('/sales');
    };

    return (
        <>
            <Head title="Ventas" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Ventas</h2>
                        <p className="text-sm text-gray-500">Historial de ventas y salidas de inventario.</p>
                    </div>
                    <Link href="/sales/create">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Nueva Venta
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative max-w-sm flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar cliente, producto o doc..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    
                    <Select value={status} onValueChange={(val) => {
 setStatus(val); 
}}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos los estados</SelectItem>
                            <SelectItem value="DRAFT">Borrador</SelectItem>
                            <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                            <SelectItem value="CANCELLED">Anulado</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[140px]" />
                        <span className="text-muted-foreground">-</span>
                        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[140px]" />
                    </div>

                    
                    {isSuperAdmin && branches && branches.length > 0 && (
                        <Select value={branchId} onValueChange={(val) => setBranchId(val)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Todas las Sucursales" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas las Sucursales</SelectItem>
                                {branches.map((b: any) => (
                                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Button variant="secondary" onClick={applyFilters}><Filter className="h-4 w-4 mr-2" /> Filtrar</Button>
                    {(search || status !== 'ALL' || dateFrom || dateTo) && (
                        <Button variant="ghost" onClick={clearFilters}>Limpiar</Button>
                    )}
                </div>

                <div className="rounded-md border bg-card text-card-foreground">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha y Hora</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Comprobante</TableHead>
                                <TableHead>Serie</TableHead>
                                <TableHead>Número</TableHead>
                                <TableHead>Op. Gravada</TableHead>
                                <TableHead>IGV</TableHead>
                                <TableHead>Moneda</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales.data && sales.data.length > 0 ? (
                                sales.data.map((p: any) => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{new Date(p.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{p.customer_name_snapshot || p.customer?.legal_name || 'Desconocido'}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={p.lines?.map((l: any) => l.product_name_snapshot || l.product?.name).join(', ')}>
                                                {p.lines?.map((l: any) => l.product_name_snapshot || l.product?.name).join(', ') || 'Sin productos'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{p.sale_type || 'N/A'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {p.external_document_series || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {p.external_document_number || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {p.currency_code === 'USD' ? '$' : 'S/'} {Number(p.subtotal_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            {p.currency_code === 'USD' ? '$' : 'S/'} {Number(p.tax_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell>{p.currency_code === 'USD' ? 'USD' : 'PEN'}</TableCell>
                                          <TableCell className="font-medium">
                                            {p.currency_code === 'USD' ? '$' : 'S/'} {Number(p.total_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            {p.status === 'DRAFT' && <Badge variant="secondary">Borrador</Badge>}
                                            {p.status === 'CONFIRMED' && <Badge className="bg-green-600 hover:bg-green-700">Confirmado</Badge>}
                                            {p.status === 'CANCELLED' && <Badge variant="destructive">Anulado</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/sales/${p.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="h-4 w-4 mr-1" /> Ver
                                                    </Button>
                                                </Link>
                                                {p.status === 'DRAFT' && (
                                                    <Link href={`/sales/${p.id}/edit`}>
                                                        <Button variant="outline" size="sm">
                                                            Editar
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center p-8 text-muted-foreground">
                                        No se encontraron ventas con los filtros actuales.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

SalesIndex.layout = {
    breadcrumbs,
};
