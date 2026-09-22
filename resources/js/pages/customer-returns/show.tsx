import { Head, Link, router } from '@inertiajs/react';
import { 
    ArrowLeft, 
    CheckCircle, 
    FileText, 
    User, 
    Calendar, 
    Undo2, 
    Package, 
    Building2, 
    Clock, 
    ExternalLink, 
    AlertCircle, 
    ShieldCheck 
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Devoluciones', href: '/customer-returns' },
    { title: 'Detalle de Devolución', href: '#' },
];

export default function CustomerReturnShow({ customerReturn }: { customerReturn: any }) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = () => {
        if (!confirm('¿Estás seguro de confirmar esta devolución? El inventario será restaurado al Kardex y se ajustarán los saldos correspondientes.')) {
            return;
        }
        setProcessing(true);
        router.post(`/customer-returns/${customerReturn.id}/confirm`, {}, {
            onFinish: () => setProcessing(false),
        });
    };

    const currencySymbol = customerReturn.currency_code === 'USD' ? '$' : 'S/';
    const totalAmount = Number(customerReturn.total_amount || 0);
    const isDraft = customerReturn.status === 'DRAFT';
    const isConfirmed = customerReturn.status === 'CONFIRMED';

    return (
        <>
            <Head title={`Nota de Devolución ${customerReturn.return_number}`} />

            <div className="flex h-full flex-1 flex-col gap-5 rounded-xl p-4 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <Link href="/customer-returns">
                            <Button variant="outline" size="icon" className="h-9 w-9">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight">
                                    Nota de Devolución {customerReturn.return_number}
                                </h1>
                                {isDraft ? (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs px-2.5 py-0.5">
                                        Borrador
                                    </Badge>
                                ) : isConfirmed ? (
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs px-2.5 py-0.5">
                                        Confirmada
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs px-2.5 py-0.5">
                                        {customerReturn.status}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Operación del {new Date(customerReturn.operation_date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isDraft && (
                            <Button 
                                onClick={handleConfirm} 
                                disabled={processing} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 text-xs font-semibold shadow-xs"
                            >
                                <CheckCircle className="h-4 w-4" /> 
                                {processing ? 'Confirmando...' : 'Confirmar e Ingresar Stock al Kardex'}
                            </Button>
                        )}
                        {isConfirmed && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                <ShieldCheck className="h-4 w-4" />
                                <span className="font-medium">Inventario y Kardex Actualizados</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Banner de Borrador si no está confirmado */}
                {isDraft && (
                    <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 text-amber-700 dark:text-amber-400 text-xs">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <div>
                            <span className="font-semibold">Esta nota de devolución está en estado Borrador.</span> El inventario aún NO ha sido reingresado al Kardex ni se han ajustado las cuentas por cobrar. Haz clic en <strong>"Confirmar e Ingresar Stock al Kardex"</strong> para aplicar los movimientos.
                        </div>
                    </div>
                )}

                {/* Grid principal */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Columna Izquierda / Central: 2 columnas */}
                    <div className="lg:col-span-2 flex flex-col gap-5">
                        {/* Tabla de Productos Devueltos */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Undo2 className="h-4 w-4 text-primary" /> Productos Devueltos
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Detalle de los artículos que retornan al inventario y deducen el saldo de la venta.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/40">
                                            <TableHead className="font-semibold">Producto</TableHead>
                                            <TableHead className="font-semibold text-center w-24">Cantidad</TableHead>
                                            <TableHead className="font-semibold text-right w-28">Precio Unit.</TableHead>
                                            <TableHead className="font-semibold text-right w-32">Total Devuelto</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customerReturn.lines && customerReturn.lines.length > 0 ? (
                                            customerReturn.lines.map((line: any) => {
                                                const productName = line.product?.name || line.sale_line?.product_name_snapshot || 'Producto';
                                                const productRef = line.product?.primary_reference || line.sale_line?.product_reference_snapshot || '';
                                                const unitName = line.product?.unit?.code || line.product?.unit?.name || 'UND';
                                                const unitPrice = Number(line.unit_price || 0);
                                                const lineTotal = Number(line.line_total ?? (line.quantity * unitPrice));

                                                return (
                                                    <TableRow key={line.id} className="text-xs">
                                                        <TableCell className="py-3">
                                                            <div className="font-medium text-foreground">{productName}</div>
                                                            {productRef && (
                                                                <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                                                    Ref: {productRef}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono py-3 font-semibold">
                                                            {Number(line.quantity)} <span className="text-[10px] text-muted-foreground font-normal">{unitName}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono py-3">
                                                            {currencySymbol} {unitPrice.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono py-3 font-semibold text-rose-600 dark:text-rose-400">
                                                            - {currencySymbol} {lineTotal.toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                                                    No se registraron líneas de devolución.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Motivo y Observaciones */}
                        <Card className="border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" /> Motivo / Observaciones
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/60">
                                    {customerReturn.notes ? customerReturn.notes : 'Sin observaciones registradas.'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna Derecha: Sidebar */}
                    <div className="flex flex-col gap-5">
                        {/* Resumen Financiero */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold">Resumen de la Devolución</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center">
                                    <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Monto Total a Reembolsar</div>
                                    <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                                        - {currencySymbol} {totalAmount.toFixed(2)}
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs pt-1 border-t border-border">
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" /> Fecha Operación:
                                        </span>
                                        <span className="font-medium">
                                            {new Date(customerReturn.operation_date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-t border-border/50">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                            <Building2 className="h-3.5 w-3.5" /> Sucursal:
                                        </span>
                                        <span className="font-medium">
                                            {customerReturn.branch?.name || 'Sucursal Principal'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-t border-border/50">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                            <Package className="h-3.5 w-3.5" /> Moneda:
                                        </span>
                                        <span className="font-mono font-medium">
                                            {customerReturn.currency_code} (T.C. {Number(customerReturn.exchange_rate || 1).toFixed(3)})
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Venta Origen */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <ExternalLink className="h-4 w-4 text-primary" /> Venta de Origen
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs">
                                {customerReturn.sale ? (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Comprobante:</span>
                                            <Link 
                                                href={`/sales/${customerReturn.sale_id}`} 
                                                className="font-mono font-semibold text-primary hover:underline flex items-center gap-1"
                                            >
                                                {customerReturn.sale.sale_number}
                                                <ExternalLink className="h-3 w-3" />
                                            </Link>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Tipo Venta:</span>
                                            <span className="font-medium">{customerReturn.sale.sale_type} ({customerReturn.sale.payment_type})</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Total Venta:</span>
                                            <span className="font-mono font-medium">
                                                {currencySymbol} {Number(customerReturn.sale.total_amount || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-muted-foreground">No vinculada a venta específica.</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Cliente */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" /> Datos del Cliente
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs">
                                <div>
                                    <div className="text-muted-foreground text-[11px]">Cliente / Razón Social:</div>
                                    <div className="font-semibold text-foreground mt-0.5">
                                        {customerReturn.customer?.legal_name || 'Cliente Varios'}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border/50">
                                    <div className="text-muted-foreground text-[11px]">Documento:</div>
                                    <div className="font-mono mt-0.5">
                                        {customerReturn.customer?.document_type || 'DOC'}: {customerReturn.customer?.document_number || '-'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Registro y Auditoría */}
                        <Card className="border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" /> Auditoría
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2.5 text-xs">
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Creado por:</span>
                                    <span className="font-medium text-foreground">{customerReturn.creator?.name || 'Sistema'}</span>
                                    <span className="text-muted-foreground block text-[11px]">
                                        {customerReturn.created_at ? new Date(customerReturn.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                                    </span>
                                </div>

                                {customerReturn.confirmed_at && (
                                    <div className="pt-2 border-t border-border/50">
                                        <span className="text-muted-foreground block text-[11px]">Confirmado en Kardex por:</span>
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                            {customerReturn.confirmed_by?.name || 'Usuario'}
                                        </span>
                                        <span className="text-muted-foreground block text-[11px]">
                                            {new Date(customerReturn.confirmed_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

CustomerReturnShow.layout = {
    breadcrumbs,
};
