import { Head, Link, router } from '@inertiajs/react';
import { Search, Plus, Eye, Filter } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compras', href: '/purchases' },
];

export default function PurchasesIndex({ purchases, filters, branches = [], isSuperAdmin = false }: { purchases: any, filters: any, branches?: any[], isSuperAdmin?: boolean }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [status, setStatus] = useState(filters?.status || 'ALL');
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');
    const [branchId, setBranchId] = useState(filters?.branch_id || '');

    const applyFilters = () => {
        router.get('/purchases', { 
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
        router.get('/purchases');
    };

    return (
        <>
            <Head title="Compras" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Compras</h2>
                        <p className="text-sm text-gray-500">Historial de compras y entradas de inventario.</p>
                    </div>
                    <Link href="/purchases/create">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Nueva Compra
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative max-w-sm flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar proveedor, producto o doc..."
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

                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 p-1 rounded-md border">
                        <span className="text-sm text-muted-foreground pl-2">Desde:</span>
                        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[130px] border-none shadow-none h-8" />
                        <span className="text-sm text-muted-foreground border-l pl-2">Hasta:</span>
                        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[130px] border-none shadow-none h-8" />
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
                                <TableHead>Fecha</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead>Serie</TableHead>
                                <TableHead>Número</TableHead>
                                <TableHead>Op. Gravada</TableHead>
                                <TableHead>IGV</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Moneda</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchases.data && purchases.data.length > 0 ? (
                                purchases.data.map((p: any) => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{new Date(p.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                <span className="text-xs text-gray-500">{new Date(p.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {p.supplier?.legal_name || 'Desconocido'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{p.supplier_document_type || 'N/A'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {p.supplier_document_series || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {p.supplier_document_number || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {p.currency_code === 'USD' ? '$' : 'S/'} {Number(p.subtotal_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            {p.currency_code === 'USD' ? '$' : 'S/'} {Number(p.tax_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {p.currency_code === 'USD' ? '$' : 'S/'} {Number(p.total_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell>{p.currency_code === 'USD' ? 'USD' : 'PEN'}</TableCell>
                                          <TableCell>
                                            {p.status === 'DRAFT' && <Badge variant="secondary">Borrador</Badge>}
                                            {p.status === 'CONFIRMED' && <Badge className="bg-green-600 hover:bg-green-700">Confirmado</Badge>}
                                            {p.status === 'CANCELLED' && <Badge variant="destructive">Anulado</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {p.document_file_path ? (
                                                    <a href={`/storage/${p.document_file_path}`} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="outline" size="sm" title="Ver Archivo Adjunto">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-500"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                        </Button>
                                                    </a>
                                                ) : (
                                                    <Button variant="outline" size="sm" title="Sin Archivo Adjunto" onClick={() => alert('No hay un archivo adjunto a esta compra.')}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-400"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                    </Button>
                                                )}
                                                {p.status === 'DRAFT' && (
                                                    <Link href={`/purchases/${p.id}/edit`}>
                                                        <Button variant="outline" size="sm">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg> Editar
                                                        </Button>
                                                    </Link>
                                                )}
                                                <Link href={`/purchases/${p.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="h-4 w-4 mr-1" /> Ver
                                                    </Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center p-8 text-muted-foreground">
                                        No se encontraron compras con los filtros actuales.
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

PurchasesIndex.layout = {
    breadcrumbs,
};
