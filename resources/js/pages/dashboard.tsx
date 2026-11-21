import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    ArrowLeftRight,
    Boxes,
    Calendar,
    ClipboardList,
    CreditCard,
    DollarSign,
    Eye,
    FileText,
    Filter,
    MapPin,
    PackagePlus,
    Receipt,
    RotateCcw,
    ShieldCheck,
    ShoppingCart,
    Store,
    TrendingDown,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

interface DashboardProps {
    is_admin: boolean;
    user_info?: {
        name: string;
        role_name: string;
        branch_name: string;
    };
    stats: Record<string, any>;
    chartData: any[];
    recentSales: any[];
    branches: Array<{ id: number; name: string }>;
    filters: {
        branch_id: string;
        month: string | null;
        date: string | null;
    };
}

export default function Dashboard({ is_admin, user_info, stats, chartData, recentSales, branches, filters }: DashboardProps) {
    const [localFilters, setLocalFilters] = useState({
        branch_id: filters.branch_id || (is_admin ? 'all' : (branches?.[0]?.id?.toString() || '')),
        month: filters.month || '',
        date: filters.date || ''
    });

    // Formateador de moneda
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
    };

    // Cálculo de variación porcentual
    const getChange = (current: number, previous: number) => {
        if (!previous || previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const applyFilters = () => {
        router.get('/dashboard', localFilters, { preserveState: true, preserveScroll: true });
    };

    const resetFilters = () => {
        const resetState = {
            branch_id: is_admin ? 'all' : (branches?.[0]?.id?.toString() || ''),
            month: '',
            date: ''
        };
        setLocalFilters(resetState);
        router.get('/dashboard', resetState, { preserveState: true, preserveScroll: true });
    };

    // Acciones Rápidas para Administrador con iconos a color
    const adminQuickActions = [
        {
            title: 'Nueva Venta',
            subtitle: 'Emitir comprobante',
            href: '/sales/create',
            icon: ShoppingCart,
            bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        },
        {
            title: 'Nueva Compra',
            subtitle: 'Ingreso mercadería',
            href: '/purchases/create',
            icon: PackagePlus,
            bgClass: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/20',
        },
        {
            title: 'Cotizaciones',
            subtitle: 'Propuestas de venta',
            href: '/quotations',
            icon: FileText,
            bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        },
        {
            title: 'Consultar Stock',
            subtitle: 'Inventario general',
            href: '/inventory',
            icon: Boxes,
            bgClass: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20',
        },
        {
            title: 'Cobranzas',
            subtitle: 'Cuentas por cobrar',
            href: '/receivables',
            icon: CreditCard,
            bgClass: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/20',
        },
        {
            title: 'Reporte Kardex',
            subtitle: 'Movimiento contable',
            href: '/kardex',
            icon: ClipboardList,
            bgClass: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20',
        },
    ];

    // Acciones Rápidas para Usuario Normal / Operativo con iconos a color
    const normalQuickActions = [
        {
            title: 'Nueva Venta',
            subtitle: 'Punto de venta POS',
            href: '/sales/create',
            icon: ShoppingCart,
            bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        },
        {
            title: 'Nueva Cotización',
            subtitle: 'Generar proforma',
            href: '/quotations/create',
            icon: FileText,
            bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        },
        {
            title: 'Consultar Stock',
            subtitle: 'Existencias en tienda',
            href: '/inventory',
            icon: Boxes,
            bgClass: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20',
        },
        {
            title: 'Clientes',
            subtitle: 'Directorio clientes',
            href: '/customers',
            icon: Users,
            bgClass: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/20',
        },
    ];

    const quickActions = is_admin ? adminQuickActions : normalQuickActions;

    // Métricas calculadas para Admin
    const revenueChange = is_admin ? getChange(stats.revenue_this_month, stats.revenue_last_month) : 0;
    const expensesChange = is_admin ? getChange(stats.expenses_this_month, stats.expenses_last_month) : 0;
    const salesCountChange = is_admin ? getChange(stats.sales_count_this_month, stats.sales_count_last_month) : 0;

    // Métricas calculadas para Usuario Normal
    const myRevenueChange = !is_admin ? getChange(stats.my_revenue_this_month, stats.my_revenue_last_month) : 0;
    const mySalesCountChange = !is_admin ? getChange(stats.my_sales_count_this_month, stats.my_sales_count_last_month) : 0;

    const currentBranchName = branches?.find(b => b.id.toString() === localFilters.branch_id)?.name || 'Todas las Sucursales';

    return (
        <>
            <Head title={is_admin ? 'Dashboard Administrador' : 'Dashboard Operativo'} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-background/95">

                {/* Encabezado con Saludo, Nombre de Usuario, Rol y Sucursal */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card border rounded-2xl p-4 sm:p-5 shadow-xs">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                                ¡Hola, {user_info?.name || 'Usuario'}! 👋
                            </h2>
                            <Badge 
                                variant="outline" 
                                className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5 flex items-center gap-1.5"
                            >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {user_info?.role_name || (is_admin ? 'Administrador' : 'Operativo')}
                            </Badge>
                            <Badge 
                                variant="outline" 
                                className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs font-medium px-2.5 py-0.5 flex items-center gap-1.5"
                            >
                                <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                {user_info?.branch_name || currentBranchName}
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            {is_admin
                                ? 'Visión estratégica consolidada, ingresos globales y control operativo de la empresa.'
                                : `Panel de operaciones de venta y stock asignado en ${user_info?.branch_name || currentBranchName}.`}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 self-start md:self-center shrink-0">
                        <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center shadow-xs">
                            <Activity className="w-3.5 h-3.5 mr-1.5 animate-pulse text-emerald-500" />
                            Operación en vivo
                        </div>
                    </div>
                </div>

                {/* SECCIÓN: ACCESOS RÁPIDOS (QUICK ACTIONS) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Accesos Rápidos</span>
                    </div>
                    <div className={`grid grid-cols-2 sm:grid-cols-3 ${is_admin ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-3`}>
                        {quickActions.map((action, idx) => {
                            const IconComponent = action.icon;
                            return (
                                <Link
                                    key={idx}
                                    href={action.href}
                                    className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-all duration-200 hover:shadow-sm group hover:border-primary/30"
                                >
                                    <div className={`p-2.5 rounded-lg border ${action.bgClass} transition-transform group-hover:scale-110 shrink-0`}>
                                        <IconComponent className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="text-xs font-semibold block text-foreground truncate group-hover:text-primary transition-colors">
                                            {action.title}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground block truncate">
                                            {action.subtitle}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* SECCIÓN: BARRA DE FILTROS Y PERÍODO ANALIZADO */}
                <div className="bg-white dark:bg-card border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                                    Período Seleccionado
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm sm:text-base font-extrabold text-foreground">
                                        {stats.period_label || 'Mes Actual'}
                                    </span>
                                    <Badge variant="outline" className="text-[11px] font-semibold text-primary border-primary/20 bg-primary/5">
                                        {stats.comparison_label || 'vs mes anterior'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Controles de Filtros */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Selector de Sucursal (Solo para Admin) */}
                            {is_admin && (
                                <Select 
                                    value={localFilters.branch_id} 
                                    onValueChange={(val) => setLocalFilters({ ...localFilters, branch_id: val })}
                                >
                                    <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs">
                                        <SelectValue placeholder="Sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las sucursales</SelectItem>
                                        {branches?.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Año */}
                            <Select
                                value={localFilters.month ? localFilters.month.substring(0, 4) : '2026'}
                                onValueChange={(val) => {
                                    const m = localFilters.month ? localFilters.month.substring(5, 7) : '10';
                                    setLocalFilters({ ...localFilters, month: `${val}-${m}`, date: '' });
                                }}
                            >
                                <SelectTrigger className="w-[100px] h-9 text-xs">
                                    <SelectValue placeholder="Año" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Mes */}
                            <Select
                                value={localFilters.month ? localFilters.month.substring(5, 7) : '10'}
                                onValueChange={(val) => {
                                    const y = localFilters.month ? localFilters.month.substring(0, 4) : '2026';
                                    setLocalFilters({ ...localFilters, month: `${y}-${val}`, date: '' });
                                }}
                            >
                                <SelectTrigger className="w-[125px] h-9 text-xs">
                                    <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="01">Enero</SelectItem>
                                    <SelectItem value="02">Febrero</SelectItem>
                                    <SelectItem value="03">Marzo</SelectItem>
                                    <SelectItem value="04">Abril</SelectItem>
                                    <SelectItem value="05">Mayo</SelectItem>
                                    <SelectItem value="06">Junio</SelectItem>
                                    <SelectItem value="07">Julio</SelectItem>
                                    <SelectItem value="08">Agosto</SelectItem>
                                    <SelectItem value="09">Septiembre</SelectItem>
                                    <SelectItem value="10">Octubre</SelectItem>
                                    <SelectItem value="11">Noviembre</SelectItem>
                                    <SelectItem value="12">Diciembre</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Fecha Exacta */}
                            <Input
                                type="date"
                                value={localFilters.date}
                                onChange={(e) => setLocalFilters({ ...localFilters, date: e.target.value, month: '' })}
                                className="h-9 w-[135px] text-xs"
                                title="Filtrar por fecha exacta"
                            />

                            <Button onClick={applyFilters} className="h-9 text-xs gap-1.5" variant="default">
                                <Filter className="w-3.5 h-3.5" />
                                Filtrar
                            </Button>

                            {(localFilters.date || (localFilters.month && localFilters.month !== '2026-11')) && (
                                <Button 
                                    onClick={resetFilters} 
                                    variant="outline" 
                                    className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                    title="Restablecer período"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Limpiar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* SECCIÓN: TARJETAS DE KPIS */}
                {is_admin ? (
                    // === KPIS PARA ADMINISTRADOR ===
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Card 1: Ingresos por Ventas */}
                        <Card className="border shadow-xs hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground">
                                        Ingresos por Ventas
                                    </CardTitle>
                                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                        {stats.period_label || 'Período'}
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black tracking-tight text-foreground">
                                    {formatCurrency(stats.revenue_this_month)}
                                </div>
                                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t text-muted-foreground">
                                    <span className="flex items-center">
                                        {revenueChange >= 0 ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                                                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{revenueChange.toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center">
                                                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> {revenueChange.toFixed(1)}%
                                            </span>
                                        )}
                                        <span className="ml-1 text-[11px]">{stats.comparison_label || 'vs anterior'}</span>
                                    </span>
                                    <span className="text-[11px] font-semibold text-foreground">
                                        {stats.sales_count_this_month} {stats.sales_count_this_month === 1 ? 'venta' : 'ventas'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2: Gastos de Compras */}
                        <Card className="border shadow-xs hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground">
                                        Gastos en Compras
                                    </CardTitle>
                                    <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                                        Mercadería ingresada
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    <TrendingDown className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black tracking-tight text-foreground">
                                    {formatCurrency(stats.expenses_this_month)}
                                </div>
                                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t text-muted-foreground">
                                    <span className="flex items-center">
                                        {expensesChange >= 0 ? (
                                            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center">
                                                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{expensesChange.toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                                                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> {expensesChange.toFixed(1)}%
                                            </span>
                                        )}
                                        <span className="ml-1 text-[11px]">{stats.comparison_label || 'vs anterior'}</span>
                                    </span>
                                    <span className="text-[11px] font-semibold text-foreground">
                                        {stats.purchases_count || 0} {stats.purchases_count === 1 ? 'compra' : 'compras'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 3: Ventas Realizadas y Ticket Promedio */}
                        <Card className="border shadow-xs hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground">
                                        Ventas Realizadas
                                    </CardTitle>
                                    <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                                        Operaciones cerradas
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                    <ShoppingCart className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black tracking-tight text-foreground">
                                    {stats.sales_count_this_month}
                                </div>
                                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t text-muted-foreground">
                                    <span className="flex items-center">
                                        {salesCountChange >= 0 ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                                                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{salesCountChange.toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center">
                                                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> {salesCountChange.toFixed(1)}%
                                            </span>
                                        )}
                                        <span className="ml-1 text-[11px]">{stats.comparison_label || 'vs anterior'}</span>
                                    </span>
                                    <span className="text-[11px] font-medium text-muted-foreground">
                                        Prom: {formatCurrency(stats.average_ticket || 0)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 4: Valorización de Inventario & Catálogo */}
                        <Card className="border shadow-xs hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground">
                                        Valorización de Inventario
                                    </CardTitle>
                                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                        Stock en almacén
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    <Boxes className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black tracking-tight text-foreground">
                                    {formatCurrency(stats.inventory_valuation || 0)}
                                </div>
                                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t text-muted-foreground">
                                    <span className="text-[11px] font-semibold text-foreground">
                                        {stats.products_count} productos
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        {(stats.total_units_stock || 0).toLocaleString()} unds físicas
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    // === KPIS PARA USUARIO NORMAL / OPERATIVO ===
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="border shadow-xs hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground">Mis Ventas</CardTitle>
                                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                        {stats.period_label || 'Período'}
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black tracking-tight text-foreground">{formatCurrency(stats.my_revenue_this_month)}</div>
                                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t flex items-center">
                                    {myRevenueChange >= 0 ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                                            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{myRevenueChange.toFixed(1)}%
                                        </span>
                                    ) : (
                                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center">
                                            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> {myRevenueChange.toFixed(1)}%
                                        </span>
                                    )}
                                    <span className="ml-1 text-[11px]">{stats.comparison_label || 'vs anterior'}</span>
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-xs hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground">Mis Ventas de Hoy</CardTitle>
                                    <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">Jornada actual</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                    <Zap className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                                    {formatCurrency(stats.my_revenue_today)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                                    {stats.my_sales_count_today} {stats.my_sales_count_today === 1 ? 'comprobante emitido' : 'comprobantes emitidos'} hoy
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-xs hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground">Comprobantes del Mes</CardTitle>
                                    <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">Operaciones cerradas</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                    <Receipt className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black tracking-tight text-foreground">{stats.my_sales_count_this_month}</div>
                                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t flex items-center">
                                    {mySalesCountChange >= 0 ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                                            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{mySalesCountChange.toFixed(1)}%
                                        </span>
                                    ) : (
                                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center">
                                            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> {mySalesCountChange.toFixed(1)}%
                                        </span>
                                    )}
                                    <span className="ml-1 text-[11px]">{stats.comparison_label || 'vs anterior'}</span>
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-xs hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground">Stock en Tienda</CardTitle>
                                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">{currentBranchName}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    <Store className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black tracking-tight text-foreground">{stats.branch_stock_count}</div>
                                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                                    {(stats.branch_units_stock || 0).toLocaleString()} unidades disponibles en sucursal
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* SECCIÓN: GRÁFICO Y ANÁLISIS */}
                <Card className="w-full">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold">
                                {is_admin ? 'Ventas por Usuario / Vendedor' : 'Mi Evolución de Ventas'}
                            </CardTitle>
                            <CardDescription>
                                {is_admin
                                    ? `Rendimiento y ranking de ventas durante ${stats.period_label || 'el período seleccionado'}`
                                    : `Seguimiento de ventas diarias durante ${stats.period_label || 'el período seleccionado'}`}
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-muted/50 border self-start sm:self-center">
                            {stats.period_label || 'Período activo'}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        {chartData && chartData.length > 0 ? (
                            <div className="grid lg:grid-cols-5 gap-8 items-start">
                                {/* Gráfico (3 Columnas) */}
                                <div className="lg:col-span-3 h-[290px] w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartData}
                                            margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fontWeight: 500 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(value) => `S/ ${value}`}
                                                tick={{ fontSize: 11 }}
                                                dx={-5}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur-md">
                                                                <span className="text-xs font-bold block text-foreground mb-1">
                                                                    {data.name}
                                                                </span>
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span className="font-extrabold text-primary">
                                                                        {formatCurrency(data.total_amount)}
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        ({data.total_sales} {data.total_sales === 1 ? 'venta' : 'ventas'})
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="total_amount" radius={[6, 6, 0, 0]}>
                                                {chartData.map((_, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        className="fill-primary hover:fill-primary/80 transition-colors"
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Resumen / Ranking (2 Columnas) */}
                                <div className="lg:col-span-2 space-y-3 bg-muted/20 border rounded-xl p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                        <span>{is_admin ? 'Ranking de Ventas' : 'Detalle de Días'}</span>
                                        <span className="text-[10px] text-muted-foreground font-normal">
                                            {chartData.length} registros
                                        </span>
                                    </h4>
                                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                        {chartData.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-2.5 rounded-lg bg-card border text-xs shadow-xs hover:border-primary/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                                        idx === 0 
                                                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                                                            : idx === 1 
                                                            ? 'bg-slate-500/10 text-slate-600 border border-slate-500/20' 
                                                            : idx === 2 
                                                            ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' 
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                        {idx + 1}
                                                    </span>
                                                    <div className="truncate">
                                                        <span className="font-semibold block text-foreground truncate">
                                                            {item.name}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {item.total_sales} {item.total_sales === 1 ? 'operación' : 'operaciones'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-foreground shrink-0 ml-2">
                                                    {formatCurrency(item.total_amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-xl">
                                <Activity className="w-10 h-10 text-muted-foreground/30 mb-2" />
                                <p className="text-sm font-semibold text-foreground">Sin actividad registrada en este período</p>
                                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                                    No se registraron ventas confirmadas para los filtros aplicados. Intenta seleccionando otro mes o sucursal en el panel superior.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* SECCIÓN: ÚLTIMAS VENTAS REGISTRADAS */}
                <Card className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                            <CardTitle className="text-lg font-bold">
                                {is_admin ? 'Últimas Ventas de la Empresa' : 'Mis Últimas Ventas'}
                            </CardTitle>
                            <CardDescription>
                                {is_admin
                                    ? 'Transacciones más recientes registradas en el sistema'
                                    : 'Comprobantes emitidos recientemente por tu usuario'}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/sales">
                                Ver todas las ventas
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {recentSales && recentSales.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">N° Venta</th>
                                            <th className="px-4 py-3 font-semibold">Fecha / Hora</th>
                                            <th className="px-4 py-3 font-semibold">Cliente</th>
                                            {is_admin && <th className="px-4 py-3 font-semibold">Vendedor</th>}
                                            <th className="px-4 py-3 font-semibold text-center">Estado</th>
                                            <th className="px-4 py-3 font-semibold text-right">Total</th>
                                            <th className="px-4 py-3 font-semibold text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {recentSales.map((sale: any) => {
                                            const formattedDate = new Date(sale.created_at).toLocaleString('es-PE', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            });

                                            return (
                                                <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-medium text-xs">
                                                        {sale.sale_number || `#VTA-${sale.id}`}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                                        {formattedDate}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">
                                                        {sale.customer?.name || sale.customer_name_snapshot || 'Público General / Varios'}
                                                    </td>
                                                    {is_admin && (
                                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                                            {sale.creator?.name || 'Sistema'}
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3 text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] uppercase font-semibold ${
                                                                sale.status === 'CONFIRMED'
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                                    : sale.status === 'DRAFT'
                                                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                            }`}
                                                        >
                                                            {sale.status === 'CONFIRMED' ? 'Confirmado' : sale.status === 'DRAFT' ? 'Borrador' : sale.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(Number(sale.total_amount))}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                                                            <Link href={`/sales/${sale.id}`} title="Ver comprobante de venta">
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-muted-foreground text-sm">
                                No se encontraron ventas recientes.
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </>
    );
}
