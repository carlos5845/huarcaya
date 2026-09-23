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
import { WifiOff, Trash2, Clock, Calendar, Building2, Package, FileText, Eye } from 'lucide-react';
import { formatAppDate } from '@/lib/utils';
import type { LocalOfflinePurchase } from '@/lib/db';

interface OfflinePurchaseDetailDialogProps {
    purchase: LocalOfflinePurchase | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDiscard?: (uuid: string) => void;
}

export function OfflinePurchaseDetailDialog({
    purchase,
    open,
    onOpenChange,
    onDiscard,
}: OfflinePurchaseDetailDialogProps) {
    if (!purchase) return null;

    const subtotal = purchase.total_amount > 0 ? purchase.total_amount / 1.18 : 0;
    const tax = purchase.total_amount - subtotal;
    const isDraft = purchase.action === 'DRAFT';

    const handleDiscard = () => {
        if (confirm('¿Estás seguro de descartar esta compra offline? Se cancelará la sincronización y se revertirá el ajuste local de stock.')) {
            if (onDiscard) {
                onDiscard(purchase.uuid);
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
                            Compra Offline: {purchase.temp_purchase_number}
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
                        Esta compra o ingreso de mercancía fue registrada sin conexión y guardada localmente en tu dispositivo. Se enviará al servidor central automáticamente al reestablecerse la conexión.
                    </DialogDescription>
                </DialogHeader>

                {/* Metadata cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs">
                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium mb-1">
                            <Building2 className="h-3.5 w-3.5" /> Proveedor
                        </span>
                        <p className="font-semibold truncate">{purchase.supplier_name}</p>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium mb-1">
                            <Calendar className="h-3.5 w-3.5" /> Fecha
                        </span>
                        <p className="font-semibold">{formatAppDate(purchase.document_date)}</p>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium mb-1">
                            Documento
                        </span>
                        <p className="font-semibold">
                            {purchase.supplier_document_series ? `${purchase.supplier_document_series}-${purchase.supplier_document_number || ''}` : (purchase.supplier_document_number || 'S/N')}
                        </p>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium mb-1">
                            <Clock className="h-3.5 w-3.5" /> Hora
                        </span>
                        <p className="font-semibold">
                            {new Date(purchase.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Comprobante adjunto almacenado localmente */}
                {purchase.document_file && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-9 w-9 rounded-md bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                <FileText className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{purchase.document_file.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    {(purchase.document_file.size / 1024).toFixed(1)} KB &bull; Adjunto offline listo para sincronizar
                                </p>
                            </div>
                        </div>
                        <a
                            href={purchase.document_file.base64}
                            download={purchase.document_file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-medium border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100/50">
                                <Eye className="h-3.5 w-3.5" /> Ver / Descargar
                            </Button>
                        </a>
                    </div>
                )}

                {/* Products Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 text-[11px]">
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-center w-[90px]">Cantidad</TableHead>
                                <TableHead className="text-right w-[110px]">C. Unitario</TableHead>
                                <TableHead className="text-right w-[110px]">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchase.lines.map((l, idx) => (
                                <TableRow key={idx} className="text-xs">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                            <div>
                                                <div className="font-semibold">{l.product_name}</div>
                                                {l.internal_code && (
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        Ref: {l.internal_code}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-semibold">{l.quantity}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {purchase.currency_code === 'USD' ? '$' : 'S/'} {Number(l.unit_cost).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold">
                                        {purchase.currency_code === 'USD' ? '$' : 'S/'} {Number(l.line_total).toFixed(2)}
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
                        <span>{purchase.currency_code === 'USD' ? '$' : 'S/'} {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-48 text-muted-foreground">
                        <span>IGV (18%):</span>
                        <span>{purchase.currency_code === 'USD' ? '$' : 'S/'} {tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-48 font-bold text-sm text-foreground border-t border-border pt-1">
                        <span>Total:</span>
                        <span>{purchase.currency_code === 'USD' ? '$' : 'S/'} {Number(purchase.total_amount).toFixed(2)}</span>
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
                            Descartar Compra Offline
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
