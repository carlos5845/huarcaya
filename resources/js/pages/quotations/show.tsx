import { Head, Link, router } from '@inertiajs/react';
import { 
    Calculator, 
    ArrowLeft, 
    Printer, 
    ArrowRightCircle, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    XCircle, 
    Building2, 
    User, 
    FileText,
    CreditCard,
    Calendar,
    Phone,
    MapPin,
    Mail,
    DollarSign,
    Package,
    ShieldAlert,
    ExternalLink,
    Tag,
    Layers,
    Share2,
    Check
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentPreviewModal } from '@/components/document-preview-modal';
import ConfirmDialog from '@/components/confirm-dialog';
import { useConfirmDialog } from '@/hooks/use-confirm';

type QuotationLine = {
    id: number;
    product_reference_snapshot: string;
    product_name_snapshot: string;
    unit_code_snapshot: string;
    quantity: number;
    unit_price: number;
    line_subtotal: number;
    discount_amount: number;
    tax_amount: number;
    line_total: number;
    is_special_order: boolean;
    delivery_time_line?: string | null;
    notes?: string | null;
    product?: {
        inventories?: Array<{ quantity: number }>;
    };
};

type BankAccount = {
    id: number;
    bank_name: string;
    account_type: string;
    currency_code: string;
    account_number: string;
    cci?: string | null;
    beneficiary_name: string;
};

type Quotation = {
    id: number;
    uuid: string;
    quotation_number: string;
    operation_date: string;
    valid_until_date: string;
    validity_days: number;
    currency_code: string;
    exchange_rate: number;
    subtotal_amount: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    tax_mode: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
    customer_name_snapshot: string;
    customer_document_snapshot: string | null;
    customer_address_snapshot: string | null;
    customer_phone_snapshot: string | null;
    customer_email_snapshot: string | null;
    payment_terms: string | null;
    delivery_time: string | null;
    notes: string | null;
    branch: { id: number; name: string; address?: string | null };
    creator: { id: number; name: string } | null;
    converted_sale?: { id: number; sale_number: string } | null;
    converted_by?: { id: number; name: string } | null;
    converted_at?: string | null;
    lines: QuotationLine[];
};

type Props = {
    quotation: Quotation;
    bank_accounts: BankAccount[];
    is_expired: boolean;
};

