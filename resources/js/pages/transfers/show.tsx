import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, 
    ArrowRight, 
    ArrowRightLeft, 
    PackageCheck, 
    Truck, 
    X, 
    AlertCircle, 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    FileText, 
    Box, 
    Check, 
    Printer, 
    Building2, 
    Store, 
    Package, 
    User, 
    Calendar, 
    Hash, 
    ShieldAlert,
    Info,
    Layers,
    Send,
    Receipt,
    ClipboardList,
    ChevronDown
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import { ReceiveModal } from './components/receive-modal';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Transferencias', href: '/transfers' },
    { title: 'Detalle de Transferencia', href: '#' },
];

export default function TransfersShow({ 
    transfer, 
    can_dispatch, 
    can_receive, 
    is_source, 
    is_destination 
}: {
    transfer: any;
    can_dispatch: boolean;
    can_receive: boolean;
    is_source: boolean;
    is_destination: boolean;
}) {
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

    useEffect(() => {
        // Polling cada 10 segundos para sincronizar estados si hay despachos o recepciones en curso
        const interval = setInterval(() => {
            router.reload({
                only: ['transfer', 'can_dispatch', 'can_receive'],
                preserveScroll: true,
                preserveState: true,
            });
        }, 10000);
        return () => clearInterval(interval);
    }, [transfer.id]);

    const cancelTransfer = () => {
        if (confirm('¿Estás seguro de cancelar esta transferencia? Si estaba en tránsito, el stock retornará al origen.')) {
            router.post(`/transfers/${transfer.id}/cancel`);
        }
    };

    const dispatchTransfer = () => {
        if (confirm('¿Estás seguro de despachar esta mercadería? Se descontará del inventario de origen inmediatamente.')) {
            router.post(`/transfers/${transfer.id}/shipments`);
        }
    };

    // Totales calculados
    const lines = transfer.lines || [];
    const totalItems = lines.length;
    const totalRequested = lines.reduce((acc: number, l: any) => acc + Number(l.requested_quantity || 0), 0);
    const totalShipped = lines.reduce((acc: number, l: any) => acc + Number(l.shipped_quantity || 0), 0);
    const totalReceived = lines.reduce((acc: number, l: any) => acc + Number(l.received_quantity || 0), 0);
    const totalDamaged = lines.reduce((acc: number, l: any) => acc + Number(l.damaged_quantity || 0), 0);
    const totalMissing = lines.reduce((acc: number, l: any) => acc + Number(l.missing_quantity || 0), 0);
    const hasAnyDiscrepancy = transfer.status === 'WITH_DISCREPANCY' || totalDamaged > 0 || totalMissing > 0;

    const formatDate = (dateStr?: string) => {
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
        switch (transfer.status) {
            case 'DRAFT':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Solicitado / Borrador
                    </div>
                );
            case 'IN_TRANSIT':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        En Tránsito
                    </div>
                );
            case 'COMPLETED':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Completado
                    </div>
                );
            case 'WITH_DISCREPANCY':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        Con Observaciones
                    </div>
                );
            case 'CANCELLED':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Cancelado
                    </div>
                );
            default:
                return <Badge variant="outline">{transfer.status}</Badge>;
        }
    };

    const renderStepper = () => {
        if (transfer.status === 'CANCELLED') {
            return (
                <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400 text-sm font-medium">
                    <div className="h-9 w-9 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                        <X className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <span className="font-semibold block text-base">Transferencia Cancelada</span>
                        <span className="text-xs opacity-80">El traslado fue anulado y el inventario permanece o retornó a la sucursal de origen.</span>
                    </div>
                </div>
            );
        }

        const steps = [
            { id: 'DRAFT', title: 'Solicitado', desc: 'Registro y creación', icon: FileText },
            { id: 'SHIPPED', title: 'Despachado', desc: 'Salida de origen', icon: Box },
            { id: 'IN_TRANSIT', title: 'En Tránsito', desc: 'Traslado físico', icon: Truck },
            { id: 'COMPLETED', title: transfer.status === 'WITH_DISCREPANCY' ? 'Con Observaciones' : 'Entregado', desc: 'Recepción en destino', icon: PackageCheck },
        ];

        let currentIndex = 0;
        if (transfer.status === 'SHIPPED') currentIndex = 1;
        if (transfer.status === 'IN_TRANSIT') currentIndex = 2;
        if (transfer.status === 'COMPLETED' || transfer.status === 'WITH_DISCREPANCY') currentIndex = 3;

        return (
            <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                            Línea de Tiempo del Traslado
                        </h2>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        Etapa {currentIndex + 1} de {steps.length}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentIndex || (index === currentIndex && currentIndex === steps.length - 1);
                        const isCurrent = index === currentIndex && currentIndex !== steps.length - 1;
                        const isPending = index > currentIndex;
                        const isDiscrepancyEnd = index === 3 && transfer.status === 'WITH_DISCREPANCY';
                        const StepIcon = step.icon;

                        let cardBorder = 'border-border/60 bg-muted/20 opacity-70';
                        let iconBox = 'bg-muted text-muted-foreground';
                        let badgeBg = 'bg-muted text-muted-foreground';
                        let badgeText = 'Pendiente';

                        if (isCompleted) {
                            if (isDiscrepancyEnd) {
                                cardBorder = 'border-orange-500/40 bg-orange-500/5';
                                iconBox = 'bg-orange-500 text-white';
                                badgeBg = 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30';
                                badgeText = 'Observado';
                            } else {
                                cardBorder = 'border-emerald-500/40 bg-emerald-500/5';
                                iconBox = 'bg-emerald-600 text-white';
                                badgeBg = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
                                badgeText = 'Completado';
                            }
                        } else if (isCurrent) {
                            cardBorder = 'border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20';
                            iconBox = 'bg-primary text-primary-foreground';
                            badgeBg = 'bg-primary/15 text-primary border border-primary/30';
                            badgeText = 'En Curso';
                        }

                        return (
                            <div 
                                key={step.id} 
                                className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${cardBorder}`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${iconBox}`}>
                                        {isCompleted && !isDiscrepancyEnd ? (
                                            <Check className="w-5 h-5" />
                                        ) : isDiscrepancyEnd ? (
                                            <AlertTriangle className="w-5 h-5" />
                                        ) : (
                                            <StepIcon className="w-5 h-5" />
                                        )}
                                    </div>
                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeBg}`}>
                                        {badgeText}
                                    </span>
                                </div>

                                <div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                                        Fase 0{index + 1}
                                    </div>
                                    <h4 className="text-sm font-bold text-foreground mb-0.5">
                                        {step.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDynamicNotice = () => {
        if (transfer.status === 'DRAFT') {
            if (is_source) {
                return (
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300">
                        <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                        <div className="text-sm">
                            <span className="font-semibold block text-foreground">Acción requerida en Sucursal Origen:</span>
                            Esta solicitud está pendiente de preparación y despacho. Revisa el listado de repuestos y presiona <strong>"Despachar Envío"</strong> cuando la mercadería esté lista para iniciar el traslado.
                        </div>
                    </div>
                );
            } else {
                return (
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/40 text-muted-foreground">
                        <Clock className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                        <div className="text-sm">
                            <span className="font-semibold block text-foreground">Solicitud enviada al Almacén de Origen:</span>
                            El almacén <strong>{transfer.source_branch?.name}</strong> está procesando la solicitud para preparar el despacho hacia tu sucursal.
                        </div>
                    </div>
                );
            }
        }

        if (transfer.status === 'IN_TRANSIT') {
            if (is_destination) {
                return (
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                        <div className="flex items-start gap-3">
                            <Truck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                            <div className="text-sm">
                                <span className="font-semibold block text-foreground">Mercadería en Camino hacia tu Sucursal:</span>
                                El envío <strong>#{transfer.transfer_number}</strong> está en ruta. Al recibir el vehículo o paquete, verifica el conteo físico y presiona <strong>"Confirmar Recepción"</strong> para ingresar el stock a tu inventario.
                            </div>
                        </div>
                        {can_receive && (
                            <Button 
                                onClick={() => setIsReceiveModalOpen(true)}
                                size="sm" 
                                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                            >
                                <PackageCheck className="h-4 w-4 mr-1.5" /> Confirmar Recepción
                            </Button>
                        )}
                    </div>
                );
            } else {
                return (
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300">
                        <Truck className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                        <div className="text-sm">
                            <span className="font-semibold block text-foreground">Despacho en Tránsito:</span>
                            La mercadería fue descontada de tu inventario y se encuentra viajando con destino a <strong>{transfer.destination_branch?.name}</strong>.
                        </div>
                    </div>
                );
            }
        }

        if (transfer.status === 'COMPLETED') {
            return (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-sm">
                        <span className="font-semibold block text-foreground">Transferencia Finalizada con Éxito:</span>
                        Todas las unidades fueron recibidas en destino y el inventario ha sido actualizado correctamente en ambas sucursales.
                    </div>
                </div>
            );
        }

        if (transfer.status === 'WITH_DISCREPANCY') {
            return (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-300">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
                    <div className="text-sm">
                        <span className="font-semibold block text-foreground">Transferencia Recibida con Observaciones:</span>
                        Se registraron discrepancias entre las cantidades enviadas y recibidas (productos dañados o faltantes). Consulta los detalles y notas registradas abajo.
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <>
            <Head title={`Transferencia #${transfer.transfer_number}`} />

            <ReceiveModal 
                isOpen={isReceiveModalOpen} 
                onClose={() => setIsReceiveModalOpen(false)} 
                transfer={transfer} 
            />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-4">
                            <Link href="/transfers">
                                <Button variant="outline" size="icon" className="h-9 w-9">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                        Transferencia #{transfer.transfer_number}
                                    </h1>
                                    {renderStatusBadge()}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Registrado el {formatDate(transfer.created_at)}
                                </p>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {transfer.status === 'DRAFT' && can_dispatch && (
                                <Button 
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" 
                                    onClick={dispatchTransfer}
                                >
                                    <Truck className="h-4 w-4 mr-2" /> Despachar Envío
                                </Button>
                            )}

                            {transfer.status === 'IN_TRANSIT' && can_receive && (
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs" 
                                    onClick={() => setIsReceiveModalOpen(true)}
                                >
                                    <PackageCheck className="h-4 w-4 mr-2" /> Confirmar Recepción
                                </Button>
                            )}

                            {(transfer.status === 'DRAFT' || transfer.status === 'IN_TRANSIT') && can_dispatch && (
                                <Button 
                                    variant="outline"
                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30"
                                    onClick={cancelTransfer}
                                >
                                    <X className="h-4 w-4 mr-2" /> Cancelar
                                </Button>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="gap-2 font-medium"
                                    >
                                        <Printer className="h-4 w-4 text-primary" />
                                        <span>Imprimir Documento</span>
                                        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[240px] bg-popover text-popover-foreground border-border shadow-md">
                                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Documentos de Traslado
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        onClick={() => window.open(`/transfers/${transfer.id}/print/internal?format=a4`, '_blank')}
                                        className="cursor-pointer text-xs py-2 gap-2"
                                    >
                                        <FileText className="h-4 w-4 text-blue-600" />
                                        <div>
                                            <div className="font-semibold text-foreground">Nota de Traslado (A4)</div>
                                            <div className="text-[10px] text-muted-foreground">Con firmas de almacén y chofer</div>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => window.open(`/transfers/${transfer.id}/print/internal?format=ticket`, '_blank')}
                                        className="cursor-pointer text-xs py-2 gap-2"
                                    >
                                        <Receipt className="h-4 w-4 text-emerald-600" />
                                        <div>
                                            <div className="font-semibold text-foreground">Ticket Térmico (80 mm)</div>
                                            <div className="text-[10px] text-muted-foreground">Para ticketeras de mostrador</div>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => window.open(`/transfers/${transfer.id}/print/picking`, '_blank')}
                                        className="cursor-pointer text-xs py-2 gap-2"
                                    >
                                        <ClipboardList className="h-4 w-4 text-amber-600" />
                                        <div>
                                            <div className="font-semibold text-foreground">Hoja de Picking</div>
                                            <div className="text-[10px] text-muted-foreground">Para recolección en estantería</div>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        onClick={() => window.open(`/transfers/${transfer.id}/print/guide`, '_blank')}
                                        className="cursor-pointer text-xs py-2 gap-2"
                                    >
                                        <Truck className="h-4 w-4 text-primary" />
                                        <div>
                                            <div className="font-semibold text-foreground">Guía de Remisión (SUNAT 09)</div>
                                            <div className="text-[10px] text-muted-foreground">Formato fiscal de carretera</div>
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Progress Stepper */}
                {renderStepper()}

                {/* Dynamic Notice Banner */}
                {renderDynamicNotice()}

                {/* Visual Route Flow Card */}
                <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Ruta de Transferencia entre Sucursales
                            </h3>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                            ID Ref: TRF-{transfer.id}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                        {/* Source Branch */}
                        <div className="md:col-span-3 p-4 rounded-xl border border-border bg-muted/20 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                                    Sucursal Origen (Emisor)
                                </span>
                                <h4 className="font-bold text-base text-foreground truncate">
                                    {transfer.source_branch?.name || 'Sucursal Principal'}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                    {transfer.source_branch?.address || 'Almacén central de despacho'}
                                </p>
                            </div>
                        </div>

                        {/* Flow Indicator */}
                        <div className="md:col-span-1 flex flex-col items-center justify-center py-2 text-muted-foreground">
                            <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-border bg-muted/50">
                                <ArrowRight className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground mt-1">
                                Traslado
                            </span>
                        </div>

                        {/* Destination Branch */}
                        <div className="md:col-span-3 p-4 rounded-xl border border-border bg-muted/20 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                <Store className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                                    Sucursal Destino (Receptor)
                                </span>
                                <h4 className="font-bold text-base text-foreground truncate">
                                    {transfer.destination_branch?.name || 'Sucursal Destino'}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                    {transfer.destination_branch?.address || 'Almacén receptor de entrada'}
                                </p>
                            </div>
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
                                <Layers className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">
                                {totalItems}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {totalItems === 1 ? 'producto' : 'productos'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Solicitado
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <FileText className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">
                                {totalRequested}
                            </span>
                            <span className="text-xs text-muted-foreground">unidades</span>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Despachado
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Truck className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">
                                {totalShipped}
                            </span>
                            <span className="text-xs text-muted-foreground">unidades</span>
                        </div>
                    </div>

                    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Recibido OK
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground">
                                {transfer.status === 'DRAFT' || transfer.status === 'IN_TRANSIT' ? '-' : totalReceived}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {transfer.status === 'DRAFT' || transfer.status === 'IN_TRANSIT' ? 'En espera' : 'unidades'}
                            </span>
                            {hasAnyDiscrepancy && (
                                <Badge variant="outline" className="ml-auto text-[10px] text-orange-600 border-orange-500/40 bg-orange-500/10">
                                    {(totalDamaged + totalMissing)} obs.
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content: Products Table + Observation Details */}
                <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            <div>
                                <h3 className="font-bold text-base text-foreground">
                                    Ítems y Repuestos Transferidos
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Detalle del inventario comprometido y verificado en la recepción
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-medium">
                                {lines.length} {lines.length === 1 ? 'ítem' : 'ítems'} registrados
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b border-border">
                                    <TableHead className="w-12 text-center text-xs font-semibold uppercase">#</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase">Código / Ref</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase">Producto / Descripción</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-center">Unidad</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-center">Solicitado</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-center">Despachado</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase text-center">Recibido OK</TableHead>
                                    {hasAnyDiscrepancy && (
                                        <>
                                            <TableHead className="text-xs font-semibold uppercase text-center text-orange-600 dark:text-orange-400">
                                                Dañado
                                            </TableHead>
                                            <TableHead className="text-xs font-semibold uppercase text-center text-rose-600 dark:text-rose-400">
                                                Faltante
                                            </TableHead>
                                        </>
                                    )}
                                    <TableHead className="text-xs font-semibold uppercase text-right">Estado Línea</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line: any, idx: number) => {
                                    const requested = Number(line.requested_quantity || 0);
                                    const shipped = Number(line.shipped_quantity || 0);
                                    const received = Number(line.received_quantity || 0);
                                    const damaged = Number(line.damaged_quantity || 0);
                                    const missing = Number(line.missing_quantity || 0);
                                    const lineDiscrepancy = damaged > 0 || missing > 0;

                                    return (
                                        <TableRow 
                                            key={line.id || idx}
                                            className={`border-b border-border/70 transition-colors ${
                                                lineDiscrepancy ? 'bg-orange-500/5 hover:bg-orange-500/10' : 'hover:bg-muted/30'
                                            }`}
                                        >
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
                                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-muted/50 border-border">
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
                                                    {requested}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                                    {shipped}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center font-bold">
                                                {transfer.status === 'DRAFT' || transfer.status === 'IN_TRANSIT' ? (
                                                    <span className="text-muted-foreground text-xs font-normal">-</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                                        {received}
                                                    </span>
                                                )}
                                            </TableCell>
                                            {hasAnyDiscrepancy && (
                                                <>
                                                    <TableCell className="text-center font-semibold">
                                                        {damaged > 0 ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                                                                {damaged}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold">
                                                        {missing > 0 ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                                {missing}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">-</span>
                                                        )}
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell className="text-right">
                                                {lineDiscrepancy ? (
                                                    <Badge variant="outline" className="text-[11px] border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/10">
                                                        Con Observación
                                                    </Badge>
                                                ) : transfer.status === 'COMPLETED' ? (
                                                    <Badge variant="outline" className="text-[11px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                                        Recibido OK
                                                    </Badge>
                                                ) : transfer.status === 'IN_TRANSIT' ? (
                                                    <Badge variant="outline" className="text-[11px] border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10">
                                                        En Tránsito
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                                        Solicitado
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                            {/* Table Totals Row */}
                            <tfoot className="bg-muted/40 font-semibold border-t-2 border-border text-xs">
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right py-3 text-muted-foreground">
                                        TOTALES:
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-foreground">
                                        {totalRequested}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-blue-600 dark:text-blue-400">
                                        {totalShipped}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-emerald-600 dark:text-emerald-400">
                                        {transfer.status === 'DRAFT' || transfer.status === 'IN_TRANSIT' ? '-' : totalReceived}
                                    </TableCell>
                                    {hasAnyDiscrepancy && (
                                        <>
                                            <TableCell className="text-center font-bold text-orange-600 dark:text-orange-400">
                                                {totalDamaged > 0 ? totalDamaged : '-'}
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-rose-600 dark:text-rose-400">
                                                {totalMissing > 0 ? totalMissing : '-'}
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell className="text-right text-muted-foreground font-normal">
                                        {lines.length} ítems
                                    </TableCell>
                                </TableRow>
                            </tfoot>
                        </Table>
                    </div>
                </div>

                {/* Additional Notes & Traceability Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Reception Observations Card (if exists) */}
                    {transfer.reception_notes ? (
                        <div className="p-5 rounded-xl border border-orange-500/40 bg-orange-500/5 text-card-foreground shadow-xs">
                            <div className="flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400 font-semibold text-sm">
                                <AlertCircle className="w-5 h-5" />
                                <h4>Observaciones Registradas en Recepción</h4>
                            </div>
                            <p className="text-sm text-foreground/90 whitespace-pre-line pl-7">
                                {transfer.reception_notes}
                            </p>
                        </div>
                    ) : (
                        <div className="p-5 rounded-xl border border-border bg-card text-card-foreground shadow-xs">
                            <div className="flex items-center gap-2 mb-2 text-muted-foreground font-semibold text-sm">
                                <Info className="w-4 h-4 text-primary" />
                                <h4>Observaciones de Recepción</h4>
                            </div>
                            <p className="text-sm text-muted-foreground italic pl-6">
                                {transfer.status === 'COMPLETED' 
                                    ? 'La mercadería fue recibida conforme sin notas de discrepancia.' 
                                    : 'Aún no se han registrado observaciones de recepción.'}
                            </p>
                        </div>
                    )}

                    {/* Transfer General Motive / Notes */}
                    <div className="p-5 rounded-xl border border-border bg-card text-card-foreground shadow-xs">
                        <div className="flex items-center gap-2 mb-2 text-muted-foreground font-semibold text-sm">
                            <FileText className="w-4 h-4 text-primary" />
                            <h4>Notas / Motivo del Traslado</h4>
                        </div>
                        <p className="text-sm text-foreground/90 whitespace-pre-line pl-6">
                            {transfer.notes || <span className="text-muted-foreground italic">Sin notas registradas para esta transferencia.</span>}
                        </p>
                        
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground pl-6">
                            <span>Solicitado por: <strong>{transfer.creator?.name || 'Usuario del Sistema'}</strong></span>
                            <span>Actualizado: {formatDate(transfer.updated_at)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

TransfersShow.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
