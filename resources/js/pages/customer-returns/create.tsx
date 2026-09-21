import { Head, Link, useForm, router } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Save } from 'lucide-react';
import InputError from '@/components/input-error';

export default function CustomerReturnCreate({ sale }: { sale: any }) {
    if (!sale) {
        return (
            <>
                <div className="p-8 text-center">
                    <p className="text-red-500 mb-4">No se especific una venta original o no se encontr.</p>
                    <Link href={route('sales.index')}>
                        <Button>Ir a Ventas</Button>
                    </Link>
                </div>
            </>
        );
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Ventas', href: '/sales' },
        { title: `Venta ${sale.sale_number}`, href: `/sales/${sale.id}` },
        { title: 'Registrar Devolucin', href: '#' },
    ];

    // Initial state mapping sale lines to return quantities (default 0)
    const { data, setData, post, processing, errors } = useForm({
        sale_id: sale.id,
        operation_date: new Date().toISOString().split('T')[0],
        notes: '',
        lines: sale.lines.map((line: any) => ({
            sale_line_id: line.id,
            product_id: line.product_id,
            product_name: line.product_name_snapshot || (line.product ? line.product.name : ''),
            unit_price: parseFloat(line.unit_price),
            max_quantity: parseFloat(line.quantity), // The maximum they can return
            quantity: 0, // Initially returning 0
        })),
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Filter lines to only those with return quantity > 0
        const filteredLines = data.lines.filter(l => l.quantity > 0);
        
        if (filteredLines.length === 0) {
            alert("Debes ingresar una cantidad mayor a 0 en al menos un producto para registrar la devolucin.");
            return;
        }

        // We can't use useForm's post directly if we want to modify the payload dynamically easily without confusing Inertia.
        // Or we can just use `router.post` directly.
        router.post(route('customer-returns.store'), {
            sale_id: data.sale_id,
            operation_date: data.operation_date,
            notes: data.notes,
            lines: filteredLines,
        });
    };

    const totalReturnAmount = data.lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);

    return (
        <>
            <Head title={`Nueva Devolucin - Venta ${sale.sale_number}`} />
            
            <form onSubmit={submit} className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={route('sales.show', sale.id)}>
                            <Button type="button" variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Registrar Devolucin</h1>
                            <p className="text-muted-foreground">Venta origen: {sale.sale_number}</p>
                        </div>
                    </div>
                    <Button type="submit" disabled={processing || totalReturnAmount <= 0} className="gap-2">
                        <Save className="h-4 w-4" /> Crear Borrador
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Productos a Devolver</CardTitle>
                            <CardDescription>Indica la cantidad que est devolviendo el cliente. (0 = no se devuelve)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="text-right">Precio Venta</TableHead>
                                        <TableHead className="text-center">Cant. Original</TableHead>
                                        <TableHead className="text-center w-32">Cant. a Devolver</TableHead>
                                        <TableHead className="text-right">Subtotal Devolucin</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.lines.map((line, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{line.product_name}</TableCell>
                                            <TableCell className="text-right">{sale.currency_code} {line.unit_price.toFixed(2)}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{line.max_quantity}</TableCell>
                                            <TableCell className="text-center">
                                                <Input 
                                                    type="number" 
                                                    step="1"
                                                    min="0"
                                                    max={line.max_quantity}
                                                    value={line.quantity === 0 ? '' : line.quantity}
                                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                    placeholder="0"
                                                    className="w-full text-center"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-red-600">
                                                {line.quantity > 0 && `- ${sale.currency_code} ${(line.quantity * line.unit_price).toFixed(2)}`}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {errors.lines && <InputError message={errors.lines} className="mt-2" />}
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Resumen y Detalles</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="operation_date">Fecha de Devolucin</Label>
                                    <Input 
                                        id="operation_date" 
                                        type="date" 
                                        value={data.operation_date} 
                                        onChange={e => setData('operation_date', e.target.value)} 
                                    />
                                    <InputError message={errors.operation_date} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Motivo (Notas)</Label>
                                    <Input 
                                        id="notes" 
                                        value={data.notes} 
                                        onChange={e => setData('notes', e.target.value)} 
                                        placeholder="Ej: Producto daado, no era lo que esperaba..."
                                    />
                                    <InputError message={errors.notes} />
                                </div>

                                <div className="pt-4 border-t mt-4 flex justify-between items-center text-lg">
                                    <span className="font-bold">Total a Devolver:</span>
                                    <span className="font-bold text-red-600">
                                        - {sale.currency_code} {totalReturnAmount.toFixed(2)}
                                    </span>
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
