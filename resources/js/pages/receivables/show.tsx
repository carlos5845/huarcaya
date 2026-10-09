import { Head, Link, router, useForm } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Landmark,
    ArrowLeft,
    Calendar,
    FileText,
    User,
    Undo2,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Clock,
    TrendingUp,
    Wallet,
    Receipt,
    Phone,
    MapPin,
    Building2,
    ExternalLink,
    Printer,
    Coins,
    CalendarClock,
    Info,
    CreditCard,
    DollarSign,
    Sparkles,
    ChevronDown,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { formatAppDate, getLocalDateString } from '@/lib/utils';
import { DocumentPreviewModal } from '@/components/document-preview-modal';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cuentas por Cobrar', href: '/receivables' },
    { title: 'Detalle de Deuda', href: '#' },
];

export default function ReceivableShow({ receivable, payment_methods }: { receivable: any; payment_methods: any[] }) {
    // Math calculations
    const originalAmount = parseFloat(receivable.original_amount || '0');
    const rawBalance = parseFloat(receivable.balance_amount || '0');
    const isZeroBalance = rawBalance < 0.01;
    const balanceAmount = isZeroBalance ? 0 : rawBalance;
    const isFullyPaid = receivable.status === 'PAID' || isZeroBalance;
    const paidAmount = isFullyPaid ? originalAmount : Math.max(0, originalAmount - balanceAmount);
    const paidPercentage = originalAmount > 0 ? (paidAmount / originalAmount) * 100 : 0;

    // Date and overdue status calculations
    const dueDate = receivable.due_date
        ? new Date(receivable.due_date.includes('T') ? receivable.due_date : `${receivable.due_date}T00:00:00`)
        : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysDifference = 0;
    let isOverdue = false;
    if (dueDate && !isFullyPaid) {
        const dueTime = new Date(dueDate).setHours(0, 0, 0, 0);
        const diffTime = dueTime - today.getTime();
        daysDifference = Math.round(diffTime / (1000 * 60 * 60 * 24));
        isOverdue = daysDifference < 0 && receivable.status === 'ACTIVE' && balanceAmount >= 0.01;
    }
    const daysOverdue = isOverdue ? Math.abs(daysDifference) : 0;
    const daysRemaining = daysDifference >= 0 ? daysDifference : 0;

    // Modals state
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [paymentToCancel, setPaymentToCancel] = useState<any | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCanceling, setIsCanceling] = useState(false);

    // Payment Form
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: balanceAmount > 0 ? balanceAmount.toFixed(2) : '0.00',
        payment_method_id: payment_methods && payment_methods.length > 0 ? payment_methods[0].id.toString() : '',
        operation_date: getLocalDateString(),
        notes: '',
    });

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/receivables/${receivable.id}/payments`, {
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                reset();
            },
        });
    };

    const confirmCancelPayment = () => {
        if (!paymentToCancel) return;
        setIsCanceling(true);
        router.post(
            `/receivables/${receivable.id}/payments/${paymentToCancel.id}/cancel`,
            {
                reason: cancelReason || 'Anulación por el usuario',
            },
            {
                onFinish: () => {
                    setIsCanceling(false);
                    setPaymentToCancel(null);
                    setCancelReason('');
                },
            }
        );
    };

    const formatMoney = (val: number | string) => {
        const num = typeof val === 'number' ? val : parseFloat(val || '0');
        const symbol = receivable.currency_code === 'USD' ? '$' : 'S/';
        return `${symbol} ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getInitials = (name?: string) => {
        if (!name) return 'CL';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
        return (words[0][0] + words[1][0]).toUpperCase();
    };

    const getMethodBadgeStyle = (name: string, isCash: boolean) => {
        const lower = name.toLowerCase();
        if (isCash || lower.includes('efectivo')) {
            return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
        }
        if (lower.includes('yape') || lower.includes('plin')) {
            return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
        }
        if (lower.includes('transf') || lower.includes('banco') || lower.includes('depósito')) {
            return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
        }
        if (lower.includes('tarjeta') || lower.includes('pos')) {
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
        }
        return 'bg-muted text-muted-foreground border-border';
    };

    const validAllocations = (receivable.allocations || []).filter((a: any) => a.payment?.status !== 'CANCELLED');
    const hasPayments = receivable.allocations && receivable.allocations.length > 0;

    return (
        <>
            <Head title={`Deuda - ${receivable.customer?.legal_name || 'Detalle'}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                    <div className="flex items-start sm:items-center gap-3">
                        <Link href="/receivables">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 shrink-0 rounded-xl hover:bg-muted transition-colors shadow-xs"
                                title="Volver a Cuentas por Cobrar"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <Coins className="h-6 w-6 text-primary" />
                                    Detalle de Cuenta por Cobrar
                                </h1>
                                {isFullyPaid ? (
                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 px-3 py-1 text-xs font-semibold">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Totalmente Cancelado
                                    </Badge>
                                ) : isOverdue ? (
                                    <Badge variant="destructive" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1.5 px-3 py-1 text-xs font-semibold animate-pulse">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Vencido ({daysOverdue} {daysOverdue === 1 ? 'día' : 'días'})
                                    </Badge>
                                ) : (
                                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1.5 px-3 py-1 text-xs font-semibold">
                                        <Clock className="w-3.5 h-3.5" /> Pendiente de Cobro
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                                <span>Ref: ID #{receivable.id}</span>
                                <span>•</span>
                                <span>Sucursal: <strong className="text-foreground font-medium">{receivable.branch?.name || 'Sede Principal'}</strong></span>
                                {receivable.sale && (
                                    <>
                                        <span>•</span>
                                        <span>Venta N° <strong className="text-foreground font-medium">{receivable.sale.sale_number}</strong></span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        {receivable.sale_id && (
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs font-medium">
                                            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>Imprimir</span>
                                            <ChevronDown className="h-3 w-3 opacity-60" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52 bg-popover text-popover-foreground border-border shadow-md">
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setPreviewUrl(`/sales/${receivable.sale_id}/print/ticket`);
                                                setIsPreviewOpen(true);
                                            }}
                                            className="cursor-pointer text-xs gap-2 font-medium"
                                        >
                                            <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                                            <span>Ticket Térmico (80 mm)</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setPreviewUrl(`/sales/${receivable.sale_id}/print/a4`);
                                                setIsPreviewOpen(true);
                                            }}
                                            className="cursor-pointer text-xs gap-2 font-medium"
                                        >
                                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                                            <span>Comprobante Completo (A4)</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Link href={`/sales/${receivable.sale_id}`}>
                                    <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs font-medium">
                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                        Ver Venta
                                    </Button>
                                </Link>
                            </>
                        )}
                        {receivable.status === 'ACTIVE' && !isFullyPaid && (
                            <Button
                                onClick={() => {
                                    setData('amount', balanceAmount.toFixed(2));
                                    setIsPaymentModalOpen(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 text-xs font-semibold shadow-xs transition-colors"
                            >
                                <Landmark className="h-4 w-4" /> Registrar Pago
                            </Button>
                        )}
                    </div>
                </div>

                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Monto Original */}
                    <Card className="border border-border/70 shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monto Original</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Receipt className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {formatMoney(originalAmount)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Emitido el {formatAppDate(receivable.issue_date)}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Total Amortizado */}
                    <Card className="border border-border/70 shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Amortizado</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {formatMoney(paidAmount)}
                            </div>
                            <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                                    <span>{paidPercentage.toFixed(1)}% liquidado</span>
                                    <span>{validAllocations.length} {validAllocations.length === 1 ? 'abono' : 'abonos'}</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, Math.max(0, paidPercentage))}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Saldo Pendiente */}
                    <Card className="border border-border/70 shadow-xs relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${!isFullyPaid && balanceAmount > 0 ? (isOverdue ? 'bg-rose-500/5' : 'bg-amber-500/5') : 'bg-emerald-500/5'} rounded-full -mr-8 -mt-8 pointer-events-none`} />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo Pendiente</span>
                            <div className={`p-2 rounded-xl ${!isFullyPaid && balanceAmount > 0 ? (isOverdue ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400') : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                <Wallet className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold tracking-tight font-mono ${!isFullyPaid && balanceAmount > 0 ? (isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400') : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {formatMoney(balanceAmount)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {isFullyPaid || balanceAmount <= 0 ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Deuda completamente saldada
                                    </span>
                                ) : (
                                    <span>{((balanceAmount / originalAmount) * 100).toFixed(1)}% restante por cobrar</span>
                                )}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Vencimiento */}
                    <Card className="border border-border/70 shadow-xs relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${isOverdue ? 'bg-rose-500/5' : isFullyPaid ? 'bg-emerald-500/5' : 'bg-purple-500/5'} rounded-full -mr-8 -mt-8 pointer-events-none`} />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vencimiento</span>
                            <div className={`p-2 rounded-xl ${isOverdue ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : isFullyPaid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}`}>
                                <CalendarClock className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold tracking-tight font-mono ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                                {formatAppDate(receivable.due_date)}
                            </div>
                            <p className="text-xs mt-1 font-medium">
                                {isFullyPaid ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Cancelado a tiempo
                                    </span>
                                ) : isOverdue ? (
                                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                        <AlertCircle className="h-3.5 w-3.5" /> Vencido hace {daysOverdue} {daysOverdue === 1 ? 'día' : 'días'}
                                    </span>
                                ) : daysRemaining === 0 ? (
                                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" /> Vence el día de hoy
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">
                                        Quedan {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} de plazo
                                    </span>
                                )}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Detail Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Datos del Cliente */}
                    <Card className="border border-border/70 shadow-xs">
                        <CardHeader className="pb-3 border-b border-border/40">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm tracking-wider shrink-0">
                                    {getInitials(receivable.customer?.legal_name)}
                                </div>
                                <div>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        Datos del Cliente (Deudor)
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Información de contacto y fiscal del deudor comercial.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3.5 text-sm">
                            <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/30">
                                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Razón Social / Nombre:</span>
                                <span className="font-semibold text-foreground text-right uppercase">
                                    {receivable.customer?.legal_name || 'Cliente no identificado'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/30">
                                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Documento de Identidad:</span>
                                <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5 bg-muted/40">
                                        {receivable.customer?.document_type || 'DOC'}
                                    </Badge>
                                    <span className="font-mono font-medium text-foreground">
                                        {receivable.customer?.document_number || '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/30">
                                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5" /> Teléfono / Celular:
                                </span>
                                {receivable.customer?.phone ? (
                                    <a
                                        href={`tel:${receivable.customer.phone}`}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {receivable.customer.phone}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground italic text-xs">No registrado</span>
                                )}
                            </div>

                            <div className="flex items-start justify-between gap-2">
                                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" /> Dirección:
                                </span>
                                <span className="text-foreground text-right text-xs max-w-[260px] line-clamp-2">
                                    {receivable.customer?.address || 'Sin dirección registrada'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Documento Origen */}
                    <Card className="border border-border/70 shadow-xs">
                        <CardHeader className="pb-3 border-b border-border/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            Documento y Crédito Origen
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Venta asociada y términos contractuales de la deuda.
                                        </CardDescription>
                                    </div>
                                </div>
                                {receivable.sale && (
                                    <Badge variant="secondary" className="font-semibold text-[11px] uppercase tracking-wider">
                                        {receivable.sale.external_document_type || 'VENTA'}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3.5 text-sm">
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/30">
                                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Comprobante de Venta:</span>
                                {receivable.sale ? (
                                    <Link
                                        href={`/sales/${receivable.sale_id}`}
                                        className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                                    >
                                        <span>{receivable.sale.sale_number}</span>
                                        {receivable.sale.external_document_series && (
                                            <span className="text-xs text-muted-foreground font-mono">
                                                ({receivable.sale.external_document_series}-{receivable.sale.external_document_number})
                                            </span>
                                        )}
                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Link>
                                ) : (
                                    <span className="text-muted-foreground italic text-xs">Venta externa / Manual</span>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/30">
                                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Fecha de Emisión:</span>
                                <span className="font-medium text-foreground">
                                    {formatAppDate(receivable.issue_date)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/30">
                                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Sucursal Emisora:</span>
                                <span className="font-medium text-foreground flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    {receivable.branch?.name || 'Sede Principal'}
                                </span>
                            </div>

                            <div className="flex items-start justify-between gap-2">
                                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Notas / Observaciones:</span>
                                <span className="text-foreground text-right text-xs max-w-[260px] italic">
                                    {receivable.notes || 'Sin observaciones registradas.'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Historial de Pagos y Amortizaciones */}
                <Card className="border border-border/70 shadow-xs">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg font-bold tracking-tight">
                                    Historial de Abonos y Amortizaciones
                                </CardTitle>
                                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                                    {validAllocations.length} {validAllocations.length === 1 ? 'registro' : 'registros'}
                                </Badge>
                            </div>
                            <CardDescription className="text-xs mt-0.5">
                                Registro cronológico de ingresos y amortizaciones aplicados al saldo.
                            </CardDescription>
                        </div>

                        {receivable.status === 'ACTIVE' && !isFullyPaid && (
                            <Button
                                onClick={() => {
                                    setData('amount', balanceAmount.toFixed(2));
                                    setIsPaymentModalOpen(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 text-xs font-semibold shadow-xs"
                            >
                                <Landmark className="h-4 w-4" /> Registrar Nuevo Pago
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        {hasPayments ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="w-12 text-center text-xs">#</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-wider">Fecha y Hora</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-wider">Recibo / Operación</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-wider">Método(s) de Pago</TableHead>
                                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Monto Amortizado</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-wider">Observaciones</TableHead>
                                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider w-28">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {receivable.allocations.map((alloc: any, idx: number) => {
                                            const isCancelled = alloc.payment?.status === 'CANCELLED';
                                            const methods = alloc.payment?.methodLines || alloc.payment?.method_lines || [];

                                            return (
                                                <TableRow key={alloc.id} className={isCancelled ? 'bg-muted/20 opacity-70' : 'hover:bg-muted/40'}>
                                                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                                                        {idx + 1}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 text-foreground">
                                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span>
                                                                {alloc.payment?.operation_date
                                                                    ? new Date(alloc.payment.operation_date).toLocaleString('es-PE', {
                                                                          day: '2-digit',
                                                                          month: '2-digit',
                                                                          year: 'numeric',
                                                                          hour: '2-digit',
                                                                          minute: '2-digit',
                                                                      })
                                                                    : '-'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/50">
                                                            {alloc.payment?.payment_number || `OP-#${alloc.payment_id}`}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            {methods.length > 0 ? (
                                                                methods.map((ml: any) => {
                                                                    const mName = ml.method?.name || 'Otro';
                                                                    const isCash = !!ml.method?.is_cash;
                                                                    return (
                                                                        <Badge
                                                                            key={ml.id || mName}
                                                                            variant="outline"
                                                                            className={`text-[11px] font-medium px-2 py-0.5 ${getMethodBadgeStyle(mName, isCash)}`}
                                                                        >
                                                                            {mName}
                                                                        </Badge>
                                                                    );
                                                                })
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">No especificado</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        <span
                                                            className={`font-mono text-sm font-bold ${
                                                                isCancelled
                                                                    ? 'line-through text-muted-foreground'
                                                                    : 'text-emerald-600 dark:text-emerald-400'
                                                            }`}
                                                        >
                                                            {!isCancelled && '+ '}{formatMoney(alloc.allocated_amount)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={alloc.payment?.notes || ''}>
                                                        {alloc.payment?.notes || <span className="italic">Sin notas</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {isCancelled ? (
                                                            <Badge variant="outline" className="text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-[10px] font-semibold">
                                                                Anulado
                                                            </Badge>
                                                        ) : (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setPaymentToCancel(alloc.payment);
                                                                    setCancelReason('');
                                                                }}
                                                                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium px-2"
                                                                title="Anular abono"
                                                            >
                                                                <Undo2 className="h-3.5 w-3.5 mr-1" /> Anular
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                                <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                                    <Receipt className="h-8 w-8" />
                                </div>
                                <h3 className="text-base font-semibold text-foreground">No se registran abonos aún</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                                    Esta cuenta por cobrar se encuentra pendiente sin amortizaciones previas registradas.
                                </p>
                                {receivable.status === 'ACTIVE' && (
                                    <Button
                                        onClick={() => {
                                            setData('amount', balanceAmount.toFixed(2));
                                            setIsPaymentModalOpen(true);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-semibold"
                                    >
                                        <Landmark className="h-4 w-4" /> Registrar Primer Abono
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal: Registrar Pago / Abono */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Landmark className="h-5 w-5 text-emerald-600" />
                            Registrar Abono a Deuda
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Aplica una amortización directa al saldo pendiente de esta cuenta.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Resumen del Saldo Actual */}
                    <div className="p-3 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                                Saldo Pendiente Actual
                            </span>
                            <span className="text-lg font-bold font-mono text-foreground">
                                {formatMoney(balanceAmount)}
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="text-xs h-8 font-medium"
                            onClick={() => setData('amount', balanceAmount.toFixed(2))}
                        >
                            Liquidar Todo
                        </Button>
                    </div>

                    <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-2">
                        <div className="grid gap-2">
                            <Label htmlFor="amount" className="text-xs font-semibold">
                                Monto a Pagar ({receivable.currency_code}) <span className="text-rose-500">*</span>
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm font-semibold">
                                    {receivable.currency_code === 'USD' ? '$' : 'S/'}
                                </span>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={balanceAmount.toFixed(2)}
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    className="pl-9 font-mono text-base font-semibold"
                                    required
                                />
                            </div>
                            <InputError message={errors.amount} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="payment_method_id" className="text-xs font-semibold">
                                Método de Pago <span className="text-rose-500">*</span>
                            </Label>
                            <Select
                                value={data.payment_method_id}
                                onValueChange={(v) => setData('payment_method_id', v)}
                            >
                                <SelectTrigger id="payment_method_id">
                                    <SelectValue placeholder="Selecciona un método" />
                                </SelectTrigger>
                                <SelectContent>
                                    {payment_methods?.map((pm) => (
                                        <SelectItem key={pm.id} value={pm.id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span>{pm.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.payment_method_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="operation_date" className="text-xs font-semibold">
                                Fecha de Operación <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="operation_date"
                                type="date"
                                value={data.operation_date}
                                onChange={(e) => setData('operation_date', e.target.value)}
                                required
                            />
                            <InputError message={errors.operation_date} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes" className="text-xs font-semibold">
                                Observaciones / N° Operación (Opcional)
                            </Label>
                            <Input
                                id="notes"
                                placeholder="Ej: Transferencia BCP N° 458921 o abono parcial"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                            />
                            <InputError message={errors.notes} />
                        </div>

                        <DialogFooter className="pt-2 gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPaymentModalOpen(false)}
                                disabled={processing}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing || parseFloat(data.amount || '0') <= 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                                {processing ? 'Procesando...' : 'Confirmar Abono'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Confirmación de Anulación de Abono */}
            <Dialog open={!!paymentToCancel} onOpenChange={(open) => !open && setPaymentToCancel(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Undo2 className="h-5 w-5" />
                            Anular Abono
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Esta acción revertirá la amortización del abono{' '}
                            <strong className="font-mono text-foreground font-semibold">
                                {paymentToCancel?.payment_number}
                            </strong>{' '}
                            por el monto de{' '}
                            <strong className="text-foreground font-semibold">
                                {paymentToCancel ? formatMoney(paymentToCancel.total_amount) : ''}
                            </strong>{' '}
                            y lo reintegrará al saldo pendiente de la deuda.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <Label htmlFor="cancel_reason" className="text-xs font-semibold">
                            Motivo de anulación <span className="text-rose-500">*</span>
                        </Label>
                        <Textarea
                            id="cancel_reason"
                            placeholder="Especifica el motivo de la anulación (ej. error de digitación, duplicado, etc.)"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPaymentToCancel(null)}
                            disabled={isCanceling}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmCancelPayment}
                            disabled={isCanceling}
                            className="bg-rose-600 hover:bg-rose-700 font-semibold"
                        >
                            {isCanceling ? 'Anulando...' : 'Confirmar Anulación'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Vista previa e impresión de ticket */}
            <DocumentPreviewModal
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                url={previewUrl}
                title="Ticket de Venta"
                subtitle={`Venta ${receivable.sale?.sale_number || ''}`}
            />
        </>
    );
}

ReceivableShow.layout = {
    breadcrumbs,
};
