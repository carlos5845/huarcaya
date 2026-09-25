import { Head, Link, router } from '@inertiajs/react';
import { 
    ArrowLeft, 
    CheckCircle, 
    Pencil, 
    Printer, 
    User, 
    FileText, 
    Phone, 
    MapPin, 
    CreditCard, 
    Package, 
    Clock,
    RotateCcw
} from 'lucide-react';
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

    const currencySymbol = sale.currency_code === 'USD' ? '$' : 'S/';
    const total = Number(sale.total_amount || 0);
    const subtotal = Number(sale.subtotal_amount) > 0 
        ? Number(sale.subtotal_amount) 
        : (total > 0 ? total / 1.18 : 0);
    const tax = Number(sale.tax_amount) > 0 
        ? Number(sale.tax_amount) 
        : (total > 0 ? total - subtotal : 0);

    const paidAmount = sale.receivable 
        ? (Number(sale.receivable.original_amount) - Number(sale.receivable.balance_amount)).toFixed(2)
        : Number(sale.initial_payment_amount || 0).toFixed(2);

    const pendingAmount = sale.receivable 
        ? Number(sale.receivable.balance_amount).toFixed(2)
        : Math.max(0, total - Number(sale.initial_payment_amount || 0)).toFixed(2);

    const rawDueDate = sale.receivable?.due_date || sale.due_date;
    const dueDateFormatted = rawDueDate 
        ? new Date(rawDueDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
        : 'N/A';

    const isFullyPaid = sale.payment_type === 'CASH' || (sale.receivable && Number(sale.receivable.balance_amount) <= 0);

    return (
        <>
            <Head title={`Venta ${sale.sale_number}`} />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-4">
                            <Link href="/sales">
                                <Button variant="outline" size="icon" className="h-9 w-9">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                    Detalle de Venta
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Status indicator */}
                            <div className="flex items-center">
                                {sale.status === 'DRAFT' ? (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                        Estado: Borrador
                                    </div>
                                ) : sale.status === 'CONFIRMED' ? (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        Estado: Confirmado
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                                        Estado: Anulado
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {sale.status === 'DRAFT' && (
                                <div className="flex items-center gap-2">
                                    <Link href={`/sales/${sale.id}/edit`}>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <Pencil className="h-3.5 w-3.5" /> Editar
                                        </Button>
                                    </Link>
                                    <Button onClick={confirmSale} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                                        <CheckCircle className="h-3.5 w-3.5" /> Confirmar e Ingresar a Kardex
                                    </Button>
                                </div>
                            )}

                            {sale.status === 'CONFIRMED' && (
                                <div className="flex items-center gap-2">
                                    {sale.can_be_returned !== false ? (
                                        <Link href={`/customer-returns/create?sale_id=${sale.id}`}>
                                            <Button variant="outline" size="sm" className="gap-2 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-medium">
                                                <RotateCcw className="h-3.5 w-3.5" /> Nueva Devolución
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-1 gap-1 font-medium">
                                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Devolución Total Registrada
                                        </Badge>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
                                        <Printer className="h-3.5 w-3.5" /> Imprimir Comprobante
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Linked Customer Returns Alert */}
                {sale.customer_returns && sale.customer_returns.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 p-4 rounded-xl flex flex-col gap-2 text-xs shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold flex items-center gap-1.5">
                                <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                Esta venta cuenta con {sale.customer_returns.length} nota(s) de devolución registrada(s):
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {sale.customer_returns.map((ret: any) => (
                                <Link key={ret.id} href={`/customer-returns/${ret.id}`}>
                                    <Badge variant="outline" className="border-amber-500/40 bg-card text-foreground hover:bg-muted text-xs py-1 px-2.5 gap-1.5 cursor-pointer font-medium">
                                        <span className="font-mono">{ret.return_number}</span>
                                        <span className="text-muted-foreground">({currencySymbol} {Number(ret.total_amount).toFixed(2)})</span>
                                        <span className={`text-[10px] font-bold uppercase ${ret.status === 'CONFIRMED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                            • {ret.status === 'CONFIRMED' ? 'Confirmado' : 'Borrador'}
                                        </span>
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Card: Basic Details */}
                <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                        Detalles Principales
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 text-sm">
                        <div>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                                N° Comprobante / Venta
                            </span>
                            <span className="font-bold text-base text-foreground block">
                                {sale.external_document_series 
                                    ? `${sale.external_document_series}-${sale.external_document_number || 'S/D'}` 
                                    : sale.sale_number}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {sale.external_document_type || sale.sale_type || 'Comprobante'}
                            </span>
                        </div>

                        <div>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                                Fecha de Emisión
                            </span>
                            <span className="font-semibold text-base text-foreground block">
                                {new Date(sale.operation_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Fecha comercial
                            </span>
                        </div>

                        <div>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                                Condición de Pago
                            </span>
                            <span className="font-semibold text-base text-foreground block">
                                {sale.payment_type === 'CASH' ? 'Al Contado' : 'Al Crédito'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {sale.paymentMethod?.name || (sale.payment_type === 'CASH' ? 'Pago Inmediato' : 'Genera Cuenta x Cobrar')}
                            </span>
                        </div>

                        <div>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                                Sucursal de Emisión
                            </span>
                            <span className="font-semibold text-base text-foreground block">
                                {sale.branch?.name || 'Central'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Almacén emisor
                            </span>
                        </div>

                        <div>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                                Moneda
                            </span>
                            <span className="font-semibold text-base text-foreground block">
                                {sale.currency_code === 'USD' ? 'Dólares ($ USD)' : 'Soles (S/ PEN)'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {sale.currency_code === 'USD' ? `T.C: ${Number(sale.exchange_rate).toFixed(3)}` : 'Moneda nacional'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2-Column Main Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* LEFT COLUMN: Products + Payment Status (2 Cols) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Product Information Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                                <h3 className="font-semibold text-base text-foreground">
                                    Información de Productos
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {sale.lines?.length || 0} {sale.lines?.length === 1 ? 'producto' : 'productos'}
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b">
                                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Código / Ref</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</TableHead>
                                            <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cantidad</TableHead>
                                            {sale.status === 'DRAFT' && (
                                                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Stock Disp.</TableHead>
                                            )}
                                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Precio Unit.</TableHead>
                                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sale.lines && sale.lines.length > 0 ? (
                                            sale.lines.map((line: any) => {
                                                const currentStock = line.product?.inventories?.reduce((acc: number, inv: any) => acc + Number(inv.quantity), 0) || 0;
                                                const isLowStock = sale.status === 'DRAFT' && currentStock < Number(line.quantity);

                                                return (
                                                    <TableRow key={line.id} className="hover:bg-muted/40 transition-colors">
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            {line.product?.primary_reference || line.product_reference_snapshot || 'S/C'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                                                    <Package className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-sm text-foreground">
                                                                        {line.product?.name || line.product_name_snapshot}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                                                                        {line.product?.brand && <span>Marca: {line.product.brand.name}</span>}
                                                                        {line.product?.category && <span>| Línea: {line.product.category.name}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-medium">
                                                            <div>x{Number(line.quantity)} {line.product?.unit?.abbreviation || ''}</div>
                                                            {Number(line.already_returned_quantity) > 0 && (
                                                                <span className="inline-block mt-0.5 text-[10px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 px-1.5 py-0.5 rounded">
                                                                    Devuelto: {Number(line.already_returned_quantity)}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        {sale.status === 'DRAFT' && (
                                                            <TableCell className="text-center">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                                                    isLowStock 
                                                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' 
                                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                                                }`}>
                                                                    {currentStock}
                                                                </span>
                                                            </TableCell>
                                                        )}
                                                        <TableCell className="text-right text-sm">
                                                            {currencySymbol} {Number(line.unit_price).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-sm">
                                                            {currencySymbol} {Number(line.line_total || line.line_subtotal).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={sale.status === 'DRAFT' ? 6 : 5} className="text-center py-6 text-muted-foreground">
                                                    Sin productos en esta venta.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Payment Status Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                                <h3 className="font-semibold text-base text-foreground">
                                    Estado de Liquidación
                                </h3>
                                <div>
                                    {isFullyPaid ? (
                                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                            Pagado Total
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                            Pendiente de Pago
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Subtotal ({sale.lines?.length || 0} items):</span>
                                    <span className="font-medium text-foreground">{currencySymbol} {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>IGV (18%):</span>
                                    <span className="font-medium text-foreground">{currencySymbol} {tax.toFixed(2)}</span>
                                </div>
                                <div className="pt-2 border-t flex justify-between items-center text-base">
                                    <span className="font-bold text-foreground">Total de Venta:</span>
                                    <span className="font-extrabold text-xl text-foreground">{currencySymbol} {total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Credit / Cash details container */}
                            {sale.payment_type === 'CREDIT' ? (
                                <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border space-y-2.5 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Adelanto inicial pagado:</span>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{currencySymbol} {paidAmount}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Saldo Pendiente / Deuda:</span>
                                        <span className="font-bold text-rose-600 dark:text-rose-400 text-base">{currencySymbol} {pendingAmount}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                                        <span>Fecha Límite de Vencimiento:</span>
                                        <span className="font-semibold text-foreground">{dueDateFormatted}</span>
                                    </div>
                                    {sale.receivable && (
                                        <div className="pt-3 border-t flex justify-end">
                                            <Link href={`/receivables/${sale.receivable.id}`}>
                                                <Button variant="outline" size="sm" className="gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">
                                                    Ver en Cuentas por Cobrar &rarr;
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-4 p-3.5 rounded-xl bg-muted/50 border border-border flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Método de Cobro:</span>
                                    <span className="font-semibold text-foreground">
                                        {sale.paymentMethod?.name || 'Efectivo'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Customer Info + Notes + Traceability (1 Col) */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Customer Information Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                            <h3 className="font-semibold text-base text-foreground border-b pb-3">
                                Información del Cliente
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs text-muted-foreground font-medium">Nombre o Razón Social</div>
                                        <div className="font-semibold text-sm text-foreground truncate">
                                            {sale.customer_name_snapshot || sale.customer?.legal_name}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs text-muted-foreground font-medium">Documento de Identidad</div>
                                        <div className="font-semibold text-sm text-foreground">
                                            {sale.customer?.document_type || 'DOC'}: {sale.customer_document_snapshot || sale.customer?.document_number || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                                        <Phone className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs text-muted-foreground font-medium">Teléfono de Contacto</div>
                                        <div className="font-semibold text-sm text-foreground">
                                            {sale.customer?.phone || 'No registrado'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs text-muted-foreground font-medium">Dirección Fiscal / Despacho</div>
                                        <div className="font-semibold text-sm text-foreground break-words">
                                            {sale.customer?.address || 'Sin dirección registrada'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                                        <CreditCard className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs text-muted-foreground font-medium">Condición Comercial</div>
                                        <div className="font-semibold text-sm text-foreground">
                                            {sale.payment_type === 'CASH' ? 'Al Contado' : 'Línea de Crédito'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-3">
                            <h3 className="font-semibold text-base text-foreground border-b pb-3">
                                Notas
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                                {sale.notes || 'Sin notas u observaciones registradas para esta venta.'}
                            </p>
                            <div className="mt-4 pt-3 border-t text-xs text-muted-foreground/80 leading-normal">
                                Este comprobante respalda la operación comercial y salida de almacén según las condiciones acordadas.
                            </div>
                        </div>

                        {/* Traceability Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-3">
                            <h3 className="font-semibold text-base text-foreground border-b pb-3">
                                Trazabilidad
                            </h3>
                            <div className="space-y-3 text-xs">
                                <div className="flex items-start gap-2.5">
                                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-medium text-foreground block">Registrado por:</span>
                                        <span className="text-muted-foreground">{sale.creator?.name || 'Sistema'}</span>
                                        <span className="text-muted-foreground block">
                                            {new Date(sale.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </span>
                                    </div>
                                </div>

                                {sale.confirmed_at && (
                                    <div className="flex items-start gap-2.5 pt-2 border-t">
                                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-medium text-foreground block">Confirmado en Kardex por:</span>
                                            <span className="text-muted-foreground">{sale.confirmed_by?.name || sale.creator?.name || 'Usuario'}</span>
                                            <span className="text-muted-foreground block">
                                                {new Date(sale.confirmed_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                    </div>
                                )}
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