export default function QuotationsShow({ quotation, bank_accounts, is_expired }: Props) {
    const { confirm, dialogProps } = useConfirmDialog();
    const isPEN = quotation.currency_code === 'PEN';
    const currencySymbol = isPEN ? 'S/' : '$';

    // Modal de previsualización e impresión integrado (sin abrir pestaña nueva)
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('Cotización de Repuestos');
    const [previewSubtitle, setPreviewSubtitle] = useState('');

    const handleOpenPreview = () => {
        setPreviewUrl(`/quotations/${quotation.id}/print/a4`);
        setPreviewTitle(`Cotización Comercial - ${quotation.quotation_number}`);
        setPreviewSubtitle(`Cliente: ${quotation.customer_name_snapshot} | Total: ${currencySymbol} ${Number(quotation.total_amount).toFixed(2)}`);
        setPreviewModalOpen(true);
    };

    const handleUpdateStatus = (newStatus: 'APPROVED' | 'REJECTED' | 'PENDING') => {
        const actionLabel = newStatus === 'APPROVED' ? 'Aprobar' : (newStatus === 'REJECTED' ? 'Rechazar' : 'Marcar como Pendiente');
        confirm({
            title: `¿${actionLabel} cotización?`,
            description: `Se actualizará el estado comercial de la cotización ${quotation.quotation_number}.`,
            confirmText: actionLabel,
            variant: newStatus === 'REJECTED' ? 'danger' : 'info',
            onConfirm: () => {
                router.patch(`/quotations/${quotation.id}/status`, { status: newStatus }, {
                    onSuccess: () => toast.success(`Estado actualizado a ${actionLabel}`),
                });
            },
        });
    };

    const getStatusHeaderBadge = () => {
        if (quotation.status === 'CONVERTED') {
            return (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-1 px-3 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> Convertida a Venta
                </Badge>
            );
        }
        if (is_expired || quotation.status === 'EXPIRED') {
            return (
                <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1.5 py-1 px-3 text-xs font-semibold">
                    <AlertTriangle className="h-4 w-4" /> Oferta Vencida
                </Badge>
            );
        }
        if (quotation.status === 'APPROVED') {
            return (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1.5 py-1 px-3 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> Aprobada por Cliente
                </Badge>
            );
        }
        if (quotation.status === 'REJECTED') {
            return (
                <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30 gap-1.5 py-1 px-3 text-xs font-semibold">
                    <XCircle className="h-4 w-4" /> Rechazada
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 py-1 px-3 text-xs font-semibold">
                <Clock className="h-4 w-4" /> Vigente ({quotation.validity_days} días)
            </Badge>
        );
    };

    return (
        <>
            <Head title={`Cotización ${quotation.quotation_number}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
                {/* Header Superior: Identificación y Barra de Acciones */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-5">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild className="rounded-full">
                            <Link href="/quotations">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold tracking-tight font-mono text-foreground flex items-center gap-2">
                                    <Calculator className="h-6 w-6 text-primary" />
                                    {quotation.quotation_number}
                                </h1>
                                {getStatusHeaderBadge()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                <span>Emitida el <strong className="text-foreground">{new Date(quotation.operation_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                                <span>•</span>
                                <span>Atendido por: <strong className="text-foreground">{quotation.creator?.name || 'Sistema'}</strong></span>
                                <span>•</span>
                                <span>Sede: <strong className="text-foreground">{quotation.branch.name}</strong></span>
                            </p>
                        </div>
                    </div>

                    {/* Acciones principales */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Botón Imprimir Hoja A4 dentro del sistema (Modal Integrado) */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 shadow-2xs"
                            onClick={handleOpenPreview}
                        >
                            <Printer className="h-4 w-4" />
                            Imprimir Cotización (A4)
                        </Button>

                        {quotation.status !== 'CONVERTED' && (
                            <>
                                {quotation.status !== 'APPROVED' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-xs text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950/40"
                                        onClick={() => handleUpdateStatus('APPROVED')}
                                    >
                                        <CheckCircle2 className="h-4 w-4" /> Aprobar
                                    </Button>
                                )}

                                <Button
                                    asChild
                                    size="sm"
                                    className="gap-2 font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <Link href={`/quotations/${quotation.id}/convert-to-sale`}>
                                        <ArrowRightCircle className="h-4 w-4" />
                                        Facturar / Convertir a Venta
                                    </Link>
                                </Button>
                            </>
                        )}

                        {quotation.status === 'CONVERTED' && quotation.converted_sale && (
                            <Button asChild variant="outline" size="sm" className="gap-2 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                                <Link href={`/sales/${quotation.converted_sale.id}`}>
                                    <FileText className="h-4 w-4" /> Ver Venta N° {quotation.converted_sale.sale_number}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Banner Informativo si está convertida o vencida */}
                {quotation.status === 'CONVERTED' && (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 shadow-2xs">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Cotización convertida satisfactoriamente</p>
                                <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                                    Generó el comprobante de venta <strong>{quotation.converted_sale?.sale_number}</strong>
                                    {quotation.converted_at && ` el ${new Date(quotation.converted_at).toLocaleString('es-PE')}`}
                                    {quotation.converted_by && ` por ${quotation.converted_by.name}`}.
                                </p>
                            </div>
                        </div>
                        {quotation.converted_sale && (
                            <Button asChild size="sm" variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                                <Link href={`/sales/${quotation.converted_sale.id}`}>Ir a la Venta</Link>
                            </Button>
                        )}
                    </div>
                )}

                {is_expired && quotation.status === 'PENDING' && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Plazo de vigencia comercial vencido</p>
                            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                                La oferta expiró el <strong>{new Date(quotation.valid_until_date).toLocaleDateString('es-PE')}</strong> (Plazo pactado: {quotation.validity_days} días). Se recomienda revalidar disponibilidad y costos de importación antes de emitir venta.
                            </p>
                        </div>
                    </div>
                )}

                {/* 3 Tarjetas de Resumen Ejecutivo y Metadatos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1: Cliente / Solicitante */}
                    <Card className="border border-border/60 shadow-xs hover:border-border transition-colors">
                        <CardHeader className="pb-3 border-b border-border/40">
                            <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" /> Datos del Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 text-xs space-y-2.5">
                            <div>
                                <span className="text-[11px] text-muted-foreground uppercase font-medium">Razón Social / Nombre</span>
                                <p className="text-sm font-bold text-foreground mt-0.5">{quotation.customer_name_snapshot}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Documento</span>
                                    <p className="font-mono font-semibold text-foreground mt-0.5">{quotation.customer_document_snapshot || 'Sin RUC / DNI'}</p>
                                </div>
                                <div>
                                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Teléfono / Celular</span>
                                    <p className="font-medium text-foreground mt-0.5">{quotation.customer_phone_snapshot || '-'}</p>
                                </div>
                            </div>
                            {quotation.customer_email_snapshot && (
                                <div>
                                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Correo Electrónico</span>
                                    <p className="text-foreground mt-0.5">{quotation.customer_email_snapshot}</p>
                                </div>
                            )}
                            {quotation.customer_address_snapshot && (
                                <div>
                                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Dirección Fiscal / Entrega</span>
                                    <p className="text-foreground mt-0.5">{quotation.customer_address_snapshot}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Card 2: Condiciones Comerciales */}
                    <Card className="border border-border/60 shadow-xs hover:border-border transition-colors">
                        <CardHeader className="pb-3 border-b border-border/40">
                            <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" /> Condiciones Comerciales
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 text-xs space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Forma de Pago</span>
                                    <p className="font-semibold text-foreground mt-0.5">{quotation.payment_terms || 'Contado'}</p>
                                </div>
                                <div>
                                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Moneda</span>
                                    <p className="font-semibold text-foreground mt-0.5">{isPEN ? 'Soles (PEN S/)' : 'Dólares (USD $)'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Tiempo de Entrega</span>
                                    <p className="font-semibold text-foreground mt-0.5">{quotation.delivery_time || 'Inmediata'}</p>
                                </div>
                                <div>
                                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Régimen IGV</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {quotation.tax_mode === 'INCLUDED' ? 'IGV Incluido (18%)' : (quotation.tax_mode === 'PLUS_TAX' ? '+ 18% IGV' : 'Exonerado')}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-1 border-t border-border/40 flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] text-muted-foreground uppercase font-medium">Fecha de Vencimiento</span>
                                    <p className="font-semibold text-foreground mt-0.5">
                                        {new Date(quotation.valid_until_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-[11px] font-mono">
                                    {quotation.validity_days} días de validez
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Cuentas Bancarias de Abono */}
                    <Card className="border border-border/60 shadow-xs hover:border-border transition-colors">
                        <CardHeader className="pb-3 border-b border-border/40">
                            <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-primary" /> Cuentas para Pago / Transferencia
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 text-xs space-y-2.5">
                            {bank_accounts.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No se registran cuentas bancarias activas para recaudación.</p>
                            ) : (
                                bank_accounts.map((acc) => (
                                    <div key={acc.id} className="p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-foreground text-xs">{acc.bank_name}</span>
                                            <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono">
                                                {acc.currency_code} - {acc.account_type}
                                            </Badge>
                                        </div>
                                        <div className="font-mono text-xs text-foreground flex items-center justify-between">
                                            <span>N° Cta:</span>
                                            <strong className="select-all">{acc.account_number}</strong>
                                        </div>
                                        {acc.cci && (
                                            <div className="font-mono text-[11px] text-muted-foreground flex items-center justify-between">
                                                <span>CCI:</span>
                                                <strong className="select-all text-foreground/80">{acc.cci}</strong>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Tabla de Repuestos Cotizados - UX/UI Refinada */}
                <Card className="border border-border/60 shadow-xs overflow-hidden">
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                Repuestos & Artículos Cotizados
                                <Badge variant="secondary" className="font-mono text-xs ml-1">
                                    {quotation.lines.length} {quotation.lines.length === 1 ? 'ítem' : 'ítems'}
                                </Badge>
                            </CardTitle>
                            <span className="text-xs text-muted-foreground">Moneda: {isPEN ? 'PEN (Soles)' : 'USD (Dólares)'}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="border-b border-border/60">
                                        <TableHead className="w-12 text-center text-xs font-bold uppercase">#</TableHead>
                                        <TableHead className="w-40 text-xs font-bold uppercase">Código / Ref.</TableHead>
                                        <TableHead className="text-xs font-bold uppercase">Descripción de Repuesto</TableHead>
                                        <TableHead className="w-20 text-center text-xs font-bold uppercase">U.M.</TableHead>
                                        <TableHead className="w-24 text-right text-xs font-bold uppercase">Cant.</TableHead>
                                        <TableHead className="w-32 text-right text-xs font-bold uppercase">P. Unitario</TableHead>
                                        <TableHead className="w-28 text-right text-xs font-bold uppercase">Descuento</TableHead>
                                        <TableHead className="w-32 text-right text-xs font-bold uppercase">Importe Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-border/40">
                                    {quotation.lines.map((line, idx) => {
                                        return (
                                            <TableRow 
                                                key={line.id} 
                                                className={`hover:bg-muted/40 transition-colors ${line.is_special_order ? 'bg-amber-500/5 dark:bg-amber-950/10' : ''}`}
                                            >
                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="font-mono font-bold text-xs text-foreground">
                                                    <span className="bg-muted/60 px-2 py-0.5 rounded text-[11px] border border-border/40">
                                                        {line.product_reference_snapshot}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="space-y-1 py-3">
                                                    <div className="font-semibold text-xs text-foreground">
                                                        {line.product_name_snapshot}
                                                    </div>
                                                    {line.is_special_order && (
                                                        <div className="inline-flex items-center gap-1.5 text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                                                            <Clock className="h-3 w-3" />
                                                            Bajo Pedido: {line.delivery_time_line || '3 a 5 días hábiles'}
                                                        </div>
                                                    )}
                                                    {line.notes && (
                                                        <div className="text-[11px] text-muted-foreground italic">
                                                            Nota: {line.notes}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                    {line.unit_code_snapshot}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-semibold text-xs text-foreground">
                                                    {Number(line.quantity).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-foreground">
                                                    {currencySymbol} {Number(line.unit_price).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                    {Number(line.discount_amount) > 0 ? (
                                                        <span className="text-emerald-600 font-medium">
                                                            - {currencySymbol} {Number(line.discount_amount).toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-sm text-foreground">
                                                    {currencySymbol} {Number(line.line_total).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pie de Totales y Notas */}
                        <div className="p-6 border-t border-border/60 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-muted/20">
                            <div className="space-y-3 max-w-xl text-xs text-muted-foreground">
                                {quotation.notes && (
                                    <div className="p-3 rounded-lg bg-card border border-border/50">
                                        <strong className="text-foreground block mb-1">Observaciones Comerciales:</strong>
                                        <p className="whitespace-pre-line">{quotation.notes}</p>
                                    </div>
                                )}
                                <div className="text-[11px] text-muted-foreground/80 space-y-1">
                                    <p>• Los precios consignados tienen carácter referencial y están sujetos a confirmación de stock al momento del cierre de venta.</p>
                                    <p>• Los productos bajo pedido especial iniciarán gestión de compra y despacho tras la recepción del abono correspondiente.</p>
                                </div>
                            </div>

                            {/* Resumen Contable */}
                            <div className="w-full sm:w-80 space-y-2 text-xs border border-border/60 rounded-xl p-4 bg-card shadow-xs">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal Operaciones:</span>
                                    <span className="font-mono font-semibold text-foreground">{currencySymbol} {Number(quotation.subtotal_amount).toFixed(2)}</span>
                                </div>
                                {Number(quotation.discount_amount) > 0 && (
                                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                        <span>Descuento Comercial:</span>
                                        <span className="font-mono font-semibold">- {currencySymbol} {Number(quotation.discount_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-muted-foreground">
                                    <span>I.G.V. (18%):</span>
                                    <span className="font-mono font-semibold text-foreground">{currencySymbol} {Number(quotation.tax_amount).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-border/60 pt-2.5 flex justify-between items-baseline">
                                    <span className="text-sm font-bold text-foreground">TOTAL A PAGAR:</span>
                                    <span className="text-xl font-bold font-mono text-primary">
                                        {currencySymbol} {Number(quotation.total_amount).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Document Preview Modal - Impresión dentro del sistema */}
            <DocumentPreviewModal
                open={previewModalOpen}
                onOpenChange={setPreviewModalOpen}
                url={previewUrl}
                title={previewTitle}
                subtitle={previewSubtitle}
            />

            <ConfirmDialog {...dialogProps} />
        </>
    );
}

QuotationsShow.layout = {
    breadcrumbs: [
        { title: 'Comercial y Ventas', href: '#' },
        { title: 'Cotizaciones', href: '/quotations' },
        { title: 'Detalle de Cotización', href: '#' },
    ],
};
