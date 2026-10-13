import { Head, Link, useForm, router } from '@inertiajs/react';
import { 
    ArrowLeft, 
    Save, 
    Search, 
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Wallet,
    CreditCard,
    ShieldAlert,
    PackageCheck,
    PackageX,
    FileText
} from 'lucide-react';
import React, { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getLocalDateString } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Devoluciones', href: '/customer-returns' },
    { title: 'Nueva Devolución', href: '#' },
];

type DeadlineInfo = {
    max_days: number;
    days_elapsed: number;
    is_expired: boolean;
    can_override: boolean;
};

type FinancialInfo = {
    payment_type: string;
    payment_status: string;
    pending_debt_balance: number;
    paid_amount: number;
    default_payment_method_id: number | null;
};

type PaymentMethodItem = {
    id: number;
    name: string;
    code: string;
    is_cash: boolean;
};

export default function CustomerReturnCreate({ 
    sale, 
    recentSales = [], 
    search = '',
    deadlineInfo,
    financialInfo,
    paymentMethods = [],
}: { 
    sale?: any; 
    recentSales?: any[]; 
    search?: string;
    deadlineInfo?: DeadlineInfo | null;
    financialInfo?: FinancialInfo | null;
    paymentMethods?: PaymentMethodItem[];
}) {
    const [searchTerm, setSearchTerm] = useState(search);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/customer-returns/create', { search: searchTerm }, { preserveState: true });
    };

    // Si no hay venta seleccionada, mostramos el buscador/selector de ventas
    if (!sale) {
        return (
            <>
                <Head title="Nueva Devolución - Seleccionar Venta" />

                <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-5xl mx-auto w-full">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Link href="/customer-returns">
                            <Button variant="outline" size="icon" className="h-9 w-9">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <RotateCcw className="h-6 w-6 text-primary" />
                                Seleccionar Venta para Devolución
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Toda devolución o nota de crédito debe estar vinculada a una venta confirmada
                            </p>
                        </div>
                    </div>

                    {/* Buscador de Ventas */}
                    <Card className="border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Buscar Venta Confirmada</CardTitle>
                            <CardDescription className="text-xs">
                                Ingresa el número de comprobante, serie, nombre del cliente o DNI/RUC
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Ej: B001-000001, Juan Pérez, 20601234567..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 h-9 text-xs"
                                    />
                                </div>
                                <Button type="submit" size="sm" className="h-9 text-xs font-medium">
                                    Buscar
                                </Button>
                                {searchTerm && (
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-9 text-xs"
                                        onClick={() => {
                                            setSearchTerm('');
                                            router.get('/customer-returns/create');
                                        }}
                                    >
                                        Limpiar
                                    </Button>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    {/* Tabla de Ventas Recientes / Encontradas */}
                    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Ventas Confirmadas Disponibles ({recentSales.length})
                            </h2>
                            <span className="text-[11px] text-muted-foreground">
                                Mostrando las ventas más recientes de tu sucursal
                            </span>
                        </div>

                        {recentSales.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="text-xs font-bold uppercase py-2.5">Comprobante / Venta</TableHead>
                                            <TableHead className="text-xs font-bold uppercase py-2.5">Fecha</TableHead>
                                            <TableHead className="text-xs font-bold uppercase py-2.5">Cliente</TableHead>
                                            <TableHead className="text-xs font-bold uppercase py-2.5 text-right">Total</TableHead>
                                            <TableHead className="text-xs font-bold uppercase py-2.5 text-center">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentSales.map((s: any) => (
                                            <TableRow key={s.id} className="hover:bg-muted/30">
                                                <TableCell className="font-mono text-xs font-semibold">
                                                    <div>
                                                        {s.external_document_series 
                                                            ? `${s.external_document_series}-${s.external_document_number || ''}` 
                                                            : s.sale_number}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-sans">
                                                        {s.external_document_type || s.sale_type || 'Venta'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {new Date(s.operation_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="font-medium text-foreground">
                                                        {s.customer_name_snapshot || s.customer?.legal_name || 'Público General'}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {s.customer_document_snapshot || s.customer?.document_number || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-right font-bold font-mono">
                                                    {s.currency_code === 'USD' ? '$' : 'S/'} {Number(s.total_amount).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Link href={`/customer-returns/create?sale_id=${s.id}`}>
                                                        <Button size="sm" variant="default" className="h-8 gap-1.5 text-xs font-medium">
                                                            <span>Seleccionar</span>
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                No se encontraron ventas confirmadas con los filtros ingresados.
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }

    const defaultPaymentMethod = financialInfo?.default_payment_method_id 
        || paymentMethods.find(m => m.is_cash)?.id 
        || paymentMethods[0]?.id 
        || '';

    const { data, setData, processing, errors } = useForm({
        sale_id: sale.id,
        operation_date: getLocalDateString(),
        notes: '',
        settlement_type: (financialInfo && financialInfo.pending_debt_balance > 0) ? 'RECEIVABLE_OFFSET' : 'CASH_REFUND',
        refund_payment_method_id: defaultPaymentMethod ? String(defaultPaymentMethod) : '',
        sunat_credit_note_type: '06',
        override_deadline: false,
        override_deadline_reason: '',
        lines: sale.lines.map((line: any) => {
            const originalQty = parseFloat(line.quantity);
            const alreadyReturned = parseFloat(line.already_returned_quantity || 0);
            const available = parseFloat(line.available_return_quantity ?? (originalQty - alreadyReturned));

            return {
                sale_line_id: line.id,
                product_id: line.product_id,
                product_name: line.product_name_snapshot || (line.product ? line.product.name : ''),
                product_reference: line.product_reference_snapshot || (line.product ? line.product.primary_reference : ''),
                unit_price: parseFloat(line.unit_price),
                original_quantity: originalQty,
                already_returned_quantity: alreadyReturned,
                max_quantity: Math.max(0, available),
                quantity: 0,
                condition: 'GOOD' as 'GOOD' | 'DAMAGED',
            };
        }),
    });

    const handleQuantityChange = (index: number, val: string) => {
        let parsed = parseFloat(val);
        if (isNaN(parsed)) parsed = 0;
        
        const max = data.lines[index].max_quantity;
        if (parsed > max) parsed = max;
        if (parsed < 0) parsed = 0;

        const newLines = [...data.lines];
        newLines[index].quantity = parsed;
        setData('lines', newLines);
    };

    const handleConditionChange = (index: number, condition: 'GOOD' | 'DAMAGED') => {
        const newLines = [...data.lines];
        newLines[index].condition = condition;
        setData('lines', newLines);
    };

    const totalReturnAmount = data.lines.reduce((sum: number, line: any) => sum + (line.quantity * line.unit_price), 0);
    const hasTax = Number(sale.tax_amount || 0) > 0;
    const subtotalPreview = hasTax ? totalReturnAmount / 1.18 : totalReturnAmount;
    const taxPreview = hasTax ? totalReturnAmount - subtotalPreview : 0;

    const isFiscalSale = sale.sale_type === 'FACTURA' || sale.sale_type === 'BOLETA';
    const isFullSaleReturn = data.lines.length > 0 && data.lines.every(
        (l: any) => l.already_returned_quantity === 0 && Math.abs(l.quantity - l.original_quantity) < 0.0001
    );
    const effectiveCatalog09Type = isFullSaleReturn
        ? (data.sunat_credit_note_type === '01' ? '01' : '06')
        : '07';

    const pendingDebt = financialInfo?.pending_debt_balance || 0;
    const debtOffsetPreview = Math.min(pendingDebt, totalReturnAmount);
    const excessToRefundPreview = Math.max(0, totalReturnAmount - debtOffsetPreview);
    const requiresCashOrCreditChoice = excessToRefundPreview >= 0.01;
    const isBlockedByDeadline = deadlineInfo?.is_expired && (!data.override_deadline || !data.override_deadline_reason.trim());

    const handleSubmit = (confirmNow: boolean = false) => {
        const filteredLines = data.lines.filter((l: any) => l.quantity > 0);
        
        if (filteredLines.length === 0) {
            alert('Debes ingresar una cantidad mayor a 0 en al menos un producto para registrar la devolución.');
            return;
        }

        if (isBlockedByDeadline) {
            alert('Esta venta supera el plazo máximo de devolución permitido. Debes activar la autorización de excepción e indicar el motivo justificado.');
            return;
        }

        const effectiveSettlement = requiresCashOrCreditChoice 
            ? (data.settlement_type === 'RECEIVABLE_OFFSET' ? 'CASH_REFUND' : data.settlement_type)
            : 'RECEIVABLE_OFFSET';

        router.post('/customer-returns', {
            sale_id: data.sale_id,
            operation_date: data.operation_date,
            notes: data.notes,
            confirm_now: confirmNow,
            settlement_type: effectiveSettlement,
            refund_payment_method_id: data.refund_payment_method_id ? Number(data.refund_payment_method_id) : null,
            sunat_credit_note_type: isFiscalSale ? effectiveCatalog09Type : null,
            override_deadline: data.override_deadline,
            override_deadline_reason: data.override_deadline_reason,
            lines: filteredLines,
        });
    };

    const currencySymbol = sale.currency_code === 'USD' ? '$' : 'S/';

    return (
        <>
            <Head title={`Nueva Devolución - Venta ${sale.sale_number}`} />
            
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} className="flex h-full flex-1 flex-col gap-5 rounded-xl p-4 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/sales/${sale.id}`}>
                            <Button type="button" variant="outline" size="icon" className="h-9 w-9">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <RotateCcw className="h-6 w-6 text-primary" />
                                Registrar Devolución (Nota de Crédito)
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Venta origen: <span className="font-mono font-semibold text-foreground">{sale.sale_number}</span> | Cliente: <span className="font-semibold text-foreground">{sale.customer_name_snapshot || sale.customer?.legal_name || 'Público General'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/customer-returns/create">
                            <Button type="button" variant="outline" size="sm" className="h-9 text-xs">
                                Cambiar Venta
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Fase 4: Alerta de Plazo Comercial Vencido */}
                {deadlineInfo?.is_expired && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs space-y-3">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-1 flex-1">
                                <div className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                                    Plazo Comercial de Devolución Excedido ({deadlineInfo.days_elapsed} días transcurridos)
                                </div>
                                <p className="text-amber-800/90 dark:text-amber-200/80">
                                    La política comercial permite devoluciones hasta <strong>{deadlineInfo.max_days} días</strong> después de la emisión de la venta. Para procesar esta operación fuera de plazo se requiere autorización expresa y justificación auditable.
                                </p>
                            </div>
                        </div>

                        <div className="pl-8 space-y-2.5 pt-1 border-t border-amber-500/20">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="override_deadline" 
                                    checked={data.override_deadline}
                                    onCheckedChange={(checked) => setData('override_deadline', Boolean(checked))}
                                />
                                <Label htmlFor="override_deadline" className="text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                                    Autorizar excepcionalmente esta devolución fuera de plazo
                                </Label>
                            </div>

                            {data.override_deadline && (
                                <div className="max-w-xl">
                                    <Input
                                        placeholder="Motivo obligatorio de autorización (Ej: Garantía extendida autorizada por gerencia)..."
                                        value={data.override_deadline_reason}
                                        onChange={(e) => setData('override_deadline_reason', e.target.value)}
                                        className="h-8 text-xs bg-white dark:bg-background"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Tabla de Productos a Devolver con Triaje de Calidad (Fase 3) */}
                    <Card className="lg:col-span-2 border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                                Productos de la Venta y Triaje de Calidad
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Indica la cantidad a devolver y el estado físico de cada artículo. Los ítems marcados como <strong>Dañado / Merma</strong> entrarán a cuarentena y no volverán a ponerse a la venta.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-4">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="text-xs font-bold uppercase py-2.5">Producto</TableHead>
                                            <TableHead className="text-right text-xs font-bold uppercase py-2.5">Precio</TableHead>
                                            <TableHead className="text-center text-xs font-bold uppercase py-2.5">Disp.</TableHead>
                                            <TableHead className="text-center text-xs font-bold uppercase py-2.5 w-24">A Devolver</TableHead>
                                            <TableHead className="text-center text-xs font-bold uppercase py-2.5 w-44">Estado / Triaje</TableHead>
                                            <TableHead className="text-right text-xs font-bold uppercase py-2.5">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.lines.map((line: any, index: number) => {
                                            const isFullyReturned = line.max_quantity <= 0;
                                            return (
                                                <TableRow key={index} className={`hover:bg-muted/20 ${isFullyReturned ? 'opacity-50' : ''}`}>
                                                    <TableCell className="text-xs font-medium max-w-[190px]">
                                                        <div className="font-bold text-foreground truncate">{line.product_name}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {line.product_reference && (
                                                                <span className="text-[10px] text-muted-foreground font-mono">{line.product_reference}</span>
                                                            )}
                                                            {line.already_returned_quantity > 0 && (
                                                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-500/30 text-amber-600">
                                                                    Dev: {line.already_returned_quantity}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-mono">
                                                        {currencySymbol} {line.unit_price.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs font-bold font-mono">
                                                        {line.max_quantity} <span className="text-[10px] font-normal text-muted-foreground">/ {line.original_quantity}</span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {isFullyReturned ? (
                                                            <span className="text-[11px] text-muted-foreground italic">Completado</span>
                                                        ) : (
                                                            <Input 
                                                                type="number" 
                                                                step="1"
                                                                min="0"
                                                                max={line.max_quantity}
                                                                value={line.quantity === 0 ? '' : line.quantity}
                                                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                                placeholder="0"
                                                                className="h-8 text-center text-xs font-bold bg-background border-input"
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {!isFullyReturned && (
                                                            <Select
                                                                value={line.condition}
                                                                onValueChange={(v) => handleConditionChange(index, v as 'GOOD' | 'DAMAGED')}
                                                            >
                                                                <SelectTrigger className={`h-8 text-xs ${
                                                                    line.condition === 'DAMAGED' 
                                                                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium' 
                                                                        : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                                                                }`}>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="GOOD" className="text-xs">
                                                                        <span className="flex items-center gap-1.5">
                                                                            <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                                                                            Buen estado (Vendible)
                                                                        </span>
                                                                    </SelectItem>
                                                                    <SelectItem value="DAMAGED" className="text-xs">
                                                                        <span className="flex items-center gap-1.5">
                                                                            <PackageX className="h-3.5 w-3.5 text-rose-600" />
                                                                            Dañado / Defectuoso
                                                                        </span>
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                                                        {line.quantity > 0 
                                                            ? `- ${currencySymbol} ${(line.quantity * line.unit_price).toFixed(2)}` 
                                                            : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            {errors.lines && <InputError message={errors.lines} className="mt-2" />}
                        </CardContent>
                    </Card>

                    {/* Columna Derecha: Comprobante Tributario (Fase 5), Cuadre Financiero (Fase 2) y Resumen */}
                    <div className="space-y-4">
                        {/* Fase 5: Distinción Comprobante Fiscal SUNAT vs Vale Interno */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    {isFiscalSale ? 'Nota de Crédito Electrónica (SUNAT)' : 'Documento de Devolución Interno'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                {isFiscalSale ? (
                                    <>
                                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Comprobante Afectado:</span>
                                                <span className="font-mono font-bold text-foreground">
                                                    {sale.sale_type === 'FACTURA' ? 'FACTURA (01)' : 'BOLETA (03)'} —{' '}
                                                    {sale.external_document_series
                                                        ? `${sale.external_document_series}-${sale.external_document_number || ''}`
                                                        : sale.sale_number}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Serie Fiscal a Emitir:</span>
                                                <Badge variant="outline" className="font-mono text-[10px] border-primary/40 text-primary">
                                                    {sale.sale_type === 'FACTURA' ? 'FC01-XXXXXXXX' : 'BC01-XXXXXXXX'}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">
                                                Tipo de Nota de Crédito (Catálogo 09 SUNAT)
                                            </Label>
                                            {isFullSaleReturn ? (
                                                <Select
                                                    value={effectiveCatalog09Type}
                                                    onValueChange={(v) => setData('sunat_credit_note_type', v)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="06" className="text-xs">
                                                            06 - Devolución total
                                                        </SelectItem>
                                                        <SelectItem value="01" className="text-xs">
                                                            01 - Anulación de la operación
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="p-2.5 rounded-lg bg-muted/50 border border-border font-medium text-foreground flex items-center justify-between">
                                                    <span>07 - Devolución por ítem (Parcial)</span>
                                                    <Badge variant="secondary" className="text-[10px]">Auto Cat. 09</Badge>
                                                </div>
                                            )}
                                            <p className="text-[10px] text-muted-foreground">
                                                {isFullSaleReturn
                                                    ? 'Estás devolviendo el 100% de la venta: puedes elegir Código 06 (Devolución total) o Código 01 (Anulación).'
                                                    : 'Para devoluciones parciales SUNAT asigna obligatoriamente el Código 07 (Devolución por ítem).'}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1">
                                        <div className="font-semibold text-foreground flex items-center justify-between">
                                            <span>Vale de Devolución / Ingreso a Almacén</span>
                                            <Badge variant="outline" className="text-[10px]">No Tributario</Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            La venta origen fue emitida como Ticket / Nota de Venta interna ({sale.sale_number}). Se generará un vale interno sin envío a SUNAT.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Fase 2: Modalidad de Liquidación Financiera */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-primary" />
                                    Cuadre Financiero y Liquidación
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3.5 text-xs">
                                {pendingDebt > 0 && (
                                    <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 space-y-1">
                                        <div className="flex justify-between font-medium text-blue-700 dark:text-blue-300">
                                            <span>Deuda Pendiente de la Venta:</span>
                                            <span className="font-mono font-bold">{currencySymbol} {pendingDebt.toFixed(2)}</span>
                                        </div>
                                        {debtOffsetPreview > 0 && (
                                            <div className="flex justify-between text-[11px] text-blue-600/90 dark:text-blue-400">
                                                <span>Se amortizará de la cuenta por cobrar:</span>
                                                <span className="font-mono font-semibold">- {currencySymbol} {debtOffsetPreview.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {requiresCashOrCreditChoice ? (
                                    <div className="space-y-3">
                                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
                                            Monto cobrado a reembolsar al cliente: <strong className="font-mono">{currencySymbol} {excessToRefundPreview.toFixed(2)}</strong>. Selecciona cómo se liquidará:
                                        </div>

                                        <div className="grid grid-cols-1 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setData('settlement_type', 'CASH_REFUND')}
                                                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                                                    data.settlement_type !== 'STORE_CREDIT'
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                                        : 'border-border hover:bg-muted/40'
                                                }`}
                                            >
                                                <Wallet className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                <div>
                                                    <div className="font-semibold text-foreground">Egreso Directo de Caja</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        Genera una salida de dinero en caja para cuadrar el arqueo físico del día.
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setData('settlement_type', 'STORE_CREDIT')}
                                                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                                                    data.settlement_type === 'STORE_CREDIT'
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                                        : 'border-border hover:bg-muted/40'
                                                }`}
                                            >
                                                <CreditCard className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                <div>
                                                    <div className="font-semibold text-foreground">Saldo a Favor (Crédito en Tienda)</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        Acredita el monto en la cuenta del cliente para futuras compras sin tocar efectivo.
                                                    </div>
                                                </div>
                                            </button>
                                        </div>

                                        {data.settlement_type !== 'STORE_CREDIT' && paymentMethods.length > 0 && (
                                            <div className="space-y-1.5 pt-1">
                                                <Label className="text-xs font-medium">Medio de Pago de Salida (Egreso)</Label>
                                                <Select
                                                    value={String(data.refund_payment_method_id)}
                                                    onValueChange={(v) => setData('refund_payment_method_id', v)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Seleccionar medio de salida" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {paymentMethods.map((pm) => (
                                                            <SelectItem key={pm.id} value={String(pm.id)} className="text-xs">
                                                                {pm.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-[11px]">
                                        {totalReturnAmount <= 0 
                                            ? 'Ingresa las cantidades a devolver para calcular la liquidación financiera.'
                                            : 'El monto devuelto se descontará íntegramente del saldo pendiente de la deuda del cliente.'}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Detalles y Confirmación */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                                    Detalles de Devolución
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xs">
                                <div className="space-y-1.5">
                                    <Label htmlFor="operation_date" className="text-xs font-medium">Fecha de Emisión</Label>
                                    <Input 
                                        id="operation_date" 
                                        type="date" 
                                        value={data.operation_date} 
                                        onChange={e => setData('operation_date', e.target.value)} 
                                        className="h-9 text-xs"
                                    />
                                    <InputError message={errors.operation_date} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="notes" className="text-xs font-medium">Motivo / Sustento Tributario</Label>
                                    <Input 
                                        id="notes" 
                                        value={data.notes} 
                                        onChange={e => setData('notes', e.target.value)} 
                                        placeholder="Ej: Producto dañado de fábrica, cambio de modelo..."
                                        className="h-9 text-xs"
                                    />
                                    <InputError message={errors.notes} />
                                </div>

                                <div className="pt-4 border-t border-border mt-4 flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                                        <span>Total Original Venta:</span>
                                        <span className="font-mono">{currencySymbol} {Number(sale.total_amount).toFixed(2)}</span>
                                    </div>
                                    {hasTax && totalReturnAmount > 0 && (
                                        <>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>Base Imponible (Op. Gravada):</span>
                                                <span className="font-mono">{currencySymbol} {subtotalPreview.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>I.G.V. (18%):</span>
                                                <span className="font-mono">{currencySymbol} {taxPreview.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between items-center text-base pt-2">
                                        <span className="font-bold text-foreground">Total Devolución:</span>
                                        <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                                            - {currencySymbol} {totalReturnAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 mt-3">
                                    <Button 
                                        type="button" 
                                        onClick={() => handleSubmit(true)}
                                        disabled={processing || totalReturnAmount <= 0 || Boolean(isBlockedByDeadline)} 
                                        className="w-full h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                    >
                                        <CheckCircle2 className="h-4 w-4" /> Guardar y Confirmar
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        onClick={() => handleSubmit(false)}
                                        disabled={processing || totalReturnAmount <= 0 || Boolean(isBlockedByDeadline)} 
                                        className="w-full h-9 gap-1.5 text-xs font-semibold"
                                    >
                                        <Save className="h-4 w-4" /> Guardar como Borrador
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </>
    );
}

CustomerReturnCreate.layout = {
    breadcrumbs,
};
