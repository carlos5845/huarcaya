import { Head, useForm, Link } from '@inertiajs/react';
import { Search, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Ventas', href: '/sales' },
    { title: 'Nueva Venta', href: '#' },
];

export default function SaleCreate({ customers }: { customers: any[] }) {
    const defaultCustomer = customers.length > 0 ? (customers.find(c => c.legal_name.toLowerCase().includes('public') || c.legal_name.toLowerCase().includes('general'))?.id?.toString() || customers[0].id.toString()) : '';

    const { data, setData, post, processing, errors } = useForm({
        customer_id: defaultCustomer,
        sale_type: 'BOLETA',
        operation_date: new Date().toISOString().split('T')[0],
        external_document_series: '',
        external_document_number: '',
        notes: '',
        apply_tax: false,
        lines: [] as { product_id: number; product_name: string; internal_code: string; quantity: number; unit_price: number }[],
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const getSeriesPlaceholder = (type: string) => {
        switch (type) {
            case 'FACTURA': return 'F001';
            case 'BOLETA': return 'B001';
            case 'TICKET': return 'TK01';
            case 'ORDEN_COMPRA': return 'OC01';
            default: return 'Serie...';
        }
    };

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);

            return;
        }

        const delayDebounceFn = setTimeout(() => {
            setIsSearching(true);
            fetch(`/products/search?q=${encodeURIComponent(searchQuery)}`, {
                headers: { 'Accept': 'application/json' }
            })
            .then(res => res.json())
            .then(data => {
                setSearchResults(data);
                setIsSearching(false);
            })
            .catch(() => setIsSearching(false));
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const addProduct = (product: any) => {
        if (data.lines.find(l => l.product_id === product.id)) {
return;
}

        setData('lines', [
            ...data.lines,
            { product_id: product.id, product_name: product.name, internal_code: product.primary_reference || product.internal_code || 'Sin código', quantity: 1, unit_price: product.suggested_price || 0 }
        ]);
        setSearchQuery('');
        searchResults.length = 0;
    };

    const updateLine = (index: number, field: string, value: number) => {
        const newLines = [...data.lines];
        newLines[index] = { ...newLines[index], [field]: value };
        setData('lines', newLines);
    };

    const removeLine = (index: number) => {
        setData('lines', data.lines.filter((_, i) => i !== index));
    };

    const total = data.lines.reduce((acc, line) => acc + (line.quantity * line.unit_price), 0);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/sales');
    };

    return (
        <>
            <Head title="Nueva Venta" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-5xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/sales">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Nueva Venta</h2>
                            <p className="text-sm text-gray-500">Registra una nueva entrada de productos.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border">
                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Datos del Comprobante</h3>
                            
                            <div className="space-y-2">
                                <Label htmlFor="customer_id">Cliente <span className="text-red-500">*</span></Label>
                                <Select value={data.customer_id} onValueChange={(v) => setData('customer_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar cliente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.legal_name} ({s.document_number || 'S/D'})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.customer_id} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sale_type">Tipo de Documento</Label>
                                    <Select value={data.sale_type} onValueChange={(v) => setData('sale_type', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="FACTURA">Factura</SelectItem>
                                            <SelectItem value="BOLETA">Boleta</SelectItem>
                                            <SelectItem value="TICKET">Ticket</SelectItem>
                                            <SelectItem value="ORDEN_COMPRA">Orden de Compra</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.sale_type} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="operation_date">Fecha de Venta</Label>
                                    <Input type="date" id="operation_date" value={data.operation_date} onChange={e => setData('operation_date', e.target.value)} />
                                    <InputError message={errors.operation_date} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="external_document_series">Serie</Label>
                                    <Input 
                                        type="text" 
                                        id="external_document_series" 
                                        placeholder={getSeriesPlaceholder(data.sale_type)}
                                        value={data.external_document_series} 
                                        onChange={e => setData('external_document_series', e.target.value)} 
                                    />
                                    <InputError message={errors.external_document_series} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="external_document_number">Número</Label>
                                    <Input 
                                        type="text" 
                                        id="external_document_number" 
                                        placeholder="000123"
                                        value={data.external_document_number} 
                                        onChange={e => setData('external_document_number', e.target.value)} 
                                    />
                                    <InputError message={errors.external_document_number} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Información Adicional</h3>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas / Observaciones</Label>
                                <Textarea id="notes" rows={5} value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Detalles sobre la venta..." />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border space-y-4">
                        <div className="flex justify-between items-end border-b pb-2">
                            <h3 className="font-medium">Detalle de Productos</h3>
                            <div className="w-1/2 relative">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Buscar producto por nombre o código..."
                                        className="pl-8"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {searchResults.map(p => (
                                            <div 
                                                key={p.id} 
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer flex justify-between items-center"
                                                onClick={() => addProduct(p)}
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{p.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {p.primary_reference || p.internal_code || 'Sin código'} | {p.brand?.name || 'Sin marca'}
                                                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${p.available_quantity > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                            Stock: {p.available_quantity || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <InputError message={errors.lines} />

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="w-32">Cantidad</TableHead>
                                    <TableHead className="w-32">Precio Unitario</TableHead>
                                    <TableHead className="w-32 text-right">Subtotal</TableHead>
                                    <TableHead className="w-16"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.lines.length > 0 ? (
                                    data.lines.map((line, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <div className="font-medium">{line.product_name}</div>
                                                <div className="text-xs text-muted-foreground">{line.internal_code}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    min="1" 
                                                    step="1" 
                                                    value={line.quantity} 
                                                    onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value) || 0)} 
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.01" 
                                                    value={line.unit_price} 
                                                    onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)} 
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                S/ {(line.quantity * line.unit_price).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeLine(idx)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Busca y agrega productos a la venta.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <div className="flex justify-end pt-4 border-t">
                            <div className="text-right space-y-2 w-72">
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span>S/ {total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="apply_tax" checked={data.apply_tax} onCheckedChange={(c) => setData('apply_tax', !!c)} />
                                        <Label htmlFor="apply_tax" className="cursor-pointer text-muted-foreground">Aplicar IGV (18%)</Label>
                                    </div>
                                    <span>S/ {data.apply_tax ? (total * 0.18).toFixed(2) : '0.00'}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold pt-2 border-t mt-2">
                                    <span>Total:</span>
                                    <span>S/ {(data.apply_tax ? (total * 1.18) : total).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Link href="/sales">
                            <Button type="button" variant="outline">Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={processing || data.lines.length === 0}>
                            Guardar Venta
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}


SaleCreate.layout = {
    breadcrumbs,
};
