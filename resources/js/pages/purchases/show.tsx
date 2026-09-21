import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { 
    ArrowLeft, 
    CheckCircle2, 
    Pencil, 
    Printer, 
    Building2, 
    FileText, 
    Phone, 
    MapPin, 
    Mail, 
    Package, 
    Layers, 
    DollarSign, 
    Calendar, 
    Warehouse, 
    User, 
    ExternalLink, 
    File, 
    Clock, 
    ShieldCheck, 
    AlertCircle 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compras', href: '/purchases' },
    { title: 'Detalle de Compra', href: '#' },
];

export default function PurchaseShow({ purchase }: { purchase: any }) {
    const confirmPurchase = () => {
        if (confirm('¿Estás seguro de confirmar esta compra? Esto ingresará los productos al inventario (Kardex) y creará los lotes correspondientes.')) {
            router.post(`/purchases/${purchase.id}/confirm`);
        }
    };

    const currencySymbol = purchase.currency_code === 'USD' ? '$' : 'S/';
    const lines = purchase.lines || [];
    const totalLinesCount = lines.length;
    const totalOrderedUnits = lines.reduce((acc: number, l: any) => acc + Number(l.ordered_quantity || 0), 0);
    const totalReceivedUnits = lines.reduce((acc: number, l: any) => acc + Number(l.received_quantity || 0), 0);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC'
        });
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderStatusBadge = () => {
        switch (purchase.status) {
            case 'DRAFT':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Borrador (Pendiente de Ingreso)
                    </div>
                );
            case 'CONFIRMED':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Confirmado / Ingresado a Kardex
                    </div>
                );
            default:
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Anulado
                    </div>
                );
        }
    };

    return (
        <>
            <Head title={`Compra ${purchase.purchase_number}`} />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-7xl mx-auto w-full">
                {/* Header & Breadcrumbs */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link href="/purchases" className="hover:text-foreground transition-colors">Compras</Link>
                        <span>&rsaquo;</span>
                        <span className="bg-muted px-2.5 py-0.5 rounded-full font-medium text-foreground text-xs">
                            Compra #{purchase.purchase_number}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-4">
                            <Link href="/purchases">
                                <Button variant="outline" size="icon" className="h-9 w-9">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                        Compra #{purchase.purchase_number}
                                    </h1>
                                    {renderStatusBadge()}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Registrado el {formatDateTime(purchase.created_at)}
                                </p>
                            </div>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {purchase.status === 'DRAFT' && (
                                <>
                                    <Link href={`/purchases/${purchase.id}/edit`}>
                                        <Button variant="outline" size="sm" className="gap-1.5">
                                            <Pencil className="h-3.5 w-3.5" /> Editar
                                        </Button>
                                    </Link>
                                    <Button 
                                        onClick={confirmPurchase} 
                                        size="sm" 
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                    >
                                        <CheckCircle2 className="h-4 w-4" /> Confirmar e Ingresar a Kardex
                                    </Button>
                                </>
                            )}

                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.print()} 
                                className="gap-1.5"
                            >
                                <Printer className="h-3.5 w-3.5" /> Imprimir
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 4 KPI Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Variedad Ítems
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Package className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">
                                {totalLinesCount}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {totalLinesCount === 1 ? 'producto' : 'productos'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Unidades Totales
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Layers className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">
                                {purchase.status === 'CONFIRMED' ? totalReceivedUnits : totalOrderedUnits}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {purchase.status === 'CONFIRMED' ? 'ingresadas' : 'pedidas'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Op. Gravada / Subtotal
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                <FileText className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-foreground">
                                {currencySymbol} {Number(purchase.subtotal_amount || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Compra
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold text-primary">
                                {currencySymbol} {Number(purchase.total_amount || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2-Column Info Cards: Supplier + Logistics/Fiscal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Supplier Profile Card */}
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary" />
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground">
                                    Datos del Proveedor
                                </h3>
                            </div>
                            {purchase.supplier?.document_number && (
                                <Badge variant="outline" className="font-mono text-xs bg-muted/40">
                                    {purchase.supplier?.document_type || 'RUC'}: {purchase.supplier.document_number}
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                                    Razón Social
                                </span>
                                <span className="font-bold text-base text-foreground block">
                                    {purchase.supplier?.legal_name || 'Proveedor no especificado'}
                                </span>
                                {purchase.supplier?.trade_name && (
                                    <span className="text-xs text-muted-foreground">
                                        Nombre Comercial: {purchase.supplier.trade_name}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-1">
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                                        Teléfono de Contacto
                                    </span>
                                    <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                        {purchase.supplier?.phone || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                                        Correo Electrónico
                                    </span>
                                    <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5 truncate">
                                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate">{purchase.supplier?.email || '-'}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="pt-1">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                                    Dirección Fiscal
                                </span>
                                <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    {purchase.supplier?.address || 'Sin dirección registrada'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Logistics & Fiscal Card */}
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground">
                                    Comprobante y Logística
                                </h3>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                                ID: {purchase.id}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                                    Comprobante Proveedor
                                </span>
                                <span className="font-bold text-foreground font-mono block mt-0.5">
                                    {purchase.supplier_document_series ? `${purchase.supplier_document_series}-` : ''}
                                    {purchase.supplier_document_number || 'S/N'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Tipo: {purchase.supplier_document_type || 'FACTURA'}
                                </span>
                            </div>

                            <div>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                                    Fecha de Emisión
                                </span>
                                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    {formatDate(purchase.document_date)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Fecha física
                                </span>
                            </div>

                            <div>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                                    Almacén de Entrada
                                </span>
                                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                    <Warehouse className="w-3.5 h-3.5 text-primary" />
                                    {purchase.branch?.name || 'Almacén Central'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Destino de inventario
                                </span>
                            </div>

                            <div>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">
                                    Moneda y Cambio
                                </span>
                                <span className="font-semibold text-foreground block mt-0.5">
                                    {purchase.currency_code === 'USD' ? 'Dólares ($ USD)' : 'Soles (S/ PEN)'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {purchase.currency_code === 'USD' ? `T.C: ${Number(purchase.exchange_rate || 1).toFixed(3)}` : 'Moneda nacional'}
                                </span>
                            </div>
                        </div>

                        {/* Audit trail footer */}
                        <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                            <span>Registrado por: <strong>{purchase.creator?.name || 'Sistema'}</strong></span>
                            {purchase.status === 'CONFIRMED' && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    Aprobado por: {purchase.approver?.name || 'Administrador'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Enriched Products Table Card */}
                <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            <div>
                                <h3 className="font-bold text-base text-foreground">
                                    Detalle de Repuestos Adquiridos
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Ítems que componen la compra y actualizan existencias en Kardex
                                </p>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-medium text-xs">
                            {lines.length} {lines.length === 1 ? 'ítem' : 'ítems'} registrados
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b border-border text-xs">
                                    <TableHead className="w-10 text-center font-semibold uppercase">#</TableHead>
                                    <TableHead className="font-semibold uppercase">Código / Ref</TableHead>
                                    <TableHead className="font-semibold uppercase">Producto / Repuesto</TableHead>
                                    <TableHead className="w-24 text-center font-semibold uppercase">Unidad</TableHead>
                                    <TableHead className="w-28 text-center font-semibold uppercase">Cant. Pedida</TableHead>
                                    <TableHead className="w-28 text-center font-semibold uppercase">Cant. Recibida</TableHead>
                                    <TableHead className="w-36 text-right font-semibold uppercase">Costo Unit.</TableHead>
                                    <TableHead className="w-36 text-right font-semibold uppercase">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.length > 0 ? (
                                    lines.map((line: any, idx: number) => {
                                        const ordered = Number(line.ordered_quantity || 0);
                                        const received = Number(line.received_quantity || 0);
                                        const unitCost = Number(line.unit_cost_base || line.unit_cost_original || 0);
                                        const subtotal = Number(line.line_subtotal || line.line_total || (ordered * unitCost));

                                        return (
                                            <TableRow key={line.id || idx} className="border-b border-border/70 hover:bg-muted/30">
                                                <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-semibold text-primary">
                                                    {line.product?.primary_reference || line.product?.internal_code || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-sm text-foreground">
                                                        {line.product?.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {line.product?.brand?.name && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-muted/40 border-border">
                                                                {line.product.brand.name}
                                                            </Badge>
                                                        )}
                                                        {line.product?.oem_code && (
                                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                                OEM: {line.product.oem_code}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center text-xs text-muted-foreground">
                                                    {line.product?.unit?.code || line.product?.unit?.name || 'UND'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                                                        {ordered}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {purchase.status === 'CONFIRMED' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                                            {received}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs italic">
                                                            En espera
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-sm">
                                                    {currencySymbol} {unitCost.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-sm text-foreground">
                                                    {currencySymbol} {subtotal.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No se registraron líneas de producto en esta compra.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            <tfoot className="bg-muted/40 font-semibold border-t-2 border-border text-xs">
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right py-3 text-muted-foreground">
                                        TOTALES:
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-foreground">
                                        {totalOrderedUnits}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-emerald-600 dark:text-emerald-400">
                                        {purchase.status === 'CONFIRMED' ? totalReceivedUnits : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        Subtotal:
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-foreground text-sm">
                                        {currencySymbol} {Number(purchase.subtotal_amount || 0).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            </tfoot>
                        </Table>
                    </div>
                </div>

                {/* Bottom Row: Voucher Document / Notes + Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Voucher File & Notes */}
                    <div className="space-y-4">
                        {/* Attached File Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs">
                            <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
                                <div className="flex items-center gap-2">
                                    <File className="w-4 h-4 text-primary" />
                                    <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                                        Comprobante Físico Adjunto
                                    </h4>
                                </div>
                            </div>

                            {purchase.document_file_path ? (
                                <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">
                                                Factura / Documento Adjunto
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono truncate">
                                                {purchase.document_file_path.split('/').pop()}
                                            </p>
                                        </div>
                                    </div>
                                    <a 
                                        href={`/storage/${purchase.document_file_path}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                    >
                                        <Button size="sm" variant="outline" className="gap-1.5 shrink-0 text-primary border-primary/30 hover:bg-primary/10">
                                            <ExternalLink className="w-3.5 h-3.5" /> Ver Documento
                                        </Button>
                                    </a>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic py-2">
                                    No se adjuntó ningún archivo PDF o imagen a esta compra.
                                </p>
                            )}
                        </div>

                        {/* General Notes Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-border pb-2.5 mb-3">
                                <FileText className="w-4 h-4 text-primary" />
                                <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                                    Notas y Observaciones
                                </h4>
                            </div>
                            <p className="text-sm text-foreground/90 whitespace-pre-line">
                                {purchase.notes || <span className="text-muted-foreground italic text-xs">Sin notas registradas para esta compra.</span>}
                            </p>
                        </div>
                    </div>

                    {/* Financial Summary Card */}
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="font-bold text-base text-foreground">
                                Resumen de Liquidación
                            </h3>
                            <Badge variant="outline" className="text-xs">
                                {purchase.currency_code === 'USD' ? 'Dólares ($)' : 'Soles (S/)'}
                            </Badge>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>Operación Gravada (Subtotal):</span>
                                <span className="font-semibold text-foreground">
                                    {currencySymbol} {Number(purchase.subtotal_amount || 0).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>Impuesto General a las Ventas (IGV 18%):</span>
                                <span className="font-semibold text-foreground">
                                    {currencySymbol} {Number(purchase.tax_amount || 0).toFixed(2)}
                                </span>
                            </div>

                            <div className="pt-3 border-t-2 border-border flex justify-between items-center">
                                <div>
                                    <span className="font-extrabold text-lg text-foreground block">
                                        Total Facturado:
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Monto total de la adquisición
                                    </span>
                                </div>
                                <span className="text-3xl font-black text-primary">
                                    {currencySymbol} {Number(purchase.total_amount || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

PurchaseShow.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
