import { Head, Link, router } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, FileText, User, Calendar, Undo2 } from 'lucide-react';
import { useState } from 'react';

export default function CustomerReturnShow({ customerReturn }: { customerReturn: any }) {
    const [processing, setProcessing] = useState(false);
    
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Devoluciones', href: '/customer-returns' },
        { title: customerReturn.return_number, href: `/customer-returns/${customerReturn.id}` },
    ];

    const handleConfirm = () => {
        if (!confirm('Ests seguro de confirmar esta devolucin? El inventario ser restaurado al Kardex y se ajustarn los saldos pendientes.')) return;
        setProcessing(true);
        router.post(route('customer-returns.confirm', customerReturn.id), {}, {
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <>
            <Head title={`Devolucin ${customerReturn.return_number}`} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={route('customer-returns.index')}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Nota de Devolucin {customerReturn.return_number}</h1>
                            <p className="text-muted-foreground">Revisa los productos devueltos.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        {customerReturn.status === 'DRAFT' ? (
                            <>
                                <Badge variant="outline" className="bg-gray-100 text-gray-800 text-sm px-4 py-1">Borrador</Badge>
                                <Button onClick={handleConfirm} disabled={processing} className="bg-green-600 hover:bg-green-700 gap-2">
                                    <CheckCircle className="h-4 w-4" /> Confirmar e Ingresar Stock
                                </Button>
                            </>
                        ) : (
                            <Badge className="bg-green-100 text-green-800 text-sm px-4 py-1">Confirmada</Badge>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Monto Total Devuelto</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-600">
                                - {customerReturn.currency_code} {parseFloat(customerReturn.total_amount).toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Fecha de Devolucin</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">
                                {new Date(customerReturn.operation_date).toLocaleDateString()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Venta Origen</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">
                                {customerReturn.sale ? (
                                    <Link href={route('sales.show', customerReturn.sale_id)} className="text-blue-600 hover:underline">
                                        {customerReturn.sale.sale_number}
                                    </Link>
                                ) : 'N/A'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" /> Datos del Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <span className="font-semibold">Nombre:</span> {customerReturn.customer.legal_name}
                            </div>
                            <div>
                                <span className="font-semibold">Documento:</span> {customerReturn.customer.document_type} {customerReturn.customer.document_number}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" /> Detalles Adicionales
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <span className="font-semibold">Motivo:</span> {customerReturn.notes || 'No especificado'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Undo2 className="h-5 w-5" /> Lneas de Devolucin</CardTitle>
                        <CardDescription>Productos que retornan al inventario y deducen el saldo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-center">Cantidad</TableHead>
                                    <TableHead className="text-right">Precio Unit.</TableHead>
                                    <TableHead className="text-right">Subtotal Reembolsable</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerReturn.lines.map((line: any) => (
                                    <TableRow key={line.id}>
                                        <TableCell>{line.product ? line.product.name : 'Desconocido'}</TableCell>
                                        <TableCell className="text-center font-medium">{line.quantity}</TableCell>
                                        <TableCell className="text-right">{customerReturn.currency_code} {parseFloat(line.unit_price).toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-red-600 font-medium">
                                            - {customerReturn.currency_code} {parseFloat(line.total_price).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}


CustomerReturnShow.layout = {
    breadcrumbs,
};
