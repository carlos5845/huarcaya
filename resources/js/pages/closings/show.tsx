import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Calculator,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowLeft,
    Printer,
    Edit,
    Building2,
    Calendar,
    User,
    Receipt,
    CreditCard,
    Banknote,
    Truck,
    ShoppingBag,
    History
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { DocumentPreviewModal } from '@/components/document-preview-modal';

interface PaymentMethodItem {
    id: number;
    name: string;
    code: string;
    is_cash: boolean;
}

interface CashCountItem {
    id: number;
    payment_method_id: number;
    expected_amount: string | number;
    counted_amount: string | number;
    difference_amount: string | number;
    notes?: string;
    payment_method?: PaymentMethodItem;
}

interface VersionItem {
    id: number;
    version_number: number;
    total_expected: string | number;
    total_counted: string | number;
    total_difference: string | number;
    snapshot_data?: any;
    notes?: string;
    created_at: string;
    creator?: {
        name: string;
    };
    cash_counts?: CashCountItem[];
}

interface ClosingDetailProps {
    closing: {
        id: number;
        uuid: string;
        closing_date: string;
        status: string;
        opened_at: string;
        closed_at?: string;
        notes?: string;
        branch?: {
            id: number;
            name: string;
            code?: string;
            address?: string;
        };
        opened_by_user?: {
            name: string;
        };
        closed_by_user?: {
            name: string;
        };
        latest_version?: VersionItem;
        versions?: VersionItem[];
    };
}

