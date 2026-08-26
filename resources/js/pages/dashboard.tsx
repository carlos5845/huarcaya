import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Package, ShoppingCart, TrendingUp, ArrowRight, Activity, CreditCard, DollarSign } from 'lucide-react';
import { dashboard } from '@/routes';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function Dashboard({ stats, salesChart }: any) {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6 bg-slate-50/50 dark:bg-background/95">
                
                <div className="flex items-center justify-between space-y-2 mb-2">
                    <h2 className="text-3xl font-bold tracking-tight">Panel de Control</h2>
                    <div className="flex items-center space-x-2">
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium flex items-center">
                            <Activity className="w-4 h-4 mr-2" />
                            Actualizado en tiempo real
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Clientes */}
                    <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white transition-all hover:scale-[1.02] hover:shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-md font-medium text-blue-50">Total Clientes</CardTitle>
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold tracking-tight mt-1">{stats?.customers_count || 0}</div>
                            <p className="text-sm text-blue-100 mt-1 flex items-center">
                                <ArrowRight className="w-3 h-3 mr-1" /> Clientes registrados
                            </p>
                        </CardContent>
                    </Card>

                    {/* Productos */}
                    <Card className="border-none shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white transition-all hover:scale-[1.02] hover:shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-md font-medium text-purple-50">Catlogo</CardTitle>
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Package className="h-5 w-5 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold tracking-tight mt-1">{stats?.products_count || 0}</div>
                            <p className="text-sm text-purple-100 mt-1 flex items-center">
                                <ArrowRight className="w-3 h-3 mr-1" /> Productos en stock
                            </p>
                        </CardContent>
                    </Card>

                    {/* Ventas */}
                    <Card className="border-none shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white transition-all hover:scale-[1.02] hover:shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-md font-medium text-emerald-50">Total Ventas</CardTitle>
                            <div className="p-2 bg-white/20 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold tracking-tight mt-1">{stats?.sales_count || 0}</div>
                            <p className="text-sm text-emerald-100 mt-1 flex items-center">
                                <ArrowRight className="w-3 h-3 mr-1" /> Ventas realizadas
                            </p>
                        </CardContent>
                    </Card>

                    {/* Compras */}
                    <Card className="border-none shadow-md bg-gradient-to-br from-orange-500 to-orange-600 text-white transition-all hover:scale-[1.02] hover:shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-md font-medium text-orange-50">Total Compras</CardTitle>
                            <div className="p-2 bg-white/20 rounded-lg">
                                <ShoppingCart className="h-5 w-5 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold tracking-tight mt-1">{stats?.purchases_count || 0}</div>
                            <p className="text-sm text-orange-100 mt-1 flex items-center">
                                <ArrowRight className="w-3 h-3 mr-1" /> Compras a proveedores
                            </p>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Main Content Area */}
                <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7">
                    
                    {/* Chart Section */}
                    <Card className="col-span-4 shadow-sm border-muted/50 rounded-xl overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-6 border-b border-muted/50">
                            <CardTitle className="text-xl flex items-center">
                                <Activity className="w-5 h-5 mr-2 text-primary" />
                                Historial de Ventas
                            </CardTitle>
                            <CardDescription className="text-sm">Rendimiento mensual de los ltimos 6 meses</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8">
                            <div className="h-[350px]">
                                {salesChart && salesChart.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={salesChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(value) => `S/ ${value}`} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                                formatter={(value: any) => [`S/ ${value}`, 'Total']}
                                            />
                                            <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col h-full items-center justify-center text-muted-foreground bg-slate-50/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 dark:bg-slate-900/20 p-12">
                                        <TrendingUp className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
                                        <p>No hay datos suficientes para mostrar el grfico</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Recent Sales Section */}
                    <Card className="col-span-3 shadow-sm border-muted/50 rounded-xl flex flex-col">
                        <CardHeader className="bg-muted/30 border-b border-muted/50">
                            <CardTitle className="text-xl flex items-center">
                                <CreditCard className="w-5 h-5 mr-2 text-primary" />
                                Transacciones Recientes
                            </CardTitle>
                            <CardDescription>Las ltimas 5 ventas concretadas</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <div className="divide-y divide-border/50">
                                {stats?.recent_sales && stats.recent_sales.map((sale: any) => (
                                    <div key={sale.id} className="flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                                <span className="font-bold text-sm uppercase">
                                                    {sale.customer && sale.customer.legal_name ? sale.customer.legal_name.charAt(0) : 'G'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground line-clamp-1">
                                                    {sale.customer ? sale.customer.legal_name : 'Cliente Genrico'}
                                                </p>
                                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                                                        {sale.sale_number}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <div className="inline-flex items-center font-bold px-2.5 py-1 rounded-full text-sm bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                {sale.currency_code === 'USD' ? '$' : 'S/'} {parseFloat(sale.total_amount).toFixed(2)}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-1 font-medium">
                                                {new Date(sale.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {(!stats?.recent_sales || stats?.recent_sales.length === 0) && (
                                    <div className="flex flex-col items-center justify-center p-12 text-center">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                            <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <h3 className="font-medium text-slate-600 dark:text-slate-400">No hay ventas</h3>
                                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Todava no se han registrado ventas en el sistema.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
