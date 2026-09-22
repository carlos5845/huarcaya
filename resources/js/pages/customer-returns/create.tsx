import { Head, Link, useForm, router } from '@inertiajs/react';
import { 
    ArrowLeft, 
    Save, 
    Search, 
    FileText, 
    User, 
    Calendar, 
    RotateCcw,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import React, { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Devoluciones', href: '/customer-returns' },
    { title: 'Nueva Devolución', href: '#' },
];

export default function CustomerReturnCreate({ 
    sale, 
    recentSales = [], 
    search = '' 
}: { 
    sale?: any; 
    recentSales?: any[]; 
    search?: string; 
}) {
    const [searchTerm, setSearchTerm] = useState(search);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/customer-returns/create', { search: searchTerm }, { preserveState: true });
    };

    // Si no hay venta seleccionada, mostramos el buscador/selector de ventas
    if (!sale) {
        return (
            <>
                <Head title="Nueva Devolución - Seleccionar Venta" />

                <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-5xl mx-auto w-full">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Link href="/customer-returns">
                            <Button variant="outline" size="icon" className="h-9 w-9">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                                <Link href="/customer-returns" className="hover:text-foreground">Devoluciones</Link>
                                <span>&rsaquo;</span>
                                <span className="font-medium text-foreground">Nueva Devolución</span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <RotateCcw className="h-6 w-6 text-primary" />
                                Seleccionar Venta para Devolución
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Toda devolución o nota de crédito debe estar vinculada a una venta confirmada
                            </p>
                        </div>
                    </div>

                    {/* Buscador de Ventas */}
                    <Card className="border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Buscar Venta Confirmada</CardTitle>
                            <CardDescription className="text-xs">
                                Ingresa el número de comprobante, serie, nombre del cliente o DNI/RUC
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Ej: B001-000001, Juan Pérez, 20601234567..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 h-9 text-xs"
                                    />
                                </div>
                                <Button type="submit" size="sm" className="h-9 text-xs font-medium">
                                    Buscar
                                </Button>
                                {searchTerm && (
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-9 text-xs"
                                        onClick={() => {
                                            setSearchTerm('');
                                            router.get('/customer-returns/create');
                                        }}
                                    >
                                        Limpiar
                                    </Button>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    {/* Tabla de Ventas Recientes / Encontradas */}
                    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Ventas Confirmadas Disponibles ({recentSales.length})
                            </h2>
                            <span className="text-[11px] text-muted-foreground">
                                Mostrando las ventas más recientes de tu sucursal
                            </span>
                        </div>

                        {recentSales.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="text-xs font-bold uppercase py-2.5">Comprobante / Venta</TableHead>
                                            <TableHead className="text-xs font-bold uppercase py-2.5">Fecha</TableHead>
                                            <TableHead className="text-xs font-bold uppercase py-2.5">Cliente</TableHead>
                                            <TableHead className="text-xs font-bold uppercase py-2.5 text-right">Total</TableHead>
                                            <TableHead className="text-xs font-bold uppercase py-2.5 text-center">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentSales.map((s: any) => (
                                            <TableRow key={s.id} className="hover:bg-muted/30">
                                                <TableCell className="font-mono text-xs font-semibold">
                                                    <div>
                                                        {s.external_document_series 
                                                            ? `${s.external_document_series}-${s.external_document_number || ''}` 
                                                            : s.sale_number}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-sans">
                                                        {s.external_document_type || s.sale_type || 'Venta'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {new Date(s.operation_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="font-medium text-foreground">
                                                        {s.customer_name_snapshot || s.customer?.legal_name || 'Público General'}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {s.customer_document_snapshot || s.customer?.document_number || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-right font-bold font-mono">
                                                    {s.currency_code === 'USD' ? '$' : 'S/'} {Number(s.total_amount).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Link href={`/customer-returns/create?sale_id=${s.id}`}>
                                                        <Button size="sm" variant="default" className="h-8 gap-1.5 text-xs font-medium">
                                                            <span>Seleccionar</span>
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                No se encontraron ventas confirmadas con los filtros ingresados.
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }

    // Si HAY una venta seleccionada, mostramos el formulario de devolución
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Ventas', href: '/sales' },
        { title: `Venta ${sale.sale_number}`, href: `/sales/${sale.id}` },
        { title: 'Registrar Devolución', href: '#' },
    ];

    const { data, setData, processing, errors } = useForm({
        sale_id: sale.id,
        operation_date: new Date().toISOString().split('T')[0],
        notes: '',
        lines: sale.lines.map((line: any) => {
            const originalQty = parseFloat(line.quantity);
            const alreadyReturned = parseFloat(line.already_returned_quantity || 0);
            const available = parseFloat(line.available_return_quantity ?? (originalQty - alreadyReturned));

            return {
                sale_line_id: line.id,
                product_id: line.product_id,
                product_name: line.product_name_snapshot || (line.product ? line.product.name : ''),
                product_reference: line.product_reference_snapshot || (line.product ? line.product.primary_reference : ''),
                unit_price: parseFloat(line.unit_price),
                original_quantity: originalQty,
                already_returned_quantity: alreadyReturned,
                max_quantity: Math.max(0, available),
                quantity: 0,
            };
        }),
    });

    const handleQuantityChange = (index: number, val: string) => {
        let parsed = parseFloat(val);
        if (isNaN(parsed)) parsed = 0;
        
        const max = data.lines[index].max_quantity;
        if (parsed > max) parsed = max;
        if (parsed < 0) parsed = 0;

        const newLines = [...data.lines];
        newLines[index].quantity = parsed;
        setData('lines', newLines);
    };

    const handleSubmit = (confirmNow: boolean = false) => {
        const filteredLines = data.lines.filter(l => l.quantity > 0);
        
        if (filteredLines.length === 0) {
            alert('Debes ingresar una cantidad mayor a 0 en al menos un producto para registrar la devolución.');
            return;
        }

        if (confirmNow) {
            if (!confirm('¿Estás seguro de registrar y CONFIRMAR esta devolución? El inventario retornará al Kardex inmediatamente.')) {
                return;
            }
        }

        router.post('/customer-returns', {
            sale_id: data.sale_id,
            operation_date: data.operation_date,
            notes: data.notes,
            confirm_now: confirmNow,
            lines: filteredLines,
        });
    };

    const totalReturnAmount = data.lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
    const currencySymbol = sale.currency_code === 'USD' ? '$' : 'S/';

    return (
        <>
            <Head title={`Nueva Devolución - Venta ${sale.sale_number}`} />
            
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} className="flex h-full flex-1 flex-col gap-5 rounded-xl p-4 max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/sales/${sale.id}`}>
                            <Button type="button" variant="outline" size="icon" className="h-9 w-9">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                                <Link href="/customer-returns" className="hover:text-foreground">Devoluciones</Link>
                                <span>&rsaquo;</span>
                                <Link href={`/sales/${sale.id}`} className="hover:text-foreground">Venta #{sale.sale_number}</Link>
                                <span>&rsaquo;</span>
                                <span className="font-medium text-foreground">Nueva Devolución</span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <RotateCcw className="h-6 w-6 text-primary" />
                                Registrar Devolución (Nota de Crédito)
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Venta origen: <span className="font-mono font-semibold text-foreground">{sale.sale_number}</span> | Cliente: <span className="font-semibold text-foreground">{sale.customer_name_snapshot || sale.customer?.legal_name || 'Público General'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/customer-returns/create">
                            <Button type="button" variant="outline" size="sm" className="h-9 text-xs">
                                Cambiar Venta
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing || totalReturnAmount <= 0} size="sm" className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
                            <Save className="h-4 w-4" /> Guardar Borrador
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Tabla de Productos a Devolver */}
                    <Card className="lg:col-span-2 border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                                Productos de la Venta
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Especifica las cantidades que devuelve el cliente. Si un ítem no se devuelve, déjalo en 0.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-4">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="text-xs font-bold uppercase py-2.5">Producto</TableHead>
                                            <TableHead className="text-right text-xs font-bold uppercase py-2.5">Precio</TableHead>
                                            <TableHead className="text-center text-xs font-bold uppercase py-2.5">Vendida</TableHead>
                                            <TableHead className="text-center text-xs font-bold uppercase py-2.5">Ya Devuelto</TableHead>
                                            <TableHead className="text-center text-xs font-bold uppercase py-2.5">Disponible</TableHead>
                                            <TableHead className="text-center text-xs font-bold uppercase py-2.5 w-28">A Devolver</TableHead>
                                            <TableHead className="text-right text-xs font-bold uppercase py-2.5">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.lines.map((line, index) => {
                                            const isFullyReturned = line.max_quantity <= 0;
                                            return (
                                                <TableRow key={index} className={`hover:bg-muted/20 ${isFullyReturned ? 'opacity-50' : ''}`}>
                                                    <TableCell className="text-xs font-medium max-w-[200px]">
                                                        <div className="font-bold text-foreground truncate">{line.product_name}</div>
                                                        {line.product_reference && (
                                                            <div className="text-[10px] text-muted-foreground font-mono">{line.product_reference}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-mono">
                                                        {currencySymbol} {line.unit_price.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                                                        {line.original_quantity}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs font-mono">
                                                        {line.already_returned_quantity > 0 ? (
                                                            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                                                {line.already_returned_quantity}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground/40">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs font-bold font-mono">
                                                        {line.max_quantity}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {isFullyReturned ? (
                                                            <span className="text-[11px] text-muted-foreground italic">Completado</span>
                                                        ) : (
                                                            <Input 
                                                                type="number" 
                                                                step="1"
                                                                min="0"
                                                                max={line.max_quantity}
                                                                value={line.quantity === 0 ? '' : line.quantity}
                                                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                                placeholder="0"
                                                                className="h-8 text-center text-xs font-bold bg-background border-input"
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                                                        {line.quantity > 0 
                                                            ? `- ${currencySymbol} ${(line.quantity * line.unit_price).toFixed(2)}` 
                                                            : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            {errors.lines && <InputError message={errors.lines} className="mt-2" />}
                        </CardContent>
                    </Card>

                    {/* Resumen y Configuración */}
                    <div className="space-y-4">
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                                    Detalles de Devolución
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xs">
                                <div className="space-y-1.5">
                                    <Label htmlFor="operation_date" className="text-xs font-medium">Fecha de Emisión</Label>
                                    <Input 
                                        id="operation_date" 
                                        type="date" 
                                        value={data.operation_date} 
                                        onChange={e => setData('operation_date', e.target.value)} 
                                        className="h-9 text-xs"
                                    />
                                    <InputError message={errors.operation_date} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="notes" className="text-xs font-medium">Motivo / Observaciones</Label>
                                    <Input 
                                        id="notes" 
                                        value={data.notes} 
                                        onChange={e => setData('notes', e.target.value)} 
                                        placeholder="Ej: Producto dañado de fábrica, cambio de modelo..."
                                        className="h-9 text-xs"
                                    />
                                    <InputError message={errors.notes} />
                                </div>

                                <div className="pt-4 border-t border-border mt-4 flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                                        <span>Total Original Venta:</span>
                                        <span className="font-mono">{currencySymbol} {Number(sale.total_amount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-base pt-2">
                                        <span className="font-bold text-foreground">Total Devolución:</span>
                                        <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                                            - {currencySymbol} {totalReturnAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 mt-3">
                                    <Button 
                                        type="button" 
                                        onClick={() => handleSubmit(true)}
                                        disabled={processing || totalReturnAmount <= 0} 
                                        className="w-full h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                    >
                                        <CheckCircle2 className="h-4 w-4" /> Guardar y Confirmar
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        onClick={() => handleSubmit(false)}
                                        disabled={processing || totalReturnAmount <= 0} 
                                        className="w-full h-9 gap-1.5 text-xs font-semibold"
                                    >
                                        <Save className="h-4 w-4" /> Guardar como Borrador
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </>
    );
}

CustomerReturnCreate.layout = {
    breadcrumbs,
};
