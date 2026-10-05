import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { 
    AlertTriangle, 
    ArrowLeft, 
    CheckCircle2, 
    XCircle, 
    ShieldAlert, 
    Building2, 
    Laptop, 
    User, 
    Clock, 
    RotateCcw, 
    Check, 
    AlertCircle, 
    Package, 
    FileText, 
    Pencil, 
    ArrowRightLeft,
    ShieldCheck,
    HelpCircle
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

const breadcrumbs = [
    { title: 'Sincronización', href: '#' },
    { title: 'Bandeja de Conflictos', href: '/conflicts' },
    { title: 'Detalle del Conflicto', href: '#' },
];

interface ConflictProps {
    conflict: {
        id: number;
        uuid: string;
        entity_type: string;
        entity_uuid: string;
        conflict_type: string;
        status: string;
        created_at: string;
        resolved_at?: string;
        resolution_notes?: string;
        client_state?: any;
        server_state?: any;
        sync_operation?: {
            id: number;
            user?: { id: number; name: string; email: string };
            device?: { id: number; device_name?: string; branch_id?: number };
            error_message?: string;
        };
        resolver?: { id: number; name: string; email: string };
    };
    serverContext: {
        branch?: { id: number; name: string; code: string } | null;
        products: Record<number, {
            id: number;
            name: string;
            primary_reference: string;
            status: string;
            price: number;
            current_physical_stock: number;
            current_available_stock: number;
        }>;
        customer?: {
            id: number;
            legal_name: string;
            document_number: string;
            status: string;
        } | null;
    };
}

export default function ConflictShow({ conflict, serverContext }: ConflictProps) {
    const isPending = conflict.status === 'PENDING' || conflict.status === 'UNRESOLVED';
    const clientState = conflict.client_state || {};
    const lines = clientState.lines || [];

    // Modal States
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [forceModalOpen, setForceModalOpen] = useState(false);
    const [correctModalOpen, setCorrectModalOpen] = useState(false);

    // Form inputs for modals
    const [rejectNotes, setRejectNotes] = useState('');
    const [forceNotes, setForceNotes] = useState('');
    const [correctNotes, setCorrectNotes] = useState('');
    const [correctedLines, setCorrectedLines] = useState<any[]>(
        lines.map((l: any) => ({ ...l, quantity: Number(l.quantity || 1) }))
    );
    const [processing, setProcessing] = useState(false);

    // Handlers
    const handleReject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectNotes.trim()) return;

        setProcessing(true);
        router.post(`/conflicts/${conflict.id}/reject`, {
            notes: rejectNotes,
        }, {
            onFinish: () => {
                setProcessing(false);
                setRejectModalOpen(false);
            },
        });
    };

    const handleForce = (e: React.FormEvent) => {
        e.preventDefault();
        if (!forceNotes.trim()) return;

        setProcessing(true);
        router.post(`/conflicts/${conflict.id}/force`, {
            notes: forceNotes,
        }, {
            onFinish: () => {
                setProcessing(false);
                setForceModalOpen(false);
            },
        });
    };

    const handleCorrect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!correctNotes.trim()) return;

        const newPayload = {
            ...clientState,
            lines: correctedLines,
        };

        setProcessing(true);
        router.post(`/conflicts/${conflict.id}/correct`, {
            payload: newPayload,
            notes: correctNotes,
        }, {
            onFinish: () => {
                setProcessing(false);
                setCorrectModalOpen(false);
            },
        });
    };

    const renderStatusBadge = () => {
        switch (conflict.status) {
            case 'PENDING':
            case 'UNRESOLVED':
                return (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1.5 font-bold text-xs px-3 py-1">
                        <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                        Conflicto Pendiente
                    </Badge>
                );
            case 'RESOLVED':
                return (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-bold text-xs px-3 py-1">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        Resuelto con Corrección
                    </Badge>
                );
            case 'RESOLVED_FORCE':
                return (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1.5 font-bold text-xs px-3 py-1">
                        <ShieldCheck className="size-3.5 text-blue-600" />
                        Excepción Autorizada y Regularizada
                    </Badge>
                );
            case 'REJECTED':
                return (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1.5 font-bold text-xs px-3 py-1">
                        <XCircle className="size-3.5 text-rose-600" />
                        Operación Rechazada
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{conflict.status}</Badge>;
        }
    };

    return (
        <>
            <Head title={`Conflicto de Sincronización #${conflict.id}`} />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-7xl mx-auto w-full">
                {/* Header Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/conflicts">
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                                <ArrowLeft className="size-3.5" /> Volver a la Bandeja
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Conflicto #{conflict.id} &bull; {conflict.entity_type}
                                </h1>
                                {renderStatusBadge()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                UUID: {conflict.uuid}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons if Pending */}
                    {isPending && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1.5 text-xs font-semibold shadow-xs"
                                onClick={() => setRejectModalOpen(true)}
                            >
                                <XCircle className="size-3.5" />
                                Rechazar Operación
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs font-semibold border-blue-500/30 hover:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                onClick={() => setCorrectModalOpen(true)}
                            >
                                <Pencil className="size-3.5" />
                                Corregir y Reprocesar
                            </Button>

                            <Button
                                variant="default"
                                size="sm"
                                className="gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                                onClick={() => setForceModalOpen(true)}
                            >
                                <ShieldCheck className="size-3.5" />
                                Autorizar Excepción (Kardex)
                            </Button>
                        </div>
                    )}
                </div>

                {/* Error Banner */}
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200 flex items-start gap-3 shadow-xs">
                    <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                        <div className="font-bold text-sm text-red-700 dark:text-red-300">
                            Motivo del Rechazo de Sincronización: {conflict.conflict_type}
                        </div>
                        <div className="mt-1 font-mono text-[11px] bg-background/50 p-2 rounded-md border border-red-500/20 text-foreground">
                            {conflict.server_state?.error || conflict.sync_operation?.error_message || 'El servidor rechazó la operación por violación de reglas de inventario o datos incompatibles.'}
                        </div>
                    </div>
                </div>

                {/* Side-by-Side Comparison Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Panel: Client / Local Offline State */}
                    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
                        <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
                            <span className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                                <Laptop className="size-4 text-primary" />
                                1. Estado Enviado por el Dispositivo (Offline)
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                                Local / Terminal
                            </Badge>
                        </div>

                        <div className="p-5 space-y-4 flex-1 text-xs">
                            {/* Device & User Info */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg border border-border/60">
                                <div>
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Cajero Emisor:</span>
                                    <span className="font-semibold text-foreground">{conflict.sync_operation?.user?.name || 'Usuario'}</span>
                                    <div className="text-[10px] text-muted-foreground">{conflict.sync_operation?.user?.email || '-'}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Dispositivo:</span>
                                    <span className="font-semibold text-foreground">{conflict.sync_operation?.device?.device_name || 'Terminal Local'}</span>
                                    <div className="text-[10px] text-muted-foreground">Fecha: {new Date(conflict.created_at).toLocaleString('es-PE')}</div>
                                </div>
                            </div>

                            {/* Sale / Operation Info */}
                            <div>
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">Datos de la Venta:</span>
                                <div className="space-y-1">
                                    <div className="flex justify-between py-1 border-b border-border/40">
                                        <span className="text-muted-foreground">Tipo de Comprobante:</span>
                                        <span className="font-semibold">{clientState.sale_type || clientState.document_type || 'BOLETA'}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-border/40">
                                        <span className="text-muted-foreground">Condición de Pago:</span>
                                        <span className="font-semibold">{clientState.payment_type || 'CASH (Contado)'}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-border/40">
                                        <span className="text-muted-foreground">Total Solicitado:</span>
                                        <span className="font-bold text-sm text-foreground">S/ {Number(clientState.total_amount || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Lines Table */}
                            <div>
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1.5">Ítems Solicitados en Terminal:</span>
                                <div className="border border-border/60 rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40">
                                                <TableHead className="text-[10px] font-bold">Producto</TableHead>
                                                <TableHead className="text-center text-[10px] font-bold">Cant. Local</TableHead>
                                                <TableHead className="text-right text-[10px] font-bold">P. Unit</TableHead>
                                                <TableHead className="text-right text-[10px] font-bold">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {lines.map((line: any, idx: number) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium text-xs">
                                                        {line.product_name || `Producto #${line.product_id}`}
                                                        <div className="text-[10px] text-muted-foreground font-mono">
                                                            {line.product_reference || '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-xs">
                                                        {line.quantity}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs">
                                                        S/ {Number(line.unit_price || 0).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-xs">
                                                        S/ {Number((line.quantity || 1) * (line.unit_price || 0)).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Server Reality State */}
                    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
                        <div className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
                            <span className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                                <Building2 className="size-4 text-emerald-600" />
                                2. Estado Real en el Servidor Central (Kardex)
                            </span>
                            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">
                                Base de Datos Central
                            </Badge>
                        </div>

                        <div className="p-5 space-y-4 flex-1 text-xs">
                            {/* Branch Info */}
                            <div className="p-3 bg-muted/20 rounded-lg border border-border/60">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Sucursal Evaluada:</span>
                                <span className="font-semibold text-sm text-foreground">
                                    {serverContext.branch?.name || `Sucursal #${clientState.branch_id || 1}`}
                                </span>
                                <div className="text-[10px] text-muted-foreground">
                                    Código: {serverContext.branch?.code || 'S/C'}
                                </div>
                            </div>

                            {/* Inventory Stock Verification Table */}
                            <div>
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1.5">
                                    Inventario y Kardex al Momento de la Sincronización:
                                </span>
                                <div className="border border-border/60 rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40">
                                                <TableHead className="text-[10px] font-bold">Producto en Servidor</TableHead>
                                                <TableHead className="text-center text-[10px] font-bold">Stock Físico</TableHead>
                                                <TableHead className="text-center text-[10px] font-bold">Stock Disponible</TableHead>
                                                <TableHead className="text-center text-[10px] font-bold">Diferencia</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {lines.map((line: any, idx: number) => {
                                                const pId = line.product_id;
                                                const serverProd = serverContext.products[pId];
                                                const available = serverProd ? serverProd.current_available_stock : 0;
                                                const requested = Number(line.quantity || 0);
                                                const diff = available - requested;
                                                const isDeficit = diff < 0;

                                                return (
                                                    <TableRow key={idx} className={isDeficit ? 'bg-red-500/5' : ''}>
                                                        <TableCell className="font-medium text-xs">
                                                            {serverProd?.name || line.product_name || `ID #${pId}`}
                                                            <div className="text-[10px] text-muted-foreground">
                                                                Estado: {serverProd?.status || 'No encontrado'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs">
                                                            {serverProd ? serverProd.current_physical_stock : 0}
                                                        </TableCell>
                                                        <TableCell className="text-center font-bold text-xs">
                                                            {available}
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs">
                                                            {isDeficit ? (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded font-bold text-xs bg-red-500/10 text-red-600 border border-red-500/30">
                                                                    {diff} (Faltante)
                                                                </span>
                                                            ) : (
                                                                <span className="text-emerald-600 font-bold">
                                                                    +{diff} (Conforme)
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Technical Resolution Explanation */}
                            <div className="p-3 rounded-lg border border-border/80 bg-background text-xs space-y-1">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                    <HelpCircle className="size-3.5 text-primary" /> Opciones de Resolución Disponibles:
                                </span>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-[11px] pt-1">
                                    <li>
                                        <strong>Rechazar:</strong> Si la venta no procede físicamente o el cliente no se llevó el producto.
                                    </li>
                                    <li>
                                        <strong>Corregir y Reprocesar:</strong> Modificar las cantidades o precios al stock real y sincronizar de nuevo.
                                    </li>
                                    <li>
                                        <strong>Autorizar Excepción:</strong> Si el cliente sí se llevó los repuestos físicamente (ej. ingreso de mercadería no ingresado a tiempo), el sistema regulariza Kardex y confirma la venta.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resolution Audit Card (if already resolved or rejected) */}
                {!isPending && (
                    <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
                        <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck className="size-5 text-primary" />
                            <h3 className="font-bold text-sm text-foreground">
                                Auditoría de Resolución del Conflicto
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div>
                                <span className="text-muted-foreground block text-[11px]">Resuelto / Decidido Por:</span>
                                <span className="font-semibold text-foreground">{conflict.resolver?.name || 'Administrador'}</span>
                                <div className="text-[10px] text-muted-foreground">{conflict.resolver?.email || '-'}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-[11px]">Fecha y Hora de Decisión:</span>
                                <span className="font-semibold text-foreground">
                                    {conflict.resolved_at ? new Date(conflict.resolved_at).toLocaleString('es-PE') : '-'}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-[11px]">Estado Definitivo:</span>
                                <div>{renderStatusBadge()}</div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border">
                            <span className="text-muted-foreground block text-[11px] font-semibold mb-1">
                                Notas y Justificación del Resolutor:
                            </span>
                            <p className="text-xs text-foreground bg-muted/30 p-3 rounded-md border border-border/60 whitespace-pre-line">
                                {conflict.resolution_notes || 'Sin notas registradas.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Rechazar Conflicto */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
                            <XCircle className="size-5" />
                            Rechazar y Descartar Operación
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Esta acción cancelará definitivamente la transacción offline. No se generarán movimientos en Kardex ni deudas.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleReject} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Justificación / Motivo del Rechazo (Obligatorio):
                            </label>
                            <Textarea
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                                placeholder="Ej: Se constató con la sucursal que el cliente canceló la compra o que el producto no fue despachado."
                                className="text-xs min-h-[90px]"
                                required
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setRejectModalOpen(false)}
                                disabled={processing}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                size="sm"
                                disabled={processing || rejectNotes.trim().length < 5}
                            >
                                {processing ? 'Procesando...' : 'Confirmar Rechazo'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Autorizar Excepción (Kardex) */}
            <Dialog open={forceModalOpen} onOpenChange={setForceModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
                            <ShieldCheck className="size-5" />
                            Autorizar Excepción y Regularizar en Kardex
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Si el cliente se llevó el producto físicamente, el sistema creará una entrada automática de regularización positiva en Kardex antes de confirmar la venta, garantizando la consistencia del inventario.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleForce} className="space-y-4 pt-2">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                            <div>
                                <strong>Nota de Auditoría:</strong> Su usuario quedará registrado como autorizador formal de la regularización de stock.
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Justificación de la Excepción (Obligatorio):
                            </label>
                            <Textarea
                                value={forceNotes}
                                onChange={(e) => setForceNotes(e.target.value)}
                                placeholder="Ej: Mercadería ingresada físicamente a tienda sin registro oportuno de compras. Se autoriza regularización tras arqueo físico."
                                className="text-xs min-h-[90px]"
                                required
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setForceModalOpen(false)}
                                disabled={processing}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                                size="sm"
                                disabled={processing || forceNotes.trim().length < 5}
                            >
                                {processing ? 'Regularizando...' : 'Autorizar y Procesar Venta'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Corregir Datos y Reprocesar */}
            <Dialog open={correctModalOpen} onOpenChange={setCorrectModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary">
                            <Pencil className="size-5" />
                            Corregir Datos de la Operación y Reprocesar
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Ajuste las cantidades o montos solicitados para adaptarse a la disponibilidad real y ejecute nuevamente la sincronización.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCorrect} className="space-y-4 pt-2">
                        <div className="border border-border rounded-lg overflow-hidden max-h-[220px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="text-xs">Producto</TableHead>
                                        <TableHead className="text-center text-xs w-[120px]">Cantidad Corregida</TableHead>
                                        <TableHead className="text-right text-xs w-[120px]">Precio Unitario</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {correctedLines.map((line, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="text-xs font-medium">
                                                {line.product_name || `ID #${line.product_id}`}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={line.quantity}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        const updated = [...correctedLines];
                                                        updated[idx].quantity = val;
                                                        setCorrectedLines(updated);
                                                    }}
                                                    className="h-8 text-xs text-center w-20 mx-auto"
                                                    required
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={line.unit_price}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        const updated = [...correctedLines];
                                                        updated[idx].unit_price = val;
                                                        setCorrectedLines(updated);
                                                    }}
                                                    className="h-8 text-xs text-right w-24 ml-auto"
                                                    required
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Justificación de la Corrección (Obligatorio):
                            </label>
                            <Textarea
                                value={correctNotes}
                                onChange={(e) => setCorrectNotes(e.target.value)}
                                placeholder="Ej: Se redujo la cantidad vendida a 1 unidad acorde al stock disponible tras acuerdo con el comprador."
                                className="text-xs min-h-[70px]"
                                required
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCorrectModalOpen(false)}
                                disabled={processing}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="default"
                                size="sm"
                                disabled={processing || correctNotes.trim().length < 5}
                            >
                                {processing ? 'Reprocesando...' : 'Guardar y Reprocesar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

ConflictShow.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
