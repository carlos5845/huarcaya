import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    PackageSearch,
    Search,
    Filter,
    Boxes,
    Layers,
    PackageCheck,
    TrendingUp,
    AlertTriangle,
    XCircle,
    CheckCircle2,
    MinusCircle,
    Eye,
    RotateCcw
} from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OPTIMAL' | 'NO_THRESHOLD';

type ProductInventoryItem = {
    id: number;
    uuid: string;
    name: string;
    primary_reference: string;
    internal_code?: string;
    product_type: string;
    status: string;
    brand?: { id: number; name: string };
    category?: { id: number; name: string };
    unit?: { id: number; code: string; name: string };
    physical_quantity: number;
    available_quantity: number;
    reserved_quantity: number;
    min_stock_quantity: number | null;
    stock_status: StockStatus;
    purchase_price: number;
    sale_price: number;
    total_cost: number;
    margin_percentage: number | null;
    branch_breakdown?: {
        branch_id: number;
        branch_name: string;
        physical: number;
        available: number;
    }[];
};

type Props = {
    products: {
        data: ProductInventoryItem[];
        total: number;
        from: number;
        to: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    branches: { id: number; name: string }[];
    isSuperAdmin: boolean;
    kpis: {
        total_skus: number;
        total_physical: number;
        total_available: number;
        total_reserved: number;
        total_inventory_value: number;
        critical_count: number;
        low_stock_count: number;
        out_of_stock_count: number;
    };
    filters: {
        branch_id: string | null;
        search: string | null;
        stock_status: string | null;
        product_id?: string | null;
    };
};

export default function InventoryIndex({ products, branches, filters, kpis }: Props) {
    const { auth } = usePage<any>().props;
    const isSuperAdmin = auth.roles?.includes('Super Admin') || auth.permissions?.includes('view_inventory_general');

    const activeStockStatus = filters.stock_status || 'all';
    const [selectedBranch, setSelectedBranch] = React.useState<string>(filters.branch_id ? String(filters.branch_id) : 'ALL');

    React.useEffect(() => {
        setSelectedBranch(filters.branch_id ? String(filters.branch_id) : 'ALL');
    }, [filters.branch_id]);

    const handleBranchChange = (value: string) => {
        setSelectedBranch(value);
        const params = new URLSearchParams(window.location.search);
        if (value === 'ALL') {
            params.delete('branch_id');
        } else {
            params.set('branch_id', value);
        }
        params.delete('page');
        router.get(`/inventory?${params.toString()}`, {}, { preserveState: true });
    };

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const params = new URLSearchParams();
        const search = formData.get('search');
        
        if (search) {
            params.set('search', search.toString());
        }
        if (selectedBranch && selectedBranch !== "ALL") {
            params.set('branch_id', selectedBranch);
        }
        if (activeStockStatus && activeStockStatus !== 'all') {
            params.set('stock_status', activeStockStatus);
        }

        router.get(`/inventory?${params.toString()}`, {}, { preserveState: true });
    };

    const handleStatusFilter = (newStatus: string) => {
        const params = new URLSearchParams(window.location.search);
        if (newStatus === 'all') {
            params.delete('stock_status');
        } else {
            params.set('stock_status', newStatus);
        }
        router.get(`/inventory?${params.toString()}`, {}, { preserveState: true });
    };

    const handleResetFilters = () => {
        router.get('/inventory', {}, { preserveState: false });
    };

    const renderStockStatusBadge = (status: StockStatus) => {
        switch (status) {
            case 'OUT_OF_STOCK':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900 whitespace-nowrap">
                        <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
                        Agotado
                    </span>
                );
            case 'LOW_STOCK':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 whitespace-nowrap">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        Stock Bajo
                    </span>
                );
            case 'OPTIMAL':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 whitespace-nowrap">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        Abastecido
                    </span>
                );
            case 'NO_THRESHOLD':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 whitespace-nowrap">
                        <MinusCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        Sin Umbral
                    </span>
                );
        }
    };

    return (
        <>
            <Head title="Visor de Inventario Central" />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
                {/* Cabecera Principal */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <PackageSearch className="h-6 w-6 text-primary" />
                            Visor de Inventario Central
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Consulta ejecutiva de existencias, diagnóstico de stock y valorización por sede operativa.
                        </p>
                    </div>
                </div>

                {/* Resumen Ejecutivo: 5 KPI Cards */}
                {kpis && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                        {/* Total SKUs */}
                        <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total SKUs</p>
                                <h3 className="text-2xl font-bold font-mono mt-1 text-foreground">
                                    {Number(kpis.total_skus).toLocaleString()}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Catálogo registrado</p>
                            </div>
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                                <Boxes className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Stock Físico */}
                        <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Físico</p>
                                <h3 className="text-2xl font-bold font-mono mt-1 text-foreground">
                                    {Number(kpis.total_physical).toLocaleString()}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Piezas en almacén</p>
                            </div>
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                                <Layers className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Disponible vs Reservado */}
                        <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disponible</p>
                                <h3 className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                                    {Number(kpis.total_available).toLocaleString()}
                                </h3>
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                    Reservado: {Number(kpis.total_reserved).toLocaleString()}
                                </p>
                            </div>
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                                <PackageCheck className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Valorización Total */}
                        <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valorización</p>
                                <h3 className="text-xl font-bold font-mono mt-1 text-foreground">
                                    S/ {Number(kpis.total_inventory_value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Capital invertido (costo)</p>
                            </div>
                            <div className="p-2.5 bg-violet-50 dark:bg-violet-950/50 rounded-xl text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </div>

                        {/* Alertas de Reposición */}
                        <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alertas</p>
                                <h3 className="text-2xl font-bold font-mono mt-1 text-rose-600 dark:text-rose-400">
                                    {Number(kpis.critical_count).toLocaleString()}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {kpis.out_of_stock_count} agotados · {kpis.low_stock_count} bajos
                                </p>
                            </div>
                            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Barra de Filtros y Búsqueda */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-xs p-4 flex flex-col gap-4">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                name="search"
                                placeholder="Buscar por nombre, código interno, referencia o marca..."
                                className="pl-8"
                                defaultValue={filters.search || ''}
                            />
                        </div>
                        {isSuperAdmin && (
                            <div className="w-full sm:w-64">
                                <Select value={selectedBranch} onValueChange={handleBranchChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Todas las sucursales" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todas las sucursales</SelectItem>
                                        {branches.map((b: any) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <Button type="submit" variant="default" className="gap-2">
                            <Filter className="h-4 w-4" />
                            Filtrar
                        </Button>
                        {(filters.search || filters.stock_status || (filters.branch_id && filters.branch_id !== 'ALL') || filters.product_id) && (
                            <Button type="button" variant="outline" onClick={handleResetFilters} title="Limpiar filtros">
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        )}
                    </form>

                    {/* Filtros Rápidos de Diagnóstico de Stock */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
                        <span className="text-muted-foreground font-medium mr-1">Filtrar por estado:</span>
                        <button
                            type="button"
                            onClick={() => handleStatusFilter('all')}
                            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                                activeStockStatus === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            Todos ({kpis?.total_skus ?? 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleStatusFilter('in_stock')}
                            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                                activeStockStatus === 'in_stock'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            Con Stock ({Math.max(0, (kpis?.total_skus ?? 0) - (kpis?.out_of_stock_count ?? 0))})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleStatusFilter('low_stock')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                                activeStockStatus === 'low_stock'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100'
                            }`}
                        >
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            Stock Bajo ({kpis?.low_stock_count ?? 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleStatusFilter('out_of_stock')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                                activeStockStatus === 'out_of_stock'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 hover:bg-red-100'
                            }`}
                        >
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                            Agotados ({kpis?.out_of_stock_count ?? 0})
                        </button>
                    </div>
                </div>

                {/* Banner de enfoque derivado de alerta */}
                {filters.product_id && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs shadow-xs animate-in fade-in duration-300">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                            </div>
                            <div>
                                <span className="font-semibold text-sm">Vista filtrada por alerta de repuesto</span>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Mostrando el repuesto específico y sus existencias en {branches.find(b => String(b.id) === String(filters.branch_id))?.name || (filters.branch_id && filters.branch_id !== 'ALL' ? `Sede #${filters.branch_id}` : 'todas las sedes')}.
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilters}
                            className="h-8 gap-1.5 text-xs border-amber-500/30 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 shrink-0 self-start sm:self-auto font-medium"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Ver Todo el Inventario
                        </Button>
                    </div>
                )}

                {/* Tabla de Inventario Enriquecida */}
                <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Repuesto / Catálogo</th>
                                    <th className="px-3 py-3 font-medium text-center">U.M.</th>
                                    <th className="px-4 py-3 font-medium">Sucursal</th>
                                    <th className="px-3 py-3 font-medium text-center">Estado Stock</th>
                                    <th className="px-3 py-3 font-medium text-right" title="Umbral de Alerta">Stock Mín.</th>
                                    <th className="px-3 py-3 font-medium text-right">Físico</th>
                                    <th className="px-3 py-3 font-medium text-right">Reservado</th>
                                    <th className="px-3 py-3 font-medium text-right">Disponible</th>
                                    <th className="px-3 py-3 font-medium text-right">P. Compra</th>
                                    <th className="px-3 py-3 font-medium text-right">P. Venta</th>
                                    <th className="px-3 py-3 font-medium text-right" title="Físico × Costo Promedio">Valor Total</th>
                                    <th className="px-3 py-3 font-medium text-center">Margen</th>
                                    <th className="px-4 py-3 font-medium text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {products.data.map((product: ProductInventoryItem) => {
                                    const physical = Number(product.physical_quantity) || 0;
                                    const reserved = Number(product.reserved_quantity) || 0;
                                    const available = Number(product.available_quantity) || 0;
                                    const minStock = product.min_stock_quantity !== null ? Number(product.min_stock_quantity) : null;
                                    const unitCode = product.unit?.code || 'UND';

                                    const branchLabel = filters.branch_id && filters.branch_id !== 'ALL'
                                        ? branches.find(b => b.id.toString() === filters.branch_id?.toString())?.name || 'Sede Seleccionada'
                                        : 'Global (Todas)';

                                    const isAlertTarget = Boolean(filters.product_id && String(product.id) === String(filters.product_id));

                                    return (
                                        <tr key={product.id} className={`hover:bg-muted/30 transition-colors ${isAlertTarget ? 'bg-amber-500/10 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-500/30' : ''}`}>
                                            {/* Producto */}
                                            <td className="px-4 py-3 min-w-[260px]">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-foreground text-sm">
                                                            {product.name}
                                                        </span>
                                                        {isAlertTarget && (
                                                            <Badge className="text-[10px] h-4 px-1.5 font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40">
                                                                Repuesto de Alerta
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground font-mono">
                                                        <span>Ref: {product.primary_reference || '-'}</span>
                                                        {product.internal_code && (
                                                            <>
                                                                <span>·</span>
                                                                <span>Cód: {product.internal_code}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                                        {product.brand && (
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                                                                {product.brand.name}
                                                            </Badge>
                                                        )}
                                                        {product.category && (
                                                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                                                                {product.category.name}
                                                            </Badge>
                                                        )}
                                                        {product.product_type && product.product_type !== 'SIMPLE' && (
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                                                                {product.product_type.replace('_', ' ')}
                                                            </Badge>
                                                        )}
                                                        {product.status === 'INACTIVE' && (
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
                                                                Inactivo
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Unidad de Medida */}
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-muted text-muted-foreground" title={product.unit?.name || 'Unidad'}>
                                                    {unitCode}
                                                </span>
                                            </td>

                                            {/* Sucursal */}
                                            <td className="px-4 py-3 min-w-[170px]">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold text-xs text-foreground">{branchLabel}</span>
                                                    {/* Desglose por sede en vista global */}
                                                    {(!filters.branch_id || filters.branch_id === 'ALL') && product.branch_breakdown && product.branch_breakdown.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                                            {product.branch_breakdown.map((item, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/40"
                                                                    title={`${item.branch_name}: ${item.physical} u.`}
                                                                >
                                                                    <span className="capitalize">{item.branch_name.replace(/^(sucursal-|surcusal-|Sede-)/i, '')}</span>:
                                                                    <strong className="text-foreground">{item.physical}</strong>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Diagnóstico de Stock con ícono a color */}
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                {renderStockStatusBadge(product.stock_status)}
                                            </td>

                                            {/* Stock Mínimo */}
                                            <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                                                {minStock !== null ? (
                                                    <span className="text-muted-foreground font-medium">{minStock}</span>
                                                ) : (
                                                    <span className="text-muted-foreground/60 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Stock Físico */}
                                            <td className="px-3 py-3 text-right font-mono font-semibold whitespace-nowrap">
                                                {physical}
                                            </td>

                                            {/* Stock Reservado */}
                                            <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                                                {reserved > 0 ? (
                                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                        {reserved}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/60">0</span>
                                                )}
                                            </td>

                                            {/* Stock Disponible */}
                                            <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap">
                                                <span className={available > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                                    {available}
                                                </span>
                                            </td>

                                            {/* P. Compra (Costo Promedio) */}
                                            <td className="px-3 py-3 text-right font-mono text-muted-foreground whitespace-nowrap text-xs">
                                                {product.purchase_price > 0 ? `S/ ${Number(product.purchase_price).toFixed(2)}` : '-'}
                                            </td>

                                            {/* P. Venta (Sugerido) */}
                                            <td className="px-3 py-3 text-right font-mono font-medium text-foreground whitespace-nowrap text-xs">
                                                {product.sale_price > 0 ? `S/ ${Number(product.sale_price).toFixed(2)}` : '-'}
                                            </td>

                                            {/* Valor Total en Almacén */}
                                            <td className="px-3 py-3 text-right font-mono font-semibold text-foreground whitespace-nowrap text-xs">
                                                {product.total_cost > 0
                                                    ? `S/ ${Number(product.total_cost).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : '-'}
                                            </td>

                                            {/* Margen Comercial */}
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                {product.margin_percentage !== null ? (
                                                    <span
                                                        className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
                                                            product.margin_percentage >= 30
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                : product.margin_percentage > 0
                                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                                        }`}
                                                    >
                                                        {product.margin_percentage > 0 ? `+${product.margin_percentage}%` : `${product.margin_percentage}%`}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/60 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
                                                    <Link href={`/products/${product.id}?tab=stocks`}>
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Ficha
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {products.data.length === 0 && (
                                    <tr>
                                        <td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">
                                            <PackageSearch className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                            <p className="font-medium">No se encontraron repuestos con los filtros seleccionados.</p>
                                            <p className="text-xs text-muted-foreground mt-1">Intenta cambiar la sucursal, la búsqueda o el filtro de stock.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                        <div className="text-muted-foreground text-xs">
                            Mostrando {products.from || 0} a {products.to || 0} de {products.total} repuestos
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {products.links.map((link: any, i: number) => (
                                <Button
                                    key={i}
                                    variant={link.active ? "default" : "outline"}
                                    size="sm"
                                    className={`h-8 px-3 text-xs ${link.url ? "" : "opacity-50 cursor-not-allowed"}`}
                                    onClick={() => {
                                        if (link.url) {
                                            router.get(
                                                link.url,
                                                {
                                                    branch_id: filters.branch_id,
                                                    search: filters.search,
                                                    stock_status: filters.stock_status,
                                                },
                                                { preserveState: true }
                                            );
                                        }
                                    }}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

InventoryIndex.layout = {
    breadcrumbs: [
        {
            title: 'Inventario Central',
            href: '/inventory',
        },
    ],
};
