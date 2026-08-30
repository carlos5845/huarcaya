import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, ArrowRight, ArrowUpRight, ArrowDownRight, Package, ShoppingCart, DollarSign, CreditCard, User, Clock, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function Dashboard({ stats, salesByUser, branches, filters }: any) {
    const [localFilters, setLocalFilters] = useState({
        branch_id: filters.branch_id || 'all',
        month: filters.month || '',
        date: filters.date || ''
    });

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
    };

    // Calculate percentage change
    const getChange = (current: number, previous: number) => {
        if (!previous || previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const revenueChange = getChange(stats.revenue_this_month, stats.revenue_last_month);
    const expensesChange = getChange(stats.expenses_this_month, stats.expenses_last_month);
    const salesCountChange = getChange(stats.sales_count_this_month, stats.sales_count_last_month);

    const applyFilters = () => {
        router.get('/dashboard', localFilters, { preserveState: true, preserveScroll: true });
    };

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6 bg-slate-50/50 dark:bg-background/95">

                <div className="flex items-center justify-between space-y-2 mb-2">
                    <h2 className="text-3xl font-bold tracking-tight">Panel de Control</h2>
                    <div className="flex items-center space-x-2">
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium flex items-center">
                            <Activity className="w-3 h-3 mr-1" />
                            Tiempo real
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Mes</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.revenue_this_month)}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                {revenueChange >= 0 ? (
                                    <span className="text-emerald-500 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> +{revenueChange.toFixed(1)}%</span>
                                ) : (
                                    <span className="text-rose-500 flex items-center"><ArrowDownRight className="w-3 h-3 mr-1" /> {revenueChange.toFixed(1)}%</span>
                                )}
                                <span className="ml-2 text-muted-foreground"> vs mes anterior</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos del Mes</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.expenses_this_month)}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                {expensesChange >= 0 ? (
                                    <span className="text-rose-500 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> +{expensesChange.toFixed(1)}%</span>
                                ) : (
                                    <span className="text-emerald-500 flex items-center"><ArrowDownRight className="w-3 h-3 mr-1" /> {expensesChange.toFixed(1)}%</span>
                                )}
                                <span className="ml-2 text-muted-foreground"> vs mes anterior</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Realizadas</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.sales_count_this_month}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                {salesCountChange >= 0 ? (
                                    <span className="text-emerald-500 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> +{salesCountChange.toFixed(1)}%</span>
                                ) : (
                                    <span className="text-rose-500 flex items-center"><ArrowDownRight className="w-3 h-3 mr-1" /> {salesCountChange.toFixed(1)}%</span>
                                )}
                                <span className="ml-2 text-muted-foreground"> vs mes anterior</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Productos Activos</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.products_count}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Total en catálogo
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Sales by User Section */}
                <Card className="w-full">
                    <CardHeader className="flex flex-col xl:flex-row xl:items-center justify-between pb-4 gap-4">
                        <div>
                            <CardTitle>Ventas por Usuario</CardTitle>
                            <CardDescription>Rendimiento del equipo de ventas</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <Select value={localFilters.branch_id} onValueChange={(val) => setLocalFilters({...localFilters, branch_id: val})}>
                                <SelectTrigger className="w-full sm:w-[160px] h-9">
                                    <SelectValue placeholder="Sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las sucursales</SelectItem>
                                    {branches?.map((b: any) => (
                                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Year Select */}
                            <Select
                                value={localFilters.month ? localFilters.month.substring(0, 4) : 'all'}
                                onValueChange={(val) => {
                                    if (val === 'all') {
                                        setLocalFilters({...localFilters, month: '', date: ''});
                                    } else {
                                        const m = localFilters.month ? localFilters.month.substring(5, 7) : '01';
                                        setLocalFilters({...localFilters, month: `${val}-${m}`, date: ''});
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-[110px] h-9">
                                    <SelectValue placeholder="Año" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Month Select */}
                            <Select
                                value={localFilters.month ? localFilters.month.substring(5, 7) : 'all'}
                                onValueChange={(val) => {
                                    if (val === 'all') {
                                        setLocalFilters({...localFilters, month: '', date: ''});
                                    } else {
                                        const y = localFilters.month ? localFilters.month.substring(0, 4) : new Date().getFullYear().toString();
                                        setLocalFilters({...localFilters, month: `${y}-${val}`, date: ''});
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-[130px] h-9">
                                    <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
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

                            <Input
                                type="date"
                                value={localFilters.date}
                                onChange={(e) => setLocalFilters({...localFilters, date: e.target.value, month: ''})}
                                className="h-9 w-full sm:w-[140px]"
                            />

                            <Button onClick={applyFilters} className="h-9 w-full sm:w-auto" variant="default">
                                <Filter className="w-4 h-4 mr-2" />
                                Filtrar
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {salesByUser && salesByUser.length > 0 ? (
                            <div className="grid lg:grid-cols-5 gap-8 items-start">
                                {/* Chart side - takes 3 columns */}
                                <div className="lg:col-span-3 h-[300px] w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={salesByUser}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
                                                dx={-10}
                                            />
                                            <Tooltip
                                                formatter={(value: any) => [
                                                    formatCurrency(Number(value)),
                                                    'Ingresos'
                                                ]}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                                cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                            />
                                            <Bar dataKey="total_amount" fill="#0f9aff" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                                {salesByUser.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#0076ff' : '#0f9aff'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Table side - takes 2 columns */}
                                <div className="lg:col-span-2 rounded-md border mt-4">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                                                <tr>
                                                    <th className="px-4 py-4 font-medium">Usuario</th>
                                                    <th className="px-4 py-4 font-medium text-center">Nro Ventas</th>
                                                    <th className="px-4 py-4 font-medium text-right">Total Ingresos</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {salesByUser.map((user: any, idx: number) => (
                                                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                        <td className="px-4 py-4 font-medium flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <Users className="w-4 h-4 text-primary" />
                                                            </div>
                                                            {user.name}
                                                        </td>
                                                        <td className="px-4 py-4 text-center text-base">{user.total_sales}</td>
                                                        <td className="px-4 py-4 text-right font-semibold text-base text-emerald-600 dark:text-emerald-500">
                                                            {formatCurrency(Number(user.total_amount))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                                <Users className="w-8 h-8 opacity-20" />
                                No hay ventas registradas para este filtro.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
