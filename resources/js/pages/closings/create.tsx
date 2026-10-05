import React, { useState, useMemo } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { 
    Calculator, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    Save, 
    Lock, 
    ArrowLeft, 
    Building2, 
    Calendar,
    CreditCard, 
    Banknote, 
    Receipt, 
    Truck, 
    ShoppingBag, 
    ShieldAlert,
    ExternalLink
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

interface BranchItem {
    id: number;
    name: string;
}

interface PaymentMethodMetric {
    id: number;
    name: string;
    code: string;
    is_cash: boolean;
    expected_amount: number;
}

interface MetricsData {
    date: string;
    branch_id: number;
    sales: {
        total_amount: number;
        count: number;
        cash_amount: number;
        credit_amount: number;
        subtotal_amount: number;
        tax_amount: number;
        discount_amount: number;
        by_document: Record<string, {
            label: string;
            count: number;
            total: number;
        }>;
    };
    payment_methods: PaymentMethodMetric[];
    total_expected_cash: number;
    purchases: {
        count: number;
        total_amount: number;
    };
    transfers: {
        sent_count: number;
        received_count: number;
    };
    pending_conflicts: number;
    pending_syncs: number;
    can_close: boolean;
    blocking_reasons: string[];
}

interface ExistingClosing {
    id: number;
    status: string;
    notes?: string;
    opened_at?: string;
    closed_at?: string;
    latest_version?: {
        version_number: number;
        total_expected: number;
        total_counted: number;
        total_difference: number;
        cash_counts?: Array<{
            payment_method_id: number;
            counted_amount: number;
            difference_amount: number;
            notes?: string;
        }>;
    };
}

interface ClosingCreateProps {
    closing: ExistingClosing;
    metrics: MetricsData;
    branches: BranchItem[];
    is_super_admin?: boolean;
    selectedBranchId: number;
    selectedDate: string;
}

export default function ClosingCreate({
    closing,
    metrics,
    branches,
    is_super_admin = false,
    selectedBranchId,
    selectedDate,
}: ClosingCreateProps) {
    const isAlreadyClosed = closing.status === 'CLOSED';
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);

    // Initial counts setup
    const initialCounts = useMemo(() => {
        return metrics.payment_methods.map((pm) => {
            const existingCount = closing.latest_version?.cash_counts?.find(
                (c) => c.payment_method_id === pm.id
            );
            return {
                payment_method_id: pm.id,
                counted_amount: existingCount !== undefined ? Number(existingCount.counted_amount) : Number(pm.expected_amount),
                notes: existingCount?.notes || '',
            };
        });
    }, [metrics.payment_methods, closing.latest_version]);

    const { data, setData, post, processing, errors } = useForm({
        branch_id: selectedBranchId,
        closing_date: selectedDate,
        action: 'draft' as 'draft' | 'confirm',
        notes: closing.notes || '',
        counts: initialCounts,
    });

    const breadcrumbs = [
        { title: 'Caja y Cierres', href: '/closings' },
        { title: 'Arqueo y Cierre Diario', href: '/closings/create' },
    ];

    // Branch / Date switcher
    const handleSwitchContext = (newBranchId: number, newDate: string) => {
        router.get('/closings/create', {
            branch_id: newBranchId,
            date: newDate,
        }, {
            preserveState: false,
        });
    };

    // Update count item
    const handleCountChange = (index: number, val: string) => {
        const numVal = parseFloat(val) || 0;
        const newCounts = [...data.counts];
        newCounts[index] = {
            ...newCounts[index],
            counted_amount: numVal,
        };
        setData('counts', newCounts);
    };

    const handleNotesChange = (index: number, val: string) => {
        const newCounts = [...data.counts];
        newCounts[index] = {
            ...newCounts[index],
            notes: val,
        };
        setData('counts', newCounts);
    };

    // Calculate live totals
    const { totalExpected, totalCounted, totalDifference } = useMemo(() => {
        let expectedSum = 0;
        let countedSum = 0;

        metrics.payment_methods.forEach((pm, idx) => {
            expectedSum += Number(pm.expected_amount || 0);
            const countVal = Number(data.counts[idx]?.counted_amount || 0);
            countedSum += countVal;
        });

        return {
            totalExpected: expectedSum,
            totalCounted: countedSum,
            totalDifference: countedSum - expectedSum,
        };
    }, [metrics.payment_methods, data.counts]);

    const handleSaveDraft = (e: React.FormEvent) => {
        e.preventDefault();
        data.action = 'draft';
        post('/closings', {
            preserveScroll: true,
        });
    };

    const handleConfirmFinal = () => {
        data.action = 'confirm';
        post('/closings', {
            onFinish: () => setConfirmModalOpen(false),
        });
    };

    const formatCurrency = (val: number | string | undefined | null) => {
        const num = Number(val || 0);
        return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <>
            <Head title={`Arqueo de Caja - ${selectedDate}`} />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                <Link href="/closings">
                                    <ArrowLeft className="w-4 h-4" />
                                </Link>
                            </Button>
                            <h1 className="text-2xl font-bold tracking-tight">Arqueo y Cierre Diario de Caja</h1>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-10">
                            Conciliación de valores físicos recaudados contra las ventas y movimientos del sistema.
                        </p>
                    </div>

                    {/* Branch & Date Pickers */}
                    <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto">
                        {is_super_admin && branches.length > 1 ? (
                            <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-sm min-w-[200px]">
                                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                <Select
                                    value={selectedBranchId.toString()}
                                    onValueChange={(val) => handleSwitchContext(Number(val), selectedDate)}
                                >
                                    <SelectTrigger className="border-0 shadow-none h-7 px-1 focus:ring-0 text-sm font-medium min-w-[160px] text-foreground bg-transparent">
                                        <SelectValue placeholder="Seleccionar sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-sm text-sm font-medium">
                                <Building2 className="w-4 h-4 text-primary shrink-0" />
                                <span className="text-foreground">
                                    {branches.find((b) => b.id === selectedBranchId)?.name || branches[0]?.name || 'Sucursal Asignada'}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleSwitchContext(selectedBranchId, e.target.value)}
                                className="border-0 bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Status Notices */}
                {isAlreadyClosed && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-4 flex items-center justify-between text-emerald-900 dark:text-emerald-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div>
                                <h4 className="font-semibold text-sm">Cierre Diario Cerrado Definitivamente</h4>
                                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                                    Esta jornada ya fue auditada y cerrada. No se permiten modificaciones adicionales.
                                </p>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" asChild className="border-emerald-400 hover:bg-emerald-100">
                            <Link href={`/closings/${closing.id}`}>
                                Ver Auditoría Completa
                            </Link>
                        </Button>
                    </div>
                )}

                {/* Offline Sync / Conflict Blocking Alert */}
                {!metrics.can_close && !isAlreadyClosed && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 shadow-sm text-amber-900 dark:text-amber-200">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    Regla de Bloqueo: No se puede confirmar el cierre definitivo
                                </h4>
                                <ul className="text-xs mt-1.5 list-disc list-inside space-y-1">
                                    {metrics.blocking_reasons.map((reason, idx) => (
                                        <li key={idx} className="font-medium">{reason}</li>
                                    ))}
                                </ul>
                                <p className="text-xs text-amber-800 dark:text-amber-300 mt-2">
                                    Puedes realizar el conteo y <strong>Guardar como Borrador</strong> en cualquier momento, pero para confirmar el Cierre Definitivo debes sincronizar las terminales y resolver los conflictos pendientes.
                                </p>
                                {metrics.pending_conflicts > 0 && (
                                    <div className="mt-3">
                                        <Button size="sm" variant="outline" asChild className="border-amber-400 bg-amber-100/50 hover:bg-amber-100 gap-1.5 text-xs">
                                            <Link href="/conflicts">
                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                Ir a Bandeja de Conflictos ({metrics.pending_conflicts})
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* System Activity Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Ventas Totales */}
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Total Facturado</span>
                            <Receipt className="w-4 h-4 text-primary" />
                        </div>
                        <div className="mt-2 text-2xl font-bold font-mono">
                            {formatCurrency(metrics.sales.total_amount)}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                            <span>Comprobantes:</span>
                            <span className="font-semibold text-foreground">{metrics.sales.count}</span>
                        </div>
                    </div>

                    {/* Ventas Contado vs Crédito */}
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Contado vs Crédito</span>
                            <Banknote className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Al Contado:</span>
                                <span className="font-mono font-semibold text-emerald-600">{formatCurrency(metrics.sales.cash_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Al Crédito:</span>
                                <span className="font-mono font-semibold text-amber-600">{formatCurrency(metrics.sales.credit_amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Desglose por Comprobante */}
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Por Documento</span>
                            <ShoppingBag className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                            {Object.entries(metrics.sales.by_document).map(([k, d]) => (
                                <div key={k} className="flex justify-between text-muted-foreground">
                                    <span>{d.label} ({d.count}):</span>
                                    <span className="font-mono font-medium text-foreground">{formatCurrency(d.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mercadería y Movimientos */}
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase">Movimientos Stock</span>
                            <Truck className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Compras:</span>
                                <span className="font-semibold text-foreground">{metrics.purchases.count} ({formatCurrency(metrics.purchases.total_amount)})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Transf. Enviadas:</span>
                                <span className="font-semibold text-foreground">{metrics.transfers.sent_count}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Transf. Recibidas:</span>
                                <span className="font-semibold text-foreground">{metrics.transfers.received_count}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form: Arqueo Físico de Caja */}
                <form onSubmit={handleSaveDraft} className="flex flex-col gap-6">
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-muted/40 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-base flex items-center gap-2">
                                    <Calculator className="w-4 h-4 text-primary" />
                                    Arqueo de Caja por Método de Pago
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Ingresa el monto físico contado para cada método. El sistema calculará automáticamente las diferencias.
                                </p>
                            </div>
                            {closing.latest_version && (
                                <Badge variant="secondary">
                                    Borrador Versión #{closing.latest_version.version_number}
                                </Badge>
                            )}
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/20">
                                    <TableHead className="w-[30%]">Método de Pago</TableHead>
                                    <TableHead className="text-right w-[20%]">Monto Esperado (Sistema)</TableHead>
                                    <TableHead className="text-right w-[22%]">Monto Físico (Contado)</TableHead>
                                    <TableHead className="text-right w-[15%]">Diferencia</TableHead>
                                    <TableHead className="w-[13%]">Notas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {metrics.payment_methods.map((method, idx) => {
                                    const counted = Number(data.counts[idx]?.counted_amount || 0);
                                    const diff = counted - Number(method.expected_amount || 0);

                                    return (
                                        <TableRow key={method.id} className="hover:bg-muted/30">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {method.is_cash ? (
                                                        <Banknote className="w-4 h-4 text-emerald-600" />
                                                    ) : (
                                                        <CreditCard className="w-4 h-4 text-blue-600" />
                                                    )}
                                                    <div>
                                                        <span className="font-semibold block">{method.name}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase">{method.code}</span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right font-mono font-medium">
                                                {formatCurrency(method.expected_amount)}
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="relative inline-block w-36">
                                                    <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-mono">
                                                        S/
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        disabled={isAlreadyClosed}
                                                        value={data.counts[idx]?.counted_amount ?? ''}
                                                        onChange={(e) => handleCountChange(idx, e.target.value)}
                                                        className="text-right pl-7 font-mono font-bold"
                                                    />
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right font-mono font-bold">
                                                <span
                                                    className={
                                                        diff < 0
                                                            ? 'text-rose-600'
                                                            : diff > 0
                                                            ? 'text-emerald-600'
                                                            : 'text-muted-foreground'
                                                    }
                                                >
                                                    {diff > 0 ? '+' : ''}
                                                    {formatCurrency(diff)}
                                                </span>
                                            </TableCell>

                                            <TableCell>
                                                <Input
                                                    type="text"
                                                    placeholder="Opcional..."
                                                    disabled={isAlreadyClosed}
                                                    value={data.counts[idx]?.notes ?? ''}
                                                    onChange={(e) => handleNotesChange(idx, e.target.value)}
                                                    className="text-xs h-8"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {/* Total Summary Row */}
                                <TableRow className="bg-muted/60 font-bold border-t-2">
                                    <TableCell className="text-base">TOTAL CONSOLIDADO</TableCell>
                                    <TableCell className="text-right text-base font-mono">
                                        {formatCurrency(totalExpected)}
                                    </TableCell>
                                    <TableCell className="text-right text-base font-mono">
                                        {formatCurrency(totalCounted)}
                                    </TableCell>
                                    <TableCell className="text-right text-base font-mono">
                                        <span
                                            className={
                                                totalDifference < 0
                                                    ? 'text-rose-600'
                                                    : totalDifference > 0
                                                    ? 'text-emerald-600'
                                                    : 'text-muted-foreground'
                                            }
                                        >
                                            {totalDifference > 0 ? '+' : ''}
                                            {formatCurrency(totalDifference)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                totalDifference === 0
                                                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                                                    : totalDifference > 0
                                                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                                                    : 'border-rose-500 text-rose-600 bg-rose-50'
                                            }
                                        >
                                            {totalDifference === 0
                                                ? 'Cuadrado Exacto'
                                                : totalDifference > 0
                                                ? 'Sobrante'
                                                : 'Faltante'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    {/* General Notes */}
                    <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <label className="text-sm font-semibold mb-1 block">
                            Observaciones Generales del Cierre
                        </label>
                        <Textarea
                            placeholder="Anota incidencias, justificaciones de diferencias o novedades del turno..."
                            disabled={isAlreadyClosed}
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Action Buttons */}
                    {!isAlreadyClosed && (
                        <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={processing}
                                className="w-full sm:w-auto gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Guardar como Borrador
                            </Button>

                            <Button
                                type="button"
                                disabled={processing || !metrics.can_close}
                                onClick={() => setConfirmModalOpen(true)}
                                className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Lock className="w-4 h-4" />
                                Confirmar Cierre Definitivo
                            </Button>
                        </div>
                    )}
                </form>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600">
                            <Lock className="w-5 h-5" />
                            Confirmar Cierre Definitivo de Caja
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-sm text-foreground">
                            ¿Estás seguro de confirmar y sellar el cierre para la fecha <strong>{selectedDate}</strong>?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-3 p-3 rounded-lg bg-muted/60 space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Esperado:</span>
                            <span className="font-mono font-bold">{formatCurrency(totalExpected)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Contado Físico:</span>
                            <span className="font-mono font-bold">{formatCurrency(totalCounted)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-bold">
                            <span>Diferencia Neta:</span>
                            <span className={totalDifference < 0 ? 'text-rose-600 font-mono' : 'text-emerald-600 font-mono'}>
                                {totalDifference > 0 ? '+' : ''}{formatCurrency(totalDifference)}
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Una vez confirmado, el estado cambiará a <strong>CERRADO</strong> y se generará el ticket térmico oficial de arqueo. Esta acción no se puede deshacer.
                    </p>

                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmModalOpen(false)}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmFinal}
                            disabled={processing}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Sí, Cerrar Definitivamente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ClosingCreate.layout = (page: any) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Caja y Cierres', href: '/closings' },
            { title: 'Arqueo y Cierre Diario', href: '/closings/create' },
        ]}
    >
        {page}
    </AppLayout>
);

