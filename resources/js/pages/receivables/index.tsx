import { Head, Link, useForm, router } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Search, 
    Eye, 
    AlertTriangle, 
    CalendarClock, 
    Users, 
    Coins, 
    Plus, 
    Phone, 
    Building2, 
    CreditCard, 
    CheckCircle2, 
    AlertCircle,
    Calendar,
    FileText,
    ArrowRight,
    BarChart3,
    Printer,
    Download,
    TrendingUp,
    Wallet
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { getLocalDateString } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cuentas por Cobrar', href: '/receivables' },
];

interface ReceivableItem {
    id: number;
    uuid: string;
    branch_id: number;
    customer_id: number;
    sale_id: number | null;
    issue_date: string;
    due_date: string | null;
    currency_code: string;
    original_amount: string | number;
    balance_amount: string | number;
    status: string;
    notes: string | null;
    paid_amount: number;
    paid_percentage: number;
    is_overdue: boolean;
    days_overdue: number;
    days_remaining: number;
    customer: {
        id: number;
        legal_name: string;
        document_type: string;
        document_number: string;
        phone: string | null;
        address: string | null;
    };
    sale?: {
        id: number;
        sale_number: string;
        external_document_type: string;
        external_document_series: string | null;
        external_document_number: string | null;
    };
    branch?: {
        id: number;
        name: string;
    };
}

interface CustomerSummaryItem {
    customer_id: number;
    legal_name: string;
    document_type: string;
    document_number: string;
    phone: string | null;
    address: string | null;
    invoices_count: number;
    total_debt_pen: number;
    total_debt_usd: number;
    paid_total_pen: number;
    overdue_debt_pen: number;
    has_overdue: boolean;
    earliest_due_date: string | null;
}

interface ReportData {
    period: 'daily' | 'weekly' | 'monthly' | 'custom';
    period_label: string;
    start_date: string;
    end_date: string;
    report_date: string;
    report_month: string;
    report_from: string;
    report_to: string;
    total_collected_pen: number;
    total_collected_usd: number;
    collected_count: number;
    total_new_debt_pen: number;
    total_new_debt_usd: number;
    new_debts_count: number;
    total_matured_debt_pen: number;
    matured_count: number;
    methods_breakdown: Array<{
        method_name: string;
        is_cash: boolean;
        amount_pen: number;
        amount_usd: number;
        count: number;
    }>;
    payments: Array<{
        id: number;
        payment_number: string;
        operation_date: string;
        customer_name: string;
        customer_doc: string;
        currency_code: string;
        total_amount: number;
        collector_name: string;
        branch_name: string;
        payment_methods: string[];
        related_sales: string[];
        notes: string | null;
    }>;
}