export default function ClosingShow({ closing }: ClosingDetailProps) {
    const isClosed = closing.status === 'CLOSED';
    const [printModalOpen, setPrintModalOpen] = useState(false);

    const breadcrumbs = [
        { title: 'Caja y Cierres', href: '/closings' },
        { title: `Cierre ${closing.closing_date}`, href: `/closings/${closing.id}` },
    ];

    const formatCurrency = (val: number | string | undefined | null) => {
        const num = Number(val || 0);
        return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const latestVer = closing.latest_version;
    const diff = Number(latestVer?.total_difference || 0);
    const snapshot = latestVer?.snapshot_data;
    const sales = snapshot?.sales;
    const purchases = snapshot?.purchases;
    const transfers = snapshot?.transfers;

    return (
        <>
            <Head title={`Detalle de Cierre - ${closing.closing_date}`} />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <Link href="/closings">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-2xl font-bold tracking-tight">
                                    Auditoría de Cierre Diario: {closing.closing_date}
                                </h1>
                                {isClosed ? (
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Cerrado Definitivo
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        En Proceso
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Sucursal: <strong>{closing.branch?.name}</strong> • Registro #{closing.id}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto">
                        {!isClosed && (
                            <Button variant="outline" size="sm" asChild className="gap-2">
                                <Link href={`/closings/create?branch_id=${closing.branch?.id}&date=${closing.closing_date}`}>
                                    <Edit className="w-4 h-4" />
                                    Editar / Continuar Arqueo
                                </Link>
                            </Button>
                        )}

                        <Button
                            size="sm"
                            onClick={() => setPrintModalOpen(true)}
                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir Ticket (80mm)
                        </Button>
                    </div>
                </div>

                {/* Main Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Estado</span>
                        <div className="mt-2 flex items-center gap-2 font-bold text-lg">
                            {isClosed ? (
                                <span className="text-emerald-600 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-5 h-5" /> Cerrado Definitivo
                                </span>
                            ) : (
                                <span className="text-amber-600 flex items-center gap-1.5">
                                    <Clock className="w-5 h-5" /> En Proceso / Borrador
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {latestVer ? `Versión final #${latestVer.version_number}` : 'Sin arqueo aún'}
                        </p>
                    </div>

                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Total Esperado</span>
                        <div className="mt-2 text-2xl font-bold font-mono">
                            {latestVer ? formatCurrency(latestVer.total_expected) : '-'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Según ventas y cobros</p>
                    </div>

                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Total Contado Físico</span>
                        <div className="mt-2 text-2xl font-bold font-mono">
                            {latestVer ? formatCurrency(latestVer.total_counted) : '-'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Efectivo y vouchers en mano</p>
                    </div>

                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Diferencia General</span>
                        <div className="mt-2 text-2xl font-bold font-mono">
                            {latestVer ? (
                                <span className={diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-muted-foreground'}>
                                    {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                </span>
                            ) : '-'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {diff === 0 ? 'Cuadrado sin diferencias' : diff > 0 ? 'Sobrante en caja' : 'Faltante en caja'}
                        </p>
                    </div>
                </div>

                {/* Audit Information Bar */}
                <div className="rounded-xl border bg-card p-5 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    <div>
                        <span className="text-muted-foreground font-medium block">Fecha del Cierre</span>
                        <div className="flex items-center gap-1.5 mt-1 font-semibold text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {closing.closing_date}
                        </div>
                    </div>

                    <div>
                        <span className="text-muted-foreground font-medium block">Apertura</span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{closing.opened_by_user?.name || '-'} ({closing.opened_at || '-'})</span>
                        </div>
                    </div>

                    <div>
                        <span className="text-muted-foreground font-medium block">Cierre Definitivo</span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{closing.closed_by_user?.name || 'Aún abierto'} ({closing.closed_at || '-'})</span>
                        </div>
                    </div>

                    <div>
                        <span className="text-muted-foreground font-medium block">Sucursal</span>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span>{closing.branch?.name}</span>
                        </div>
                    </div>

                    {closing.notes && (
                        <div className="col-span-1 md:col-span-4 border-t pt-3">
                            <span className="font-semibold text-muted-foreground block">Observaciones:</span>
                            <p className="mt-1 text-sm bg-muted/40 p-2.5 rounded-lg">{closing.notes}</p>
                        </div>
                    )}
                </div>

                {/* Arqueo Físico Detallado */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-muted/40">
                        <h3 className="font-bold text-base flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-primary" />
                            Desglose de Arqueo por Método de Pago
                        </h3>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20">
                                <TableHead>Método de Pago</TableHead>
                                <TableHead className="text-right">Esperado Sistema</TableHead>
                                <TableHead className="text-right">Contado Físico</TableHead>
                                <TableHead className="text-right">Diferencia</TableHead>
                                <TableHead>Notas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {latestVer?.cash_counts && latestVer.cash_counts.length > 0 ? (
                                latestVer.cash_counts.map((count) => {
                                    const cDiff = Number(count.difference_amount || 0);

                                    return (
                                        <TableRow key={count.id} className="hover:bg-muted/30">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {count.payment_method?.is_cash ? (
                                                        <Banknote className="w-4 h-4 text-emerald-600" />
                                                    ) : (
                                                        <CreditCard className="w-4 h-4 text-blue-600" />
                                                    )}
                                                    <span className="font-semibold">
                                                        {count.payment_method?.name || 'N/A'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">
                                                {formatCurrency(count.expected_amount)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">
                                                {formatCurrency(count.counted_amount)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">
                                                <span className={cDiff < 0 ? 'text-rose-600' : cDiff > 0 ? 'text-emerald-600' : 'text-muted-foreground'}>
                                                    {cDiff > 0 ? '+' : ''}{formatCurrency(cDiff)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {count.notes || '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                        No hay conteos registrados para este cierre.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Resumen Congelado de Operaciones (Snapshot) */}
                {sales && (
                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <h3 className="font-bold text-base flex items-center gap-2 mb-4 border-b pb-2">
                            <Receipt className="w-4 h-4 text-primary" />
                            Instantánea de Operaciones del Sistema (Snapshot Congelado)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5 text-muted-foreground">
                                    <ShoppingBag className="w-4 h-4" /> Ventas Registradas
                                </h4>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">Total Facturado:</span>
                                        <span className="font-mono font-bold text-sm">{formatCurrency(sales.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">Comprobantes emitidos:</span>
                                        <span className="font-semibold">{sales.count}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">Venta al Contado:</span>
                                        <span className="font-mono text-emerald-600 font-semibold">{formatCurrency(sales.cash_amount)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">Venta al Crédito:</span>
                                        <span className="font-mono text-amber-600 font-semibold">{formatCurrency(sales.credit_amount)}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5 text-muted-foreground">
                                    <Receipt className="w-4 h-4" /> Por Tipo de Comprobante
                                </h4>
                                <div className="space-y-1.5">
                                    {sales.by_document && Object.entries(sales.by_document).map(([k, d]: any) => (
                                        <div key={k} className="flex justify-between py-1 border-b">
                                            <span className="text-muted-foreground">{d.label} ({d.count}):</span>
                                            <span className="font-mono font-medium">{formatCurrency(d.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5 text-muted-foreground">
                                    <Truck className="w-4 h-4" /> Movimientos de Stock
                                </h4>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">Compras Ingresadas:</span>
                                        <span className="font-semibold">{purchases?.count || 0} ({formatCurrency(purchases?.total_amount || 0)})</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">Transferencias Enviadas:</span>
                                        <span className="font-semibold">{transfers?.sent_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">Transferencias Recibidas:</span>
                                        <span className="font-semibold">{transfers?.received_count || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Historial de Versiones */}
                {closing.versions && closing.versions.length > 0 && (
                    <div className="rounded-xl border bg-card p-5 shadow-sm">
                        <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                            <History className="w-4 h-4 text-primary" />
                            Historial de Versiones del Arqueo
                        </h3>

                        <div className="space-y-3">
                            {closing.versions.map((ver) => {
                                const vDiff = Number(ver.total_difference || 0);

                                return (
                                    <div key={ver.id} className="p-3 rounded-lg border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                                        <div>
                                            <div className="flex items-center gap-2 font-bold">
                                                <span>Versión #{ver.version_number}</span>
                                                <span className="text-muted-foreground font-normal">• {ver.created_at}</span>
                                            </div>
                                            <p className="text-muted-foreground mt-0.5">
                                                Registrado por: {ver.creator?.name || 'Sistema'} {ver.notes ? `— "${ver.notes}"` : ''}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 font-mono">
                                            <div>
                                                <span className="text-muted-foreground text-[10px] block">Esperado</span>
                                                <span>{formatCurrency(ver.total_expected)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground text-[10px] block">Contado</span>
                                                <span className="font-bold">{formatCurrency(ver.total_counted)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground text-[10px] block">Diferencia</span>
                                                <span className={vDiff < 0 ? 'text-rose-600 font-bold' : vDiff > 0 ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}>
                                                    {vDiff > 0 ? '+' : ''}{formatCurrency(vDiff)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Document Preview Modal */}
            <DocumentPreviewModal
                open={printModalOpen}
                onOpenChange={setPrintModalOpen}
                url={`/closings/${closing.id}/print`}
                title={`Ticket de Cierre Diario - ${closing.branch?.name}`}
                subtitle={`Fecha: ${closing.closing_date} | Estado: ${isClosed ? 'Cerrado' : 'En Proceso'}`}
            />
        </>
    );
}

ClosingShow.layout = (page: any) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Caja y Cierres', href: '/closings' },
            { title: 'Auditoría de Cierre', href: '/closings' },
        ]}
    >
        {page}
    </AppLayout>
);

