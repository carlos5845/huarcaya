import { Head, Link, useForm, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Ventas', href: '/sales' },
    { title: 'Detalle de Venta', href: '#' },
];

export default function SaleShow({ sale }: { sale: any }) {
    const confirmSale = () => {
        if (confirm('¿Estás seguro de confirmar esta venta? Esto actualizará el inventario y no se puede deshacer de forma sencilla.')) {
            router.post(`/sales/${sale.id}/confirm`);
        }
    };

    return (
        <>
            <Head title={`Venta ${sale.sale_number}`} />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-5xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/sales">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                                    Venta {sale.sale_number}
                                </h2>
                                {sale.status === 'DRAFT' ? (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Borrador</Badge>
                                ) : sale.status === 'CONFIRMED' ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmado</Badge>
                                ) : (
                                    <Badge variant="destructive">Anulado</Badge>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">Detalles de la venta</p>
                        </div>
                    </div>
                    
                    {sale.status === 'DRAFT' && (
                        <Button onClick={confirmSale} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="h-4 w-4" /> Confirmar e Ingresar a Kardex
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Datos del Comprobante</h3>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div>
                                <div className="text-gray-500">Cliente</div>
                                <div className="font-medium">{sale.customer?.legal_name || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">RUC/DNI</div>
                                <div className="font-medium">{sale.customer?.document_number || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Tipo de Documento</div>
                                <div className="font-medium">
                                    {sale.external_document_type || sale.sale_type || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Serie y Número</div>
                                <div className="font-medium">
                                    {(sale.external_document_series ? sale.external_document_series + '-' : '') + (sale.external_document_number || 'S/D')}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500">Fecha Emisión</div>
                                <div className="font-medium">{new Date(sale.operation_date).toLocaleDateString('es-PE', { timeZone: 'UTC' })}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border space-y-4">
                        <h3 className="font-medium text-lg border-b pb-2">Información Adicional</h3>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div>
                                <div className="text-gray-500">Registrado por</div>
                                <div className="font-medium">{sale.creator?.name || 'Sistema'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Fecha de Registro</div>
                                <div className="font-medium">{new Date(sale.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                            </div>
                            <div className="col-span-2">
                                <div className="text-gray-500">Notas</div>
                                <div className="font-medium">{sale.notes || '-'}</div>
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
                                    <TableHead className="text-center">Cantidad</TableHead>
                                    <TableHead className="text-right">Precio Unit.</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sale.lines && sale.lines.length > 0 ? (
                                    sale.lines.map((line: any) => (
                                        <TableRow key={line.id}>
                                            <TableCell>
                                                <div className="font-medium">{line.product?.name || line.product_name_snapshot}</div>
                                                <div className="text-xs text-muted-foreground">{line.product?.primary_reference || line.product_reference_snapshot}</div>
                                            </TableCell>
                                            <TableCell className="text-center">{Number(line.quantity)}</TableCell>
                                            <TableCell className="text-right">{sale.currency_code === 'USD' ? '$' : 'S/'} {Number(line.unit_price).toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-medium">{sale.currency_code === 'USD' ? '$' : 'S/'} {Number(line.line_total || line.line_subtotal).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">Sin detalles</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                    </Table>

                    <div className="flex justify-end pt-4 border-t">
                        <div className="text-right space-y-2 w-64">
                            {Number(sale.tax_amount) > 0 && (
                                <>
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-muted-foreground">Subtotal:</span>
                                        <span>{sale.currency_code === 'USD' ? '$' : 'S/'} {Number(sale.subtotal_amount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-muted-foreground">IGV:</span>
                                        <span>{sale.currency_code === 'USD' ? '$' : 'S/'} {Number(sale.tax_amount).toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between text-xl font-bold pt-2 border-t mt-2">
                                <span>Total:</span>
                                <span>{sale.currency_code === 'USD' ? '$' : 'S/'} {Number(sale.total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


SaleShow.layout = {
    breadcrumbs,
};
