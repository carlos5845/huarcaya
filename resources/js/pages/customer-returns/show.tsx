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
    ShieldCheck,
    Ban,
    PackageCheck,
    PackageX,
    Wallet,
    AlertTriangle,
    Printer
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentPreviewModal } from '@/components/document-preview-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Devoluciones', href: '/customer-returns' },
    { title: 'Detalle de Devolución', href: '#' },
];

export default function CustomerReturnShow({ customerReturn }: { customerReturn: any }) {
    const [processing, setProcessing] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [cancelError, setCancelError] = useState('');

    const handleConfirm = () => {
        if (!confirm('¿Estás seguro de confirmar esta devolución? El inventario será restaurado y se procesará el cuadre financiero.')) {
            return;
        }
        setProcessing(true);
        router.post(`/customer-returns/${customerReturn.id}/confirm`, {}, {
            onFinish: () => setProcessing(false),
        });
    };

    const handleCancelReturn = () => {
        if (cancellationReason.trim().length < 5) {
            setCancelError('El motivo de anulación debe tener al menos 5 caracteres.');
            return;
        }
        setCancelError('');
        setProcessing(true);
        router.post(`/customer-returns/${customerReturn.id}/cancel`, {
            cancellation_reason: cancellationReason.trim(),
        }, {
            onSuccess: () => {
                setCancelModalOpen(false);
                setCancellationReason('');
            },
            onFinish: () => setProcessing(false),
        });
    };

    const currencySymbol = customerReturn.currency_code === 'USD' ? '$' : 'S/';
    const subtotalAmount = Number(customerReturn.subtotal_amount || 0);
    const taxAmount = Number(customerReturn.tax_amount || 0);
    const totalAmount = Number(customerReturn.total_amount || 0);
    const creditApplied = Number(customerReturn.credit_applied_amount || 0);
    const refundedAmount = Number(customerReturn.refunded_amount || 0);
    const isDraft = customerReturn.status === 'DRAFT';
    const isConfirmed = customerReturn.status === 'CONFIRMED';
    const isCancelled = customerReturn.status === 'CANCELLED';
    const isElectronic = Boolean(customerReturn.is_electronic_invoiced);
    const fiscalCreditNoteNumber = customerReturn.credit_note_series && customerReturn.credit_note_number
        ? `${customerReturn.credit_note_series}-${customerReturn.credit_note_number}`
        : null;

    const getCatalog09Label = (code: string) => {
        switch (code) {
            case '01': return '01 - Anulación de la operación';
            case '06': return '06 - Devolución total';
            case '07': return '07 - Devolución por ítem';
            default: return code || 'No especificado';
        }
    };

    const getSettlementLabel = (type: string) => {
        switch (type) {
            case 'CASH_REFUND': return 'Egreso Directo de Caja';
            case 'STORE_CREDIT': return 'Saldo a Favor del Cliente';
            case 'RECEIVABLE_OFFSET': return 'Amortización de Deuda (Crédito)';
            default: return type || 'Estándar';
        }
    };

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
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight">
                                    {isElectronic && fiscalCreditNoteNumber
                                        ? `Nota de Crédito ${fiscalCreditNoteNumber}`
                                        : `Nota de Devolución ${customerReturn.return_number}`}
                                </h1>
                                {isElectronic && fiscalCreditNoteNumber && (
                                    <Badge variant="outline" className="font-mono text-[11px] border-primary/30 text-primary">
                                        Op: {customerReturn.return_number}
                                    </Badge>
                                )}
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
                                        Anulada
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Operación del {new Date(customerReturn.operation_date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewModalOpen(true)}
                            className="h-9 text-xs gap-1.5 font-medium"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            {isElectronic ? 'Imprimir Nota de Crédito' : 'Imprimir Vale de Devolución'}
                        </Button>

                        {isDraft && (
                            <Button 
                                onClick={handleConfirm} 
                                disabled={processing} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 text-xs font-semibold shadow-xs"
                            >
                                <CheckCircle className="h-4 w-4" /> 
                                {processing ? 'Confirmando...' : 'Confirmar e Ingresar Stock'}
                            </Button>
                        )}
                        {isConfirmed && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                <ShieldCheck className="h-4 w-4" />
                                <span className="font-medium">Inventario y Cuadre Actualizados</span>
                            </div>
                        )}
                        {!isCancelled && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCancelModalOpen(true)}
                                disabled={processing}
                                className="h-9 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900/50 dark:hover:bg-rose-950/40 gap-1.5"
                            >
                                <Ban className="h-3.5 w-3.5" />
                                Anular Devolución
                            </Button>
                        )}
                    </div>
                </div>

                {/* Banner de Estado */}
                {isDraft && (
                    <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 text-amber-700 dark:text-amber-400 text-xs">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <div>
                            <span className="font-semibold">Esta nota de devolución está en estado Borrador.</span> El inventario aún NO ha sido reingresado ni se han ajustado los saldos. Haz clic en <strong>"Confirmar e Ingresar Stock"</strong> para aplicar los movimientos.
                        </div>
                    </div>
                )}

                {isCancelled && (
                    <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3.5 text-rose-700 dark:text-rose-400 text-xs">
                        <Ban className="h-5 w-5 shrink-0" />
                        <div>
                            <span className="font-semibold">Esta devolución fue ANULADA.</span> Todos sus efectos en Kardex, lotes, cuentas por cobrar y caja han sido revertidos.
                            {customerReturn.cancellation_reason && (
                                <div className="mt-1"><strong>Motivo de anulación:</strong> {customerReturn.cancellation_reason}</div>
                            )}
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
                                    <Undo2 className="h-4 w-4 text-primary" /> Productos Devueltos y Triaje Físico
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Detalle de los artículos devueltos y su estado de calidad (Buen estado vs Dañado/Merma).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/40">
                                            <TableHead className="font-semibold">Producto</TableHead>
                                            <TableHead className="font-semibold text-center">Estado / Triaje</TableHead>
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
                                                const isDamaged = line.condition === 'DAMAGED';

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
                                                        <TableCell className="text-center py-3">
                                                            {isDamaged ? (
                                                                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] gap-1">
                                                                    <PackageX className="h-3 w-3" />
                                                                    Dañado (Cuarentena)
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
                                                                    <PackageCheck className="h-3 w-3" />
                                                                    Buen Estado (Vendible)
                                                                </Badge>
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
                                                <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
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
                            <CardContent className="space-y-2">
                                <p className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/60">
                                    {customerReturn.notes ? customerReturn.notes : 'Sin observaciones registradas.'}
                                </p>
                                {customerReturn.override_deadline_reason && (
                                    <div className="text-xs bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-amber-800 dark:text-amber-300">
                                        <strong>Justificación por Excepción de Plazo:</strong> {customerReturn.override_deadline_reason}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna Derecha: Sidebar */}
                    <div className="flex flex-col gap-5">
                        {/* Fase 5: Comprobante Tributario SUNAT vs Vale Interno */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    {isElectronic ? 'Nota de Crédito Electrónica (SUNAT)' : 'Vale de Devolución Interno'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2.5 text-xs">
                                {isElectronic ? (
                                    <>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-muted-foreground">Serie y Número Fiscal:</span>
                                            <span className="font-mono font-bold text-primary">
                                                {fiscalCreditNoteNumber || 'Pendiente al confirmar'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-t border-border/50">
                                            <span className="text-muted-foreground">Catálogo 09 SUNAT:</span>
                                            <Badge variant="outline" className="text-[10px]">
                                                {getCatalog09Label(customerReturn.sunat_credit_note_type)}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-t border-border/50">
                                            <span className="text-muted-foreground">Doc. Afectado ({customerReturn.referenced_document_type}):</span>
                                            <span className="font-mono font-semibold">
                                                {customerReturn.referenced_document_series
                                                    ? `${customerReturn.referenced_document_series}-${customerReturn.referenced_document_number}`
                                                    : customerReturn.sale?.sale_number}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-t border-border/50">
                                            <span className="text-muted-foreground">Estado Electrónico:</span>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    customerReturn.electronic_status === 'CANCELLED'
                                                        ? 'text-[10px] border-rose-500/30 text-rose-600'
                                                        : 'text-[10px] border-emerald-500/30 text-emerald-600'
                                                }
                                            >
                                                {customerReturn.electronic_status === 'PENDING_EMISSION'
                                                    ? 'Lista para envío SUNAT'
                                                    : customerReturn.electronic_status}
                                            </Badge>
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1">
                                        <div className="flex justify-between items-center font-semibold">
                                            <span>Control Interno de Almacén</span>
                                            <Badge variant="outline" className="text-[10px]">No Tributario</Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Correlativo interno <span className="font-mono font-semibold">{customerReturn.return_number}</span> vinculado a nota de venta interna.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Resumen Financiero */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-primary" /> Resumen y Liquidación Financiera
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center">
                                    <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Monto Total de Devolución</div>
                                    <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                                        - {currencySymbol} {totalAmount.toFixed(2)}
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs pt-1 border-t border-border">
                                    {taxAmount > 0 && (
                                        <>
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-muted-foreground">Op. Gravada (Subtotal):</span>
                                                <span className="font-mono">{currencySymbol} {subtotalAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-t border-border/50">
                                                <span className="text-muted-foreground">I.G.V. (18%):</span>
                                                <span className="font-mono">{currencySymbol} {taxAmount.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between items-center py-1 border-t border-border/50">
                                        <span className="text-muted-foreground">Modalidad:</span>
                                        <Badge variant="outline" className="text-[10px]">
                                            {getSettlementLabel(customerReturn.settlement_type)}
                                        </Badge>
                                    </div>

                                    {creditApplied > 0 && (
                                        <div className="flex justify-between items-center py-1 border-t border-border/50">
                                            <span className="text-muted-foreground">Amortizado en Deuda:</span>
                                            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                                {currencySymbol} {creditApplied.toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    {refundedAmount > 0 && (
                                        <div className="flex justify-between items-center py-1 border-t border-border/50">
                                            <span className="text-muted-foreground">
                                                {customerReturn.settlement_type === 'STORE_CREDIT' ? 'Abonado a Saldo Cliente:' : 'Reembolsado de Caja:'}
                                            </span>
                                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                                {currencySymbol} {refundedAmount.toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    {customerReturn.refund_payment_method && (
                                        <div className="flex justify-between items-center py-1 border-t border-border/50">
                                            <span className="text-muted-foreground">Medio de Salida:</span>
                                            <span className="font-medium">{customerReturn.refund_payment_method.name}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center py-1 border-t border-border/50">
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
                                {Number(customerReturn.customer?.store_credit_balance || 0) > 0 && (
                                    <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                                        <span className="text-muted-foreground text-[11px]">Saldo a Favor Actual:</span>
                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-mono text-xs">
                                            S/ {Number(customerReturn.customer.store_credit_balance).toFixed(2)}
                                        </Badge>
                                    </div>
                                )}
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
                                        <span className="text-muted-foreground block text-[11px]">Confirmado por:</span>
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                            {customerReturn.confirmed_by?.name || 'Usuario'}
                                        </span>
                                        <span className="text-muted-foreground block text-[11px]">
                                            {new Date(customerReturn.confirmed_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </span>
                                    </div>
                                )}

                                {customerReturn.cancelled_at && (
                                    <div className="pt-2 border-t border-border/50">
                                        <span className="text-muted-foreground block text-[11px]">Anulado por:</span>
                                        <span className="font-medium text-rose-600 dark:text-rose-400">
                                            {customerReturn.cancelled_by?.name || 'Usuario'}
                                        </span>
                                        <span className="text-muted-foreground block text-[11px]">
                                            {new Date(customerReturn.cancelled_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Modal de Anulación Controlada */}
            <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-rose-100 dark:bg-rose-950/60 p-2.5 text-rose-600 dark:text-rose-400 shrink-0">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base">Anular Devolución {customerReturn.return_number}</DialogTitle>
                                <DialogDescription className="text-xs mt-0.5">
                                    Esta acción ejecutará la transacción inversa auditable.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div className="p-3 rounded-lg bg-muted/60 border space-y-1 text-muted-foreground">
                            <p>• Se retirarán del almacén las unidades que habían reingresado.</p>
                            <p>• Se registrará una salida en el Kardex por concepto de anulación.</p>
                            <p>• Se restablecerá la deuda de la venta o se anulará el reembolso de caja.</p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="cancel_reason" className="text-xs font-semibold">
                                Motivo de Anulación (Obligatorio)
                            </Label>
                            <Input
                                id="cancel_reason"
                                placeholder="Ej: Error en digitación de cantidades o comprobante equivocado..."
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                className="h-9 text-xs"
                            />
                            {cancelError && <p className="text-rose-600 text-[11px] font-medium">{cancelError}</p>}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleCancelReturn} disabled={processing}>
                            {processing ? 'Anulando...' : 'Confirmar Anulación'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DocumentPreviewModal
                open={previewModalOpen}
                onOpenChange={setPreviewModalOpen}
                url={`/customer-returns/${customerReturn.id}/print`}
                title={
                    isElectronic
                        ? `Nota de Crédito Electrónica — ${fiscalCreditNoteNumber || customerReturn.return_number}`
                        : `Vale de Devolución / Ingreso a Almacén — ${customerReturn.return_number}`
                }
                subtitle={customerReturn.customer?.legal_name || 'Cliente Varios'}
            />
        </>
    );
}

CustomerReturnShow.layout = {
    breadcrumbs,
};
