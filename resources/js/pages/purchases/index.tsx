import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Eye, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compras', href: '/purchases' },
];

export default function PurchasesIndex({ purchases }: { purchases: any[] }) {
    const [search, setSearch] = useState('');

    const filteredPurchases = purchases.filter(p =>
        p.purchase_number.toLowerCase().includes(search.toLowerCase()) ||
        (p.supplier?.legal_name && p.supplier.legal_name.toLowerCase().includes(search.toLowerCase()))
    );

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

                <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por número o proveedor..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-md border bg-card text-card-foreground">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPurchases.length > 0 ? (
                                filteredPurchases.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">
                                            {p.purchase_number}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(p.document_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {p.supplier?.legal_name || 'Desconocido'}
                                        </TableCell>
                                        <TableCell>
                                            S/ {Number(p.total_amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            {p.status === 'DRAFT' ? (
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Borrador</Badge>
                                            ) : p.status === 'CONFIRMED' ? (
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmado</Badge>
                                            ) : (
                                                <Badge variant="destructive">Anulado</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/purchases/${p.id}`}>
                                                <Button variant="ghost" size="icon">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No se encontraron compras.
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