interface Props {
    receivables: {
        data: ReceivableItem[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    customers_summary: CustomerSummaryItem[];
    payment_methods: any[];
    branches: { id: number; name: string }[];
    report_data?: ReportData;
    filters: {
        search: string;
        status: string;
        branch_id: string;
        report_period?: string;
        report_date?: string;
        report_month?: string;
        report_from?: string;
        report_to?: string;
    };
    metrics: {
        total_active_debt_pen: number;
        total_active_debt_usd: number;
        total_overdue_debt_pen: number;
        total_overdue_debt_usd: number;
        overdue_count: number;
        total_current_debt_pen: number;
        total_current_debt_usd: number;
        current_count: number;
        total_paid_count: number;
        debtor_customers_count: number;
    };
}

export default function ReceivablesIndex({ receivables, customers_summary, payment_methods, branches, report_data, filters, metrics }: Props) {
    const { data, setData, get } = useForm({
        search: filters.search || '',
        status: filters.status || 'ACTIVE',
        branch_id: filters.branch_id || '',
    });

    const [activeTab, setActiveTab] = useState(filters.report_period ? 'reports' : 'receivables');

    // Report Period Filter states
    const [reportPeriod, setReportPeriod] = useState(filters.report_period || 'daily');
    const [reportDate, setReportDate] = useState(filters.report_date || getLocalDateString());
    const [reportMonth, setReportMonth] = useState(filters.report_month || new Date().toISOString().substring(0, 7));
    const [reportFrom, setReportFrom] = useState(filters.report_from || '');
    const [reportTo, setReportTo] = useState(filters.report_to || '');

    const applyReportFilter = (newPeriod: string, dateVal?: string, monthVal?: string, fromVal?: string, toVal?: string) => {
        setReportPeriod(newPeriod);
        router.get('/receivables', {
            search: data.search,
            status: data.status,
            branch_id: data.branch_id,
            report_period: newPeriod,
            report_date: dateVal ?? reportDate,
            report_month: monthVal ?? reportMonth,
            report_from: fromVal ?? reportFrom,
            report_to: toVal ?? reportTo,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const exportReportCsv = () => {
        if (!report_data?.payments || report_data.payments.length === 0) return;
        const headers = ['Nro Pago', 'Fecha', 'Cliente', 'Documento', 'Moneda', 'Monto', 'Metodo', 'Venta Relacionada', 'Cobrado Por', 'Notas'];
        const rows = report_data.payments.map(p => [
            `"${p.payment_number}"`,
            `"${p.operation_date}"`,
            `"${p.customer_name}"`,
            `"${p.customer_doc}"`,
            `"${p.currency_code}"`,
            p.total_amount.toFixed(2),
            `"${p.payment_methods.join(', ')}"`,
            `"${p.related_sales.join(', ')}"`,
            `"${p.collector_name}"`,
            `"${(p.notes || '').replace(/"/g, '""')}"`,
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `reporte_cobranzas_${reportPeriod}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Quick Payment Modal state
    const [selectedReceivable, setSelectedReceivable] = useState<ReceivableItem | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const paymentForm = useForm({
        amount: '',
        payment_method_id: payment_methods && payment_methods.length > 0 ? payment_methods[0].id.toString() : '',
        operation_date: getLocalDateString(),
        notes: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        get('/receivables', {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const openQuickPayment = (receivable: ReceivableItem) => {
        setSelectedReceivable(receivable);
        paymentForm.setData({
            amount: parseFloat(receivable.balance_amount.toString()).toFixed(2),
            payment_method_id: payment_methods && payment_methods.length > 0 ? payment_methods[0].id.toString() : '',
            operation_date: getLocalDateString(),
            notes: '',
        });
        setIsPaymentModalOpen(true);
    };

    const submitQuickPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReceivable) return;

        paymentForm.post(`/receivables/${selectedReceivable.id}/payments`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                setSelectedReceivable(null);
                paymentForm.reset();
            },
        });
    };

    const filterByCustomer = (customerName: string) => {
        setData('search', customerName);
        setActiveTab('receivables');
        router.get('/receivables', {
            search: customerName,
            status: data.status,
            branch_id: data.branch_id,
        }, { preserveState: true, preserveScroll: true });
    };

    return (
        <>
            <Head title="Cuentas por Cobrar y Cartera" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-7xl mx-auto w-full">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            Cuentas por Cobrar y Cartera
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Control de ventas al crédito, amortizaciones, deudas vencidas y crédito comercial recurrente.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/sales/create">
                            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                                <Plus className="h-4 w-4" /> Nueva Venta
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Top Financial KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Cartera Total por Cobrar */}
                    <Card className="border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Cartera Total por Cobrar
                            </CardTitle>
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                <Coins className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <div className="text-2xl font-extrabold text-foreground">
                                S/ {metrics.total_active_debt_pen.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {metrics.total_active_debt_usd > 0 && (
                                <div className="text-xs font-semibold text-muted-foreground">
                                    + $ {metrics.total_active_debt_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </div>
                            )}
                            <p className="text-[11px] text-muted-foreground">
                                Saldo deudor activo acumulado
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 2: Deuda Vencida en Mora */}
                    <Card className={`border shadow-xs ${metrics.overdue_count > 0 ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900' : ''}`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                                Deudas Vencidas en Mora
                            </CardTitle>
                            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                                S/ {metrics.total_overdue_debt_pen.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
                                    {metrics.overdue_count} comprobante(s) vencido(s)
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Excedieron la fecha límite pactada
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 3: Por Vencer (Al Día) */}
                    <Card className="border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Por Vencer (Al Día)
                            </CardTitle>
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                <CalendarClock className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <div className="text-2xl font-extrabold text-foreground">
                                S/ {metrics.total_current_debt_pen.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                {metrics.current_count} crédito(s) vigentes
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Dentro del plazo legal pactado
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 4: Clientes en Cartera */}
                    <Card className="border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Clientes Deudores
                            </CardTitle>
                            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                                <Users className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <div className="text-2xl font-extrabold text-foreground">
                                {metrics.debtor_customers_count}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {metrics.total_paid_count} cuenta(s) canceladas
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Talleres, transportes y corporativos
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <Card className="border shadow-xs">
                    <CardContent className="p-4">
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Buscar por cliente, DNI/RUC, teléfono o comprobante..." 
                                    className="pl-9 h-10" 
                                    value={data.search}
                                    onChange={e => setData('search', e.target.value)}
                                />
                            </div>

                            <div className="w-full md:w-56">
                                <Select value={data.status} onValueChange={(v) => { setData('status', v); }}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Estado de Deuda" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Activas (Con saldo)</SelectItem>
                                        <SelectItem value="OVERDUE">🚨 Solo Vencidas en Mora</SelectItem>
                                        <SelectItem value="CURRENT">✅ Al Día / Por Vencer</SelectItem>
                                        <SelectItem value="PAID">💰 Canceladas / Historial</SelectItem>
                                        <SelectItem value="ALL">Todos los Registros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {branches && branches.length > 1 && (
                                <div className="w-full md:w-48">
                                    <Select value={data.branch_id} onValueChange={(v) => setData('branch_id', v)}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Sucursal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Todas las sucursales</SelectItem>
                                            {branches.map(b => (
                                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <Button type="submit" className="h-10 px-5">
                                Filtrar
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Tabs: Por Comprobante vs Por Cliente (Crédito Comercial) */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <TabsList className="bg-muted p-1">
                            <TabsTrigger value="receivables" className="gap-2 text-xs sm:text-sm">
                                <FileText className="h-4 w-4" /> Comprobantes por Cobrar ({receivables.total})
                            </TabsTrigger>
                            <TabsTrigger value="customers" className="gap-2 text-xs sm:text-sm">
                                <Building2 className="h-4 w-4" /> Cartera por Cliente ({customers_summary.length})
                            </TabsTrigger>
                            <TabsTrigger value="reports" className="gap-2 text-xs sm:text-sm">
                                <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Reportes de Cobranza
                            </TabsTrigger>
                        </TabsList>

                        <div className="text-xs text-muted-foreground hidden sm:block">
                            {activeTab === 'receivables' 
                                ? 'Visualizando detalle por factura, boleta o nota al crédito' 
                                : activeTab === 'customers'
                                ? 'Líneas de crédito y deuda consolidada por cliente recurrente'
                                : `Auditoría y recaudación de cobranzas: ${report_data?.period_label || 'Período actual'}`}
                        </div>
                    </div>

                    {/* TAB 1: DETALLE POR COMPROBANTE */}
                    <TabsContent value="receivables" className="space-y-4 m-0">
                        <Card className="border shadow-xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-28">Emisión</TableHead>
                                            <TableHead className="w-40">Vencimiento & Plazo</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Comprobante</TableHead>
                                            <TableHead className="text-right">Total Venta</TableHead>
                                            <TableHead className="text-right w-44">Amortizado / Pagado</TableHead>
                                            <TableHead className="text-right">Saldo Pendiente</TableHead>
                                            <TableHead className="text-center">Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {receivables.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                                                        <div className="font-medium text-base text-foreground">No se encontraron cuentas por cobrar</div>
                                                        <p className="text-xs text-muted-foreground max-w-md">
                                                            No hay comprobantes pendientes que coincidan con los filtros seleccionados. Las ventas registradas "Al Crédito" aparecerán aquí automáticamente con su saldo y plazo.
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            receivables.data.map((r) => {
                                                const origAmount = parseFloat(r.original_amount.toString());
                                                const balAmount = parseFloat(r.balance_amount.toString());
                                                const isPaid = r.status === 'PAID' || balAmount < 0.01;
                                                const effectiveBalAmount = isPaid ? 0 : balAmount;
                                                const paidAmount = isPaid ? origAmount : r.paid_amount;
                                                const curr = r.currency_code === 'USD' ? '$' : 'S/';
                                                const isOverdue = r.is_overdue && !isPaid;

                                                return (
                                                    <TableRow key={r.id} className={isOverdue ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}>
                                                        {/* Emisión */}
                                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                                            {new Date(r.issue_date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </TableCell>

                                                        {/* Vencimiento & Plazo */}
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <div className="text-xs font-semibold text-foreground">
                                                                    {r.due_date ? new Date(r.due_date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sin plazo'}
                                                                </div>
                                                                {isPaid ? (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0 font-medium">
                                                                        Cancelado
                                                                    </Badge>
                                                                ) : isOverdue ? (
                                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-semibold gap-1 bg-rose-600">
                                                                        <AlertCircle className="h-2.5 w-2.5" /> Vencida ({r.days_overdue}d)
                                                                    </Badge>
                                                                ) : r.status === 'ACTIVE' && r.due_date ? (
                                                                    r.days_remaining === 0 ? (
                                                                        <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 font-medium">
                                                                            Vence hoy
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0 font-medium border border-blue-200">
                                                                            Vence en {r.days_remaining}d
                                                                        </Badge>
                                                                    )
                                                                ) : null}
                                                            </div>
                                                        </TableCell>

                                                        {/* Cliente */}
                                                        <TableCell>
                                                            <div className="space-y-0.5">
                                                                <div className="font-semibold text-sm text-foreground hover:text-blue-600 transition-colors">
                                                                    {r.customer.legal_name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                                    <span>{r.customer.document_type}: {r.customer.document_number}</span>
                                                                    {r.customer.phone && (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                                                                            <Phone className="h-2.5 w-2.5" /> {r.customer.phone}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Comprobante */}
                                                        <TableCell>
                                                            {r.sale ? (
                                                                <Link href={`/sales/${r.sale_id}`} className="group block">
                                                                    <div className="text-xs font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
                                                                        {r.sale.sale_number}
                                                                    </div>
                                                                    <div className="text-[11px] text-muted-foreground">
                                                                        {r.sale.external_document_type}
                                                                        {r.sale.external_document_series ? ` ${r.sale.external_document_series}-${r.sale.external_document_number}` : ''}
                                                                    </div>
                                                                </Link>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">Manual</span>
                                                            )}
                                                        </TableCell>

                                                        {/* Total Venta */}
                                                        <TableCell className="text-right text-sm font-medium text-foreground">
                                                            {curr} {origAmount.toFixed(2)}
                                                        </TableCell>

                                                        {/* Amortizado / Pagado con barra de progreso */}
                                                        <TableCell className="text-right">
                                                            <div className="space-y-1">
                                                                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    {curr} {paidAmount.toFixed(2)}
                                                                </div>
                                                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                                    <div 
                                                                        className="bg-emerald-500 h-1.5 rounded-full transition-all" 
                                                                        style={{ width: `${isPaid ? 100 : Math.min(100, r.paid_percentage)}%` }} 
                                                                    />
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {isPaid ? 100 : r.paid_percentage}% cubierto
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Saldo Pendiente */}
                                                        <TableCell className="text-right">
                                                            <div className={`text-base font-extrabold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : effectiveBalAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                                                                {curr} {effectiveBalAmount.toFixed(2)}
                                                            </div>
                                                        </TableCell>

                                                        {/* Estado */}
                                                        <TableCell className="text-center">
                                                            {isPaid ? (
                                                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-medium">
                                                                    Pagado Total
                                                                </Badge>
                                                            ) : r.paid_amount > 0 ? (
                                                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-medium">
                                                                    Amortizado Parcial
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-muted text-foreground font-medium">
                                                                    Pendiente (0%)
                                                                </Badge>
                                                            )}
                                                        </TableCell>

                                                        {/* Acciones */}
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {r.status === 'ACTIVE' && !isPaid && effectiveBalAmount > 0 && (
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm" 
                                                                        onClick={() => openQuickPayment(r)}
                                                                        className="h-8 px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                                                    >
                                                                        <Coins className="h-3 w-3 mr-1" /> Cobrar
                                                                    </Button>
                                                                )}
                                                                <Link href={`/receivables/${r.id}`}>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* TAB 2: RESUMEN POR CLIENTE (CRÉDITO COMERCIAL RECURRENTE) */}
                    <TabsContent value="customers" className="space-y-4 m-0">
                        <Card className="border shadow-xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Cliente / Razón Social</TableHead>
                                            <TableHead>Documento & Contacto</TableHead>
                                            <TableHead className="text-center">Comprobantes Pendientes</TableHead>
                                            <TableHead className="text-right">Total Deuda Acumulada</TableHead>
                                            <TableHead className="text-right">Saldo en Mora</TableHead>
                                            <TableHead>Próximo Vencimiento</TableHead>
                                            <TableHead className="text-center">Condición</TableHead>
                                            <TableHead className="text-right">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customers_summary.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Building2 className="h-8 w-8 text-muted-foreground/50" />
                                                        <div className="font-medium text-base text-foreground">No hay clientes con saldos pendientes</div>
                                                        <p className="text-xs text-muted-foreground max-w-md">
                                                            Aquí se consolidarán los talleres mecánicos, empresas de transporte y clientes habituales que manejen líneas de crédito comercial abiertas a 15, 30 o 45 días.
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            customers_summary.map((c) => (
                                                <TableRow key={c.customer_id} className={c.has_overdue ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}>
                                                    <TableCell>
                                                        <div className="font-bold text-sm text-foreground">
                                                            {c.legal_name}
                                                        </div>
                                                        {c.address && (
                                                            <div className="text-xs text-muted-foreground truncate max-w-xs">
                                                                {c.address}
                                                            </div>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="text-xs text-foreground font-mono">
                                                            {c.document_type}: {c.document_number}
                                                        </div>
                                                        {c.phone && (
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Phone className="h-2.5 w-2.5" /> {c.phone}
                                                            </div>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="font-semibold text-xs">
                                                            {c.invoices_count} documento(s)
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="text-right font-extrabold text-base text-foreground">
                                                        S/ {c.total_debt_pen.toFixed(2)}
                                                        {c.total_debt_usd > 0 && (
                                                            <div className="text-xs text-muted-foreground font-semibold">
                                                                + $ {c.total_debt_usd.toFixed(2)}
                                                            </div>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">
                                                        {c.overdue_debt_pen > 0 ? `S/ ${c.overdue_debt_pen.toFixed(2)}` : 'S/ 0.00'}
                                                    </TableCell>

                                                    <TableCell>
                                                        {c.earliest_due_date ? (
                                                            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                                {new Date(c.earliest_due_date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Sin fecha</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {c.has_overdue ? (
                                                            <Badge variant="destructive" className="bg-rose-600 font-semibold text-xs gap-1">
                                                                <AlertCircle className="h-3 w-3" /> EN MORA
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs gap-1">
                                                                <CheckCircle2 className="h-3 w-3" /> AL DÍA
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => filterByCustomer(c.legal_name)}
                                                            className="text-xs h-8 gap-1"
                                                        >
                                                            Ver Facturas <ArrowRight className="h-3 w-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* TAB 3: REPORTES DE COBRANZA (DIARIO, SEMANAL, MENSUAL) */}
                    <TabsContent value="reports" className="space-y-5 m-0">
                        {/* Selector de Períodos y Acciones */}
                        <Card className="border shadow-xs">
                            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4 text-purple-600" /> Período:
                                    </span>
                                    
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={reportPeriod === 'daily' ? 'default' : 'outline'}
                                        onClick={() => applyReportFilter('daily', getLocalDateString())}
                                        className="h-8 text-xs font-medium"
                                    >
                                        Diario (Hoy)
                                    </Button>

                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={reportPeriod === 'weekly' ? 'default' : 'outline'}
                                        onClick={() => applyReportFilter('weekly')}
                                        className="h-8 text-xs font-medium"
                                    >
                                        Semanal (Esta Semana)
                                    </Button>

                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={reportPeriod === 'monthly' ? 'default' : 'outline'}
                                        onClick={() => applyReportFilter('monthly', undefined, new Date().toISOString().substring(0, 7))}
                                        className="h-8 text-xs font-medium"
                                    >
                                        Mensual (Este Mes)
                                    </Button>

                                    {/* Selector de fecha puntual si es diario */}
                                    {reportPeriod === 'daily' && (
                                        <div className="flex items-center gap-1.5 ml-2">
                                            <span className="text-[11px] text-muted-foreground">Fecha:</span>
                                            <Input
                                                type="date"
                                                value={reportDate}
                                                onChange={(e) => {
                                                    setReportDate(e.target.value);
                                                    applyReportFilter('daily', e.target.value);
                                                }}
                                                className="h-8 text-xs w-36"
                                            />
                                        </div>
                                    )}

                                    {/* Selector de mes si es mensual */}
                                    {reportPeriod === 'monthly' && (
                                        <div className="flex items-center gap-1.5 ml-2">
                                            <span className="text-[11px] text-muted-foreground">Mes:</span>
                                            <Input
                                                type="month"
                                                value={reportMonth}
                                                onChange={(e) => {
                                                    setReportMonth(e.target.value);
                                                    applyReportFilter('monthly', undefined, e.target.value);
                                                }}
                                                className="h-8 text-xs w-36"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-auto">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={exportReportCsv}
                                        disabled={!report_data?.payments || report_data.payments.length === 0}
                                        className="h-8 text-xs gap-1.5"
                                    >
                                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Exportar CSV</span>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.print()}
                                        className="h-8 text-xs gap-1.5"
                                    >
                                        <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Imprimir</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Banner del Período Activo */}
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 text-purple-900 dark:text-purple-300">
                            <div className="flex items-center gap-2.5">
                                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider">
                                        Reporte de Recaudación y Cobranzas
                                    </div>
                                    <div className="text-sm font-semibold">
                                        {report_data?.period_label || 'Período Activo'}
                                    </div>
                                </div>
                            </div>
                            <Badge className="bg-purple-600 text-white font-mono text-xs px-2.5 py-0.5">
                                {report_data?.collected_count || 0} operaciones registradas
                            </Badge>
                        </div>

                        {/* KPIs del Período */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border shadow-xs bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                                        Total Recaudado (Cobros)
                                    </CardTitle>
                                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                        <Coins className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                                        S/ {report_data?.total_collected_pen.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </div>
                                    {report_data?.total_collected_usd && report_data.total_collected_usd > 0 ? (
                                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                            $ {report_data.total_collected_usd.toFixed(2)} USD
                                        </div>
                                    ) : null}
                                    <p className="text-[11px] text-muted-foreground">
                                        Dinero real ingresado en amortizaciones
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-xs">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Cobros Realizados
                                    </CardTitle>
                                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <div className="text-2xl font-extrabold text-foreground">
                                        {report_data?.collected_count || 0}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Recibos de abono confirmados
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-xs">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Nuevos Créditos Emitidos
                                    </CardTitle>
                                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <div className="text-2xl font-extrabold text-foreground">
                                        S/ {report_data?.total_new_debt_pen.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {report_data?.new_debts_count || 0} comprobante(s) a crédito
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-xs">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                                        Vencidas en el Período
                                    </CardTitle>
                                    <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                                        S/ {report_data?.total_matured_debt_pen.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </div>
                                    <div className="text-xs text-rose-600 dark:text-rose-400">
                                        {report_data?.matured_count || 0} deudas cumplieron fecha límite
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Desglose por Medio de Pago */}
                        {report_data?.methods_breakdown && report_data.methods_breakdown.length > 0 && (
                            <Card className="border shadow-xs">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Wallet className="h-4 w-4 text-primary" /> Recaudación por Método de Pago
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {report_data.methods_breakdown.map((mb, idx) => (
                                            <div key={idx} className="p-3 rounded-lg bg-muted/60 border border-border/80 flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-semibold text-foreground block">
                                                        {mb.method_name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {mb.count} transacción(es)
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-sm text-foreground block font-mono">
                                                        S/ {mb.amount_pen.toFixed(2)}
                                                    </span>
                                                    {mb.amount_usd > 0 && (
                                                        <span className="text-[10px] text-muted-foreground block font-mono">
                                                            $ {mb.amount_usd.toFixed(2)} USD
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Tabla de Detalle de Cobros / Amortizaciones */}
                        <Card className="border shadow-xs overflow-hidden">
                            <CardHeader className="border-b pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Coins className="h-4 w-4 text-emerald-600" /> Detalle de Amortizaciones Registradas
                                    </CardTitle>
                                    <span className="text-xs text-muted-foreground">
                                        {report_data?.payments.length || 0} pagos en este reporte
                                    </span>
                                </div>
                            </CardHeader>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="text-xs font-semibold">Fecha / Hora</TableHead>
                                            <TableHead className="text-xs font-semibold">N° Recibo</TableHead>
                                            <TableHead className="text-xs font-semibold">Cliente</TableHead>
                                            <TableHead className="text-xs font-semibold">Venta / Comprobante</TableHead>
                                            <TableHead className="text-xs font-semibold">Medio de Pago</TableHead>
                                            <TableHead className="text-xs font-semibold">Cobrador</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Monto Cobrado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!report_data?.payments || report_data.payments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-40 text-center">
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                                                        <Coins className="h-10 w-10 text-muted-foreground/30" />
                                                        <p className="font-medium text-sm">No se registraron cobros en el período seleccionado.</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Cambia la fecha o período en los botones superiores para auditar otros días o meses.
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            report_data.payments.map((p) => (
                                                <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                                                    <TableCell className="text-xs font-mono">
                                                        {p.operation_date}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-bold text-foreground">
                                                        {p.payment_number}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-medium text-foreground">{p.customer_name}</div>
                                                        <div className="text-[10px] text-muted-foreground">{p.customer_doc}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <Badge variant="outline" className="text-[10px] font-mono">
                                                            {p.related_sales.join(', ') || 'Abono general'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <span className="font-medium text-foreground">
                                                            {p.payment_methods.join(', ') || 'Efectivo'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {p.collector_name}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                                                        {p.currency_code} {p.total_amount.toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Quick Amortization / Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                            <Coins className="h-5 w-5" /> Registrar Abono / Cobro
                        </DialogTitle>
                        <DialogDescription>
                            Ingresa el monto amortizado por el cliente para actualizar el saldo pendiente.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReceivable && (
                        <div className="p-3 bg-muted/60 rounded-xl space-y-1.5 text-xs border">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cliente:</span>
                                <span className="font-semibold text-foreground">{selectedReceivable.customer.legal_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Comprobante:</span>
                                <span className="font-medium text-foreground">{selectedReceivable.sale?.sale_number || 'Venta a Crédito'}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t">
                                <span className="text-muted-foreground">Saldo Pendiente Actual:</span>
                                <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                                    {selectedReceivable.currency_code} {parseFloat(selectedReceivable.balance_amount.toString()).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={submitQuickPayment} className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                            <Label htmlFor="pay_amount" className="text-xs font-semibold">
                                Monto a Cobrar / Amortizar ({selectedReceivable?.currency_code || 'PEN'}) <span className="text-rose-500">*</span>
                            </Label>
                            <Input 
                                id="pay_amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={selectedReceivable ? parseFloat(selectedReceivable.balance_amount.toString()) : undefined}
                                value={paymentForm.data.amount}
                                onChange={e => paymentForm.setData('amount', e.target.value)}
                                className="font-mono text-base font-bold"
                                placeholder="0.00"
                                required
                            />
                            <InputError message={paymentForm.errors.amount} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="payment_method" className="text-xs font-semibold">
                                    Método de Pago <span className="text-rose-500">*</span>
                                </Label>
                                <Select 
                                    value={paymentForm.data.payment_method_id} 
                                    onValueChange={v => paymentForm.setData('payment_method_id', v)}
                                >
                                    <SelectTrigger id="payment_method" className="h-9">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {payment_methods.map(pm => (
                                            <SelectItem key={pm.id} value={pm.id.toString()}>
                                                {pm.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={paymentForm.errors.payment_method_id} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="op_date" className="text-xs font-semibold">
                                    Fecha de Operación <span className="text-rose-500">*</span>
                                </Label>
                                <Input 
                                    id="op_date"
                                    type="date"
                                    value={paymentForm.data.operation_date}
                                    onChange={e => paymentForm.setData('operation_date', e.target.value)}
                                    className="h-9"
                                    required
                                />
                                <InputError message={paymentForm.errors.operation_date} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="pay_notes" className="text-xs font-semibold">
                                Notas o Referencia de Pago (Opcional)
                            </Label>
                            <Input 
                                id="pay_notes"
                                placeholder="Nro de operación bancaria, voucher Yape..."
                                value={paymentForm.data.notes}
                                onChange={e => paymentForm.setData('notes', e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsPaymentModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={paymentForm.processing}
                            >
                                Confirmar Abono
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

ReceivablesIndex.layout = {
    breadcrumbs,
};

