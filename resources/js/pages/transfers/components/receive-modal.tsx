import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { 
    PackageCheck, 
    AlertTriangle, 
    CheckCircle2, 
    XCircle, 
    RotateCcw, 
    Sparkles, 
    Truck, 
    ArrowRight, 
    Store, 
    Building2, 
    AlertCircle, 
    Check, 
    Info, 
    Package, 
    ShieldCheck, 
    Loader2 
} from 'lucide-react';

interface ReceiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    transfer: any;
}

export function ReceiveModal({ isOpen, onClose, transfer }: ReceiveModalProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        notes: '',
        lines: [] as Array<{
            id: number;
            product_name: string;
            product_reference: string;
            product_brand?: string;
            product_unit?: string;
            shipped: number;
            received_quantity: number | string;
            damaged_quantity: number | string;
            missing_quantity: number | string;
        }>
    });

    useEffect(() => {
        if (isOpen && transfer?.lines) {
            setData({
                notes: '',
                lines: transfer.lines.map((l: any) => ({
                    id: l.id,
                    product_name: l.product?.name || 'Producto sin nombre',
                    product_reference: l.product?.primary_reference || l.product?.internal_code || '-',
                    product_brand: l.product?.brand?.name || null,
                    product_unit: l.product?.unit?.code || l.product?.unit?.name || 'UND',
                    shipped: Number(l.shipped_quantity || 0),
                    received_quantity: Number(l.shipped_quantity || 0),
                    damaged_quantity: 0,
                    missing_quantity: 0
                }))
            });
        }
    }, [isOpen, transfer]);

    const handleLineChange = (index: number, field: 'received_quantity' | 'damaged_quantity' | 'missing_quantity', value: string) => {
        const newLines = [...data.lines];
        const numVal = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
        newLines[index] = {
            ...newLines[index],
            [field]: numVal
        };
        setData('lines', newLines);
    };

    // Auto-completar todo como 100% recibido conforme
    const handleSetAllOK = () => {
        const updated = data.lines.map(line => ({
            ...line,
            received_quantity: line.shipped,
            damaged_quantity: 0,
            missing_quantity: 0
        }));
        setData('lines', updated);
    };

    // Restablecer todas las cantidades a cero
    const handleResetToZero = () => {
        const updated = data.lines.map(line => ({
            ...line,
            received_quantity: 0,
            damaged_quantity: 0,
            missing_quantity: 0
        }));
        setData('lines', updated);
    };

    // Marcar una fila específica como 100% OK
    const handleSetRowOK = (index: number) => {
        const newLines = [...data.lines];
        newLines[index] = {
            ...newLines[index],
            received_quantity: newLines[index].shipped,
            damaged_quantity: 0,
            missing_quantity: 0
        };
        setData('lines', newLines);
    };

    const isRowValid = (line: any) => {
        const rec = Number(line.received_quantity || 0);
        const dam = Number(line.damaged_quantity || 0);
        const mis = Number(line.missing_quantity || 0);
        return (rec + dam + mis) === line.shipped;
    };

    const getRowDiff = (line: any) => {
        const rec = Number(line.received_quantity || 0);
        const dam = Number(line.damaged_quantity || 0);
        const mis = Number(line.missing_quantity || 0);
        return (rec + dam + mis) - line.shipped;
    };

    const hasErrors = data.lines.some(l => !isRowValid(l));
    const unbalancedLinesCount = data.lines.filter(l => !isRowValid(l)).length;

    const totalShipped = data.lines.reduce((sum, l) => sum + Number(l.shipped || 0), 0);
    const totalToStock = data.lines.reduce((sum, l) => sum + Number(l.received_quantity || 0), 0);
    const totalDamaged = data.lines.reduce((sum, l) => sum + Number(l.damaged_quantity || 0), 0);
    const totalMissing = data.lines.reduce((sum, l) => sum + Number(l.missing_quantity || 0), 0);
    const totalIssues = totalDamaged + totalMissing;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hasErrors || processing) return;

        post(`/transfers/${transfer.id}/receipts`, {
            onSuccess: () => {
                onClose();
                reset();
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[95vw] md:max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card text-card-foreground border-border rounded-2xl shadow-xl">
                {/* Header */}
                <div className="p-6 border-b border-border bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                <PackageCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                        Registrar Recepción de Mercadería
                                    </DialogTitle>
                                    <Badge variant="outline" className="font-mono text-xs bg-muted/50 border-border">
                                        #{transfer?.transfer_number}
                                    </Badge>
                                </div>
                                <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                                    <span>Ruta:</span>
                                    <strong className="text-foreground">{transfer?.source_branch?.name}</strong>
                                    <ArrowRight className="w-3 h-3 text-primary inline" />
                                    <strong className="text-foreground">{transfer?.destination_branch?.name}</strong>
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Fast Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={handleSetAllOK}
                                className="h-8 gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                Recibir Todo Conforme (100% OK)
                            </Button>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleResetToZero}
                                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Limpiar
                            </Button>
                        </div>
                    </div>

                    {/* Operational Tip Banner */}
                    <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                        <div>
                            <strong>Regla de cuadre de inventario:</strong> Para cada repuesto, la suma de 
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400"> (Recibido OK)</span> + 
                            <span className="font-semibold text-orange-700 dark:text-orange-400"> (Dañado)</span> + 
                            <span className="font-semibold text-rose-700 dark:text-rose-400"> (Faltante)</span> debe ser exactamente igual a la cantidad despachada.
                        </div>
                    </div>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                        {/* 4 Summary Live Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3.5 rounded-xl border border-border bg-muted/20">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                                    Despachado
                                </span>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <span className="text-xl font-bold text-foreground">{totalShipped}</span>
                                    <span className="text-xs text-muted-foreground">unidades</span>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                        Ingresará a Stock
                                    </span>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalToStock}</span>
                                    <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">unidades OK</span>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl border border-orange-500/30 bg-orange-500/5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                        Incidencias
                                    </span>
                                    <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <span className={`text-xl font-bold ${totalIssues > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                                        {totalIssues}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        ({totalDamaged} daño, {totalMissing} falt.)
                                    </span>
                                </div>
                            </div>

                            <div className={`p-3.5 rounded-xl border transition-colors ${
                                hasErrors 
                                    ? 'border-rose-500/40 bg-rose-500/10' 
                                    : 'border-emerald-500/40 bg-emerald-500/10'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Estado Cuadre
                                    </span>
                                    {hasErrors ? (
                                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                    ) : (
                                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    )}
                                </div>
                                <div className="mt-1">
                                    {hasErrors ? (
                                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                            {unbalancedLinesCount} {unbalancedLinesCount === 1 ? 'ítem descuadrado' : 'ítems descuadrados'}
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            Conteo 100% Cuadrado ✓
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Table */}
                        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-b border-border text-xs">
                                        <TableHead className="w-10 text-center font-semibold uppercase">#</TableHead>
                                        <TableHead className="font-semibold uppercase">Repuesto / Identificador</TableHead>
                                        <TableHead className="w-24 text-center font-semibold uppercase">Despachado</TableHead>
                                        <TableHead className="w-32 text-center font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                                            Recibido OK
                                        </TableHead>
                                        <TableHead className="w-28 text-center font-semibold uppercase text-orange-600 dark:text-orange-400">
                                            Dañado
                                        </TableHead>
                                        <TableHead className="w-28 text-center font-semibold uppercase text-rose-600 dark:text-rose-400">
                                            Faltante
                                        </TableHead>
                                        <TableHead className="w-36 text-center font-semibold uppercase">Estado Cuadre</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.lines.map((line, idx) => {
                                        const valid = isRowValid(line);
                                        const diff = getRowDiff(line);
                                        const hasIssues = Number(line.damaged_quantity || 0) > 0 || Number(line.missing_quantity || 0) > 0;

                                        let rowStyle = 'hover:bg-muted/30';
                                        if (!valid) {
                                            rowStyle = 'bg-rose-500/5 hover:bg-rose-500/10 border-l-4 border-l-rose-500';
                                        } else if (hasIssues) {
                                            rowStyle = 'bg-orange-500/5 hover:bg-orange-500/10 border-l-4 border-l-orange-500';
                                        }

                                        return (
                                            <TableRow key={line.id} className={`border-b border-border/70 transition-colors ${rowStyle}`}>
                                                <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                                    {idx + 1}
                                                </TableCell>
                                                
                                                <TableCell className="max-w-[280px]">
                                                    <div className="font-mono text-xs font-semibold text-primary">
                                                        {line.product_reference}
                                                    </div>
                                                    <div className="font-medium text-sm text-foreground truncate" title={line.product_name}>
                                                        {line.product_name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {line.product_brand && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-3.5 bg-muted/40 border-border">
                                                                {line.product_brand}
                                                            </Badge>
                                                        )}
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {line.product_unit}
                                                        </span>
                                                    </div>
                                                    {errors[`lines.${idx}` as keyof typeof errors] && (
                                                        <p className="text-rose-500 text-xs mt-1">
                                                            {errors[`lines.${idx}` as keyof typeof errors]}
                                                        </p>
                                                    )}
                                                </TableCell>

                                                {/* Cantidad Enviada */}
                                                <TableCell className="text-center">
                                                    <span className="inline-flex items-center justify-center font-bold text-sm bg-muted px-2.5 py-1 rounded-md text-foreground">
                                                        {line.shipped}
                                                    </span>
                                                </TableCell>

                                                {/* Recibido OK Input */}
                                                <TableCell>
                                                    <div className="relative">
                                                        <Input 
                                                            type="number" 
                                                            min="0"
                                                            step="1"
                                                            value={line.received_quantity}
                                                            onChange={(e) => handleLineChange(idx, 'received_quantity', e.target.value)}
                                                            className="h-10 text-center font-bold text-sm bg-background border-emerald-500/40 focus-visible:ring-emerald-500 text-emerald-700 dark:text-emerald-400"
                                                        />
                                                    </div>
                                                </TableCell>

                                                {/* Dañado Input */}
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        min="0"
                                                        step="1"
                                                        value={line.damaged_quantity}
                                                        onChange={(e) => handleLineChange(idx, 'damaged_quantity', e.target.value)}
                                                        className="h-10 text-center font-semibold text-sm bg-background border-orange-500/40 focus-visible:ring-orange-500 text-orange-700 dark:text-orange-400"
                                                    />
                                                </TableCell>

                                                {/* Faltante Input */}
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        min="0"
                                                        step="1"
                                                        value={line.missing_quantity}
                                                        onChange={(e) => handleLineChange(idx, 'missing_quantity', e.target.value)}
                                                        className="h-10 text-center font-semibold text-sm bg-background border-rose-500/40 focus-visible:ring-rose-500 text-rose-700 dark:text-rose-400"
                                                    />
                                                </TableCell>

                                                {/* Estado de Fila */}
                                                <TableCell className="text-center">
                                                    {!valid ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Badge variant="outline" className="text-[11px] border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 whitespace-nowrap">
                                                                {diff < 0 ? `Faltan ${Math.abs(diff)}` : `Sobran ${diff}`}
                                                            </Badge>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleSetRowOK(idx)}
                                                                className="text-[10px] text-primary hover:underline"
                                                            >
                                                                Ajustar a OK
                                                            </button>
                                                        </div>
                                                    ) : hasIssues ? (
                                                        <Badge variant="outline" className="text-[11px] border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10 whitespace-nowrap">
                                                            <AlertTriangle className="w-3 h-3 mr-1" /> Con Observación
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[11px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 whitespace-nowrap">
                                                            <Check className="w-3 h-3 mr-1" /> Conforme
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* General Reception Notes */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    Notas y Justificación de la Recepción
                                    {totalIssues > 0 && (
                                        <span className="text-orange-600 dark:text-orange-400 text-xs font-normal">
                                            (Recomendado al registrar discrepancias)
                                        </span>
                                    )}
                                </label>
                                <span className="text-xs text-muted-foreground">
                                    Visible en el Kardex y detalle de la transferencia
                                </span>
                            </div>
                            <Textarea 
                                placeholder="Ingresa comentarios sobre la condición del embalaje, sellos de seguridad, transportista o motivos de las piezas dañadas/faltantes..."
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                className="resize-none bg-background border-border text-sm min-h-[75px]"
                                rows={3}
                            />
                        </div>

                        {/* Error Alert if Unbalanced */}
                        {hasErrors && (
                            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                                <div>
                                    <strong>No se puede confirmar la recepción:</strong> Hay <strong>{unbalancedLinesCount}</strong> {unbalancedLinesCount === 1 ? 'producto cuya suma' : 'productos cuyas sumas'} no coinciden con la cantidad despachada. Cuadra las cantidades o utiliza el botón <em>"Recibir Todo Conforme"</em> si todo llegó en buen estado.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                            <span>Total a ingresar: <strong className="text-emerald-600 dark:text-emerald-400">{totalToStock} unidades</strong></span>
                            {totalIssues > 0 && (
                                <span className="ml-2 text-orange-600 dark:text-orange-400">
                                    ({totalIssues} con observaciones)
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={onClose}
                                disabled={processing}
                            >
                                Cancelar
                            </Button>
                            
                            <Button 
                                type="submit" 
                                disabled={processing || hasErrors || data.lines.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs min-w-[200px]"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Registrando Entrada...
                                    </>
                                ) : (
                                    <>
                                        <PackageCheck className="w-4 h-4 mr-2" />
                                        Confirmar y Cerrar Recepción
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
