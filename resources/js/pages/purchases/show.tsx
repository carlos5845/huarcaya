import { Head, Link, useForm, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compras', href: '/purchases' },
    { title: 'Detalle de Compra', href: '#' },
];

export default function PurchaseShow({ purchase }: { purchase: any }) {
    const confirmPurchase = () => {
        if (confirm('¿Estás seguro de confirmar esta compra? Esto actualizará el inventario y no se puede deshacer de forma sencilla.')) {
            router.post(`/purchases/${purchase.id}/confirm`);
        }
    };

    return (
        <>
            <Head title={`Compra ${purchase.purchase_number}`} />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-5xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/purchases">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                                    Compra {purchase.purchase_number}
                                </h2>
                                {purchase.status === 'DRAFT' ? (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Borrador</Badge>
                                ) : purchase.status === 'CONFIRMED' ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmado</Badge>
                                ) : (
                                    <Badge variant="destructive">Anulado</Badge>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">Detalles de la compra</p>
                        </div>
                    </div>
                    
                    {purchase.status === 'DRAFT' && (
                        <Button onClick={confirmPurchase} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="h-4 w-4" /> Confirmar e Ingresar a Kardex
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Datos del Comprobante</h3>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div>
                                <div className="text-gray-500">Proveedor</div>
                                <div className="font-medium">{purchase.supplier?.legal_name || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">RUC/DNI</div>
                                <div className="font-medium">{purchase.supplier?.document_number || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Documento</div>
                                <div className="font-medium">
                                    {purchase.supplier_document_type || 'N/A'} 
                                    {purchase.supplier_document_series ? ` ${purchase.supplier_document_series}-` : ' '}
                                    {purchase.supplier_document_number}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Fecha Emisión</div>
                                <div className="font-medium">{new Date(purchase.document_date).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Información Adicional</h3>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div>
                                <div className="text-gray-500">Registrado por</div>
                                <div className="font-medium">{purchase.creator?.name || 'Sistema'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Fecha de Registro</div>
                                <div className="font-medium">{new Date(purchase.created_at).toLocaleString()}</div>
                            </div>
                            <div className="col-span-2">
                                <div className="text-gray-500">Notas</div>
                                <div className="font-medium">{purchase.notes || '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border space-y-4">
                    <h3 className="font-medium text-lg border-b pb-2">Detalle de Productos</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-center">Cant. Pedida</TableHead>
                                <TableHead className="text-center">Cant. Recibida</TableHead>
                                <TableHead className="text-right">Costo Unit.</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchase.lines && purchase.lines.length > 0 ? (
                                purchase.lines.map((line: any) => (
                                    <TableRow key={line.id}>
                                        <TableCell>
                                            <div className="font-medium">{line.product?.name}</div>
                                            <div className="text-xs text-muted-foreground">{line.product?.primary_reference}</div>
                                        </TableCell>
                                        <TableCell className="text-center">{Number(line.ordered_quantity)}</TableCell>
                                        <TableCell className="text-center">{Number(line.received_quantity)}</TableCell>
                                        <TableCell className="text-right">S/ {Number(line.unit_cost_base).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-medium">S/ {Number(line.line_subtotal).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">Sin detalles</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex justify-end pt-4 border-t">
                        <div className="text-xl font-bold">
                            Total: S/ {Number(purchase.total_amount).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


PurchaseShow.layout = {
    breadcrumbs,
};
