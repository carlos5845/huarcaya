import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WifiOff, Trash2, Clock, Calendar, User, CreditCard, Package } from 'lucide-react';
import type { LocalOfflineSale } from '@/lib/db';

interface OfflineSaleDetailDialogProps {
    sale: LocalOfflineSale | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDiscard?: (uuid: string) => void;
}

export function OfflineSaleDetailDialog({
    sale,
    open,
    onOpenChange,
    onDiscard,
}: OfflineSaleDetailDialogProps) {
    if (!sale) return null;

    const subtotal = sale.total_amount > 0 ? sale.total_amount / 1.18 : 0;
    const tax = sale.total_amount - subtotal;
    const isDraft = sale.action === 'DRAFT';

    const handleDiscard = () => {
        if (confirm('¿Estás seguro de descartar esta venta offline? Se cancelará la sincronización y se devolverán las unidades al stock local.')) {
            if (onDiscard) {
                onDiscard(sale.uuid);
            }
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <WifiOff className="h-5 w-5 text-amber-500" />
                            Venta Offline: {sale.sale_number}
                        </DialogTitle>
                        <Badge
                            variant="outline"
                            className={
                                isDraft
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                    : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                            }
                        >
                            {isDraft ? 'Borrador Local' : 'Pendiente de Sincronizar'}
                        </Badge>
                    </div>
                    <DialogDescription className="text-xs">
                        Esta venta fue emitida sin conexión a internet y se encuentra guardada localmente en tu dispositivo. Se enviará al servidor central automáticamente al detectar conexión.
                    </DialogDescription>
                </DialogHeader>

                {/* Metadata cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs">
                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium mb-1">
                            <User className="h-3.5 w-3.5" /> Cliente
                        </span>
                        <p className="font-semibold truncate">{sale.customer_name}</p>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium mb-1">
                            <Calendar className="h-3.5 w-3.5" /> Fecha
                        </span>
                        <p className="font-semibold">{sale.operation_date}</p>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium mb-1">
                            <CreditCard className="h-3.5 w-3.5" /> Condición
                        </span>
                        <p className="font-semibold">{sale.payment_type === 'CASH' ? 'Contado' : 'Crédito'}</p>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium mb-1">
                            <Clock className="h-3.5 w-3.5" /> Registrado
                        </span>
                        <p className="font-semibold">
                            {new Date(sale.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Products Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 text-[11px]">
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-center w-[90px]">Cantidad</TableHead>
                                <TableHead className="text-right w-[110px]">P. Unitario</TableHead>
                                <TableHead className="text-right w-[110px]">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sale.lines.map((l, idx) => (
                                <TableRow key={idx} className="text-xs">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>{l.product_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-semibold">{l.quantity}</TableCell>
                                    <TableCell className="text-right font-mono">S/ {Number(l.unit_price).toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">
                                        S/ {Number(l.line_total).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Totals Summary */}
                <div className="flex flex-col items-end gap-1.5 text-xs pt-1 pr-1 font-mono">
                    <div className="flex justify-between w-48 text-muted-foreground">
                        <span>Op. Gravada:</span>
                        <span>S/ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-48 text-muted-foreground">
                        <span>IGV (18%):</span>
                        <span>S/ {tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-48 font-bold text-sm text-foreground border-t border-border pt-1">
                        <span>Total:</span>
                        <span>S/ {Number(sale.total_amount).toFixed(2)}</span>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-border">
                    {onDiscard && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDiscard}
                            className="gap-1.5 text-xs w-full sm:w-auto"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Descartar Venta Offline
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-xs w-full sm:w-auto ml-auto"
                    >
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
