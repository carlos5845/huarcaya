import { Head, Link, router } from '@inertiajs/react';
import { 
    Calculator, 
    Plus, 
    Search, 
    Filter, 
    Calendar, 
    Building2, 
    Eye, 
    Printer, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    ArrowRightCircle, 
    FileText,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentPreviewModal } from '@/components/document-preview-modal';

type Quotation = {
    id: number;
    uuid: string;
    quotation_number: string;
    operation_date: string;
    valid_until_date: string;
    validity_days: number;
    currency_code: string;
    total_amount: string | number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
    customer_name_snapshot: string;
    customer_document_snapshot: string | null;
    branch: { id: number; name: string };
    creator: { id: number; name: string } | null;
    converted_sale?: { id: number; sale_number: string } | null;
};

type Props = {
    quotations: {
        data: Quotation[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
    };
    branches: Array<{ id: number; name: string }>;
    metrics: {
        total: number;
        pending: number;
        pending_amount: number;
        converted: number;
        converted_amount: number;
        expired: number;
    };
    filters: {
        branch_id: string;
        status: string;
        search: string;
        date_from: string;
        date_to: string;
    };
};

export default function QuotationsIndex({ quotations, branches, metrics, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id || 'ALL');
    const [status, setStatus] = useState(filters.status || 'ALL');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    // Modal de vista previa e impresión de cotización
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('Cotización de Repuestos');
    const [previewSubtitle, setPreviewSubtitle] = useState('');

    const handleOpenPreview = (quote: Quotation) => {
        setPreviewUrl(`/quotations/${quote.id}/print/a4`);
        setPreviewTitle(`Cotización ${quote.quotation_number}`);
        setPreviewSubtitle(`Cliente: ${quote.customer_name_snapshot} | Total: ${quote.currency_code === 'USD' ? '$' : 'S/'} ${Number(quote.total_amount).toFixed(2)}`);
        setPreviewModalOpen(true);
    };

    const handleFilter = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get(
            '/quotations',
            {
                search: search || undefined,
                branch_id: branchId !== 'ALL' ? branchId : undefined,
                status: status !== 'ALL' ? status : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true }
        );
    };

    const handleClearFilters = () => {
        setSearch('');
        setBranchId('ALL');
        setStatus('ALL');
        setDateFrom('');
        setDateTo('');
        router.get('/quotations');
    };

    const getStatusBadge = (quote: Quotation) => {
        const isExpired = quote.status === 'PENDING' && new Date(quote.valid_until_date) < new Date(new Date().toDateString());

        if (quote.status === 'CONVERTED') {
            return (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Convertida a Venta
                </Badge>
            );
        }
        if (isExpired || quote.status === 'EXPIRED') {
            return (
                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 gap-1.5 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" /> Vencida
                </Badge>
            );
        }
        if (quote.status === 'APPROVED') {
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprobada
                </Badge>
            );
        }
        if (quote.status === 'REJECTED') {
            return (
                <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 gap-1.5 font-medium">
                    <XCircle className="h-3.5 w-3.5" /> Rechazada
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5" /> Vigente / Pendiente
            </Badge>
        );
    };

    return (
        <>
            <Head title="Cotizaciones y Presupuestos" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8">
                {/* Cabecera Principal */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Calculator className="h-7 w-7 text-primary" />
                            Cotizaciones & Presupuestos
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Emisión de presupuestos comerciales, validez de oferta y conversión directa a venta.
                        </p>
                    </div>

                    <Button asChild size="default" className="shadow-xs font-semibold gap-2">
                        <Link href="/quotations/create">
                            <Plus className="h-4 w-4" />
                            Nueva Cotización
                        </Link>
                    </Button>
                </div>

                {/* Tarjetas Métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border border-border/60 shadow-xs">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Emitidas</p>
                                <p className="text-2xl font-bold mt-1">{metrics.total}</p>
                                <span className="text-xs text-muted-foreground">Historial completo</span>
                            </div>
                            <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <FileText className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-amber-200/80 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">Vigentes / Pendientes</p>
                                <p className="text-2xl font-bold mt-1 text-amber-800 dark:text-amber-300">{metrics.pending}</p>
                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                    S/ {Number(metrics.pending_amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="h-11 w-11 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                                <Clock className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-emerald-200/80 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Convertidas a Venta</p>
                                <p className="text-2xl font-bold mt-1 text-emerald-800 dark:text-emerald-300">{metrics.converted}</p>
                                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                    S/ {Number(metrics.converted_amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="h-11 w-11 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-rose-200/80 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-rose-700 dark:text-rose-400 uppercase tracking-wider">Vencidas sin Cerrar</p>
                                <p className="text-2xl font-bold mt-1 text-rose-800 dark:text-rose-300">{metrics.expired}</p>
                                <span className="text-xs text-rose-600 dark:text-rose-400">Expiraron los 15 días</span>
                            </div>
                            <div className="h-11 w-11 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtros de Búsqueda */}
                <Card className="border border-border/60 shadow-xs">
                    <CardContent className="p-4">
                        <form onSubmit={handleFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                            <div className="lg:col-span-2 space-y-1">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Search className="h-3.5 w-3.5" /> Buscar por número o cliente
                                </label>
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="COT-001-..., cliente o RUC/DNI..."
                                    className="h-9"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5" /> Sucursal
                                </label>
                                <Select value={branchId} onValueChange={setBranchId}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todas las sedes</SelectItem>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Filter className="h-3.5 w-3.5" /> Estado
                                </label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todos los estados</SelectItem>
                                        <SelectItem value="PENDING">Vigentes / Pendientes</SelectItem>
                                        <SelectItem value="CONVERTED">Convertidas a Venta</SelectItem>
                                        <SelectItem value="EXPIRED">Vencidas</SelectItem>
                                        <SelectItem value="REJECTED">Rechazadas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" /> Desde
                                </label>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="h-9"
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" size="sm" className="h-9 flex-1 gap-1">
                                    <Filter className="h-3.5 w-3.5" /> Filtrar
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters} className="h-9">
                                    Limpiar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Tabla de Resultados */}
                <div className="rounded-md border border-border/60 bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 border-b border-border/60 text-xs uppercase font-semibold text-muted-foreground">
                                <tr>
                                    <th className="py-3 px-4">N° Cotización</th>
                                    <th className="py-3 px-4">Fecha Emisión</th>
                                    <th className="py-3 px-4">Validez</th>
                                    <th className="py-3 px-4">Cliente / Razón Social</th>
                                    <th className="py-3 px-4">Sucursal</th>
                                    <th className="py-3 px-4 text-right">Total Cotizado</th>
                                    <th className="py-3 px-4 text-center">Estado</th>
                                    <th className="py-3 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {quotations.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-muted-foreground">
                                            <Calculator className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                                            No se encontraron cotizaciones registradas con los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    quotations.data.map((quote) => {
                                        const isPEN = quote.currency_code === 'PEN';
                                        return (
                                            <tr key={quote.id} className="hover:bg-muted/40 transition-colors">
                                                <td className="py-3 px-4 font-mono font-bold text-foreground">
                                                    <Link href={`/quotations/${quote.id}`} className="hover:underline text-primary">
                                                        {quote.quotation_number}
                                                    </Link>
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {new Date(quote.operation_date).toLocaleDateString()}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-xs text-muted-foreground">
                                                        Hasta {new Date(quote.valid_until_date).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-medium">
                                                    <div>{quote.customer_name_snapshot}</div>
                                                    {quote.customer_document_snapshot && (
                                                        <div className="text-xs text-muted-foreground font-mono">
                                                            {quote.customer_document_snapshot}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {quote.branch.name}
                                                </td>
                                                <td className="py-3 px-4 text-right font-semibold">
                                                    {isPEN ? 'S/' : '$'} {Number(quote.total_amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {getStatusBadge(quote)}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Ver detalle">
                                                            <Link href={`/quotations/${quote.id}`}>
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-primary"
                                                            title="Imprimir Hoja A4"
                                                            onClick={() => handleOpenPreview(quote)}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>

                                                        {quote.status !== 'CONVERTED' && (
                                                            <Button
                                                                asChild
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 text-xs gap-1 font-semibold border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                                                title="Convertir a Venta"
                                                            >
                                                                <Link href={`/quotations/${quote.id}/convert-to-sale`}>
                                                                    <ArrowRightCircle className="h-3.5 w-3.5" />
                                                                    Facturar
                                                                </Link>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {quotations.last_page > 1 && (
                        <div className="p-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Mostrando página {quotations.current_page} de {quotations.last_page} ({quotations.total} registros)</span>
                            <div className="flex gap-1">
                                {quotations.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 px-3"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Vista Previa A4 Integrado en el Sistema */}
            <DocumentPreviewModal
                open={previewModalOpen}
                onOpenChange={setPreviewModalOpen}
                url={previewUrl}
                title={previewTitle}
                subtitle={previewSubtitle}
            />
        </>
    );
}

QuotationsIndex.layout = {
    breadcrumbs: [
        { title: 'Comercial y Ventas', href: '#' },
        { title: 'Cotizaciones', href: '/quotations' },
    ],
};
