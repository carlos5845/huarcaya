import { Head, Link } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, ArrowLeft, Calendar, FileText, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';

export default function ReceivableShow({ receivable, payment_methods }: { receivable: any, payment_methods: any[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Cuentas por Cobrar', href: '/receivables' },
        { title: `Deuda de ${receivable.customer.legal_name}`, href: `/receivables/${receivable.id}` },
    ];

    const isOverdue = new Date(receivable.due_date) < new Date() && receivable.status === 'ACTIVE';
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: receivable.balance_amount,
        payment_method_id: payment_methods && payment_methods.length > 0 ? payment_methods[0].id.toString() : '',
        operation_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/receivables/${receivable.id}/payments`, {
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                reset();
            },
        });
    };


    return (
        <>
            <Head title={`Deuda - ${receivable.customer.legal_name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/receivables">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Detalle de Cuenta por Cobrar</h1>
                            <p className="text-muted-foreground">Revisa los saldos y amortizaciones de esta deuda.</p>
                        </div>
                    </div>
                    <div>
                        {receivable.status === 'ACTIVE' ? (
                            <Badge className="bg-yellow-100 text-yellow-800 text-sm px-4 py-1">Pendiente</Badge>
                        ) : (
                            <Badge className="bg-green-100 text-green-800 text-sm px-4 py-1">Pagado</Badge>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Monto Original</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {receivable.currency_code} {parseFloat(receivable.original_amount).toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Pendiente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${receivable.balance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {receivable.currency_code} {parseFloat(receivable.balance_amount).toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Vencimiento</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${isOverdue ? 'text-red-600' : ''}`}>
                                {new Date(receivable.due_date).toLocaleDateString()}
                            </div>
                            {isOverdue && <p className="text-xs text-red-500 font-medium mt-1">Deuda vencida</p>}
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
                                <span className="font-semibold">Nombre:</span> {receivable.customer.legal_name}
                            </div>
                            <div>
                                <span className="font-semibold">Documento:</span> {receivable.customer.document_type} {receivable.customer.document_number}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" /> Documento Origen
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <span className="font-semibold">Referencia:</span>{' '}
                                {receivable.sale ? (
                                    <Link href={`/sales/${receivable.sale_id}`} className="text-blue-600 hover:underline">
                                        Venta {receivable.sale.sale_number} ({receivable.sale.external_document_type})
                                    </Link>
                                ) : 'N/A'}
                            </div>
                            <div>
                                <span className="font-semibold">Fecha de Emisin:</span> {new Date(receivable.issue_date).toLocaleDateString()}
                            </div>
                            <div>
                                <span className="font-semibold">Notas:</span> {receivable.notes || 'Ninguna'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Historial de Pagos (Amortizaciones)</CardTitle>
                            <CardDescription>Abonos realizados a esta cuenta.</CardDescription>
                        </div>
                        {receivable.status === 'ACTIVE' && (
                            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                                        <Landmark className="h-4 w-4" /> Registrar Pago
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Registrar Pago</DialogTitle>
                                        <DialogDescription>
                                            Ingresa el monto a amortizar. El saldo pendiente es de {receivable.currency_code} {parseFloat(receivable.balance_amount).toFixed(2)}.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handlePaymentSubmit}>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="amount">Monto a pagar</Label>
                                                <Input 
                                                    id="amount" 
                                                    type="number" 
                                                    step="0.01" 
                                                    max={receivable.balance_amount}
                                                    value={data.amount} 
                                                    onChange={e => setData('amount', e.target.value)} 
                                                />
                                                <InputError message={errors.amount} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="payment_method_id">Mtodo de Pago</Label>
                                                <Select value={data.payment_method_id} onValueChange={(v) => setData('payment_method_id', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {payment_methods?.map((pm) => (
                                                            <SelectItem key={pm.id} value={pm.id.toString()}>{pm.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <InputError message={errors.payment_method_id} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="operation_date">Fecha de Pago</Label>
                                                <Input 
                                                    id="operation_date" 
                                                    type="date" 
                                                    value={data.operation_date} 
                                                    onChange={e => setData('operation_date', e.target.value)} 
                                                />
                                                <InputError message={errors.operation_date} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="notes">Notas (Opcional)</Label>
                                                <Input 
                                                    id="notes" 
                                                    value={data.notes} 
                                                    onChange={e => setData('notes', e.target.value)} 
                                                />
                                                <InputError message={errors.notes} />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</Button>
                                            <Button type="submit" disabled={processing} className="bg-green-600 hover:bg-green-700 text-white">
                                                Guardar Pago
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Recibo de Pago</TableHead>
                                    <TableHead>Mtodo(s)</TableHead>
                                    <TableHead className="text-right">Monto Amortizado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receivable.allocations && receivable.allocations.length > 0 ? (
                                    receivable.allocations.map((alloc: any) => (
                                        <TableRow key={alloc.id}>
                                            <TableCell>{new Date(alloc.payment.operation_date).toLocaleString()}</TableCell>
                                            <TableCell>{alloc.payment.payment_number}</TableCell>
                                            <TableCell>
                                                {(alloc.payment.method_lines || alloc.payment.methodLines)?.map((ml: any) => ml.method.name).join(', ') || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-green-600">
                                                + {alloc.payment.currency_code} {parseFloat(alloc.allocated_amount).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                            No se han registrado pagos para esta cuenta.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}


ReceivableShow.layout = {
    breadcrumbs,
};
