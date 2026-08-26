import { Head, useForm, Link } from '@inertiajs/react';
import { Search, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compras', href: '/purchases' },
    { title: 'Nueva Compra', href: '#' },
];

export default function PurchaseCreate({ suppliers }: { suppliers: any[] }) {
    const { data, setData, post, processing, errors } = useForm({
        supplier_id: '',
        supplier_document_type: 'FACTURA',
        supplier_document_series: '',
        supplier_document_number: '',
        document_date: new Date().toISOString().split('T')[0],
        tax_mode: 'PLUS_TAX',
        currency_code: 'PEN',
        exchange_rate: 1.0,
        notes: '',
        document_file: null as File | null,
        lines: [] as { product_id: number; product_name: string; internal_code: string; quantity: number; unit_cost: number }[],
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

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
            { product_id: product.id, product_name: product.name, internal_code: product.primary_reference || product.internal_code || 'Sin código', quantity: 1, unit_cost: 0 }
        ]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const updateLine = (index: number, field: string, value: number) => {
        const newLines = [...data.lines];
        newLines[index] = { ...newLines[index], [field]: value };
        setData('lines', newLines);
    };

    const removeLine = (index: number) => {
        setData('lines', data.lines.filter((_, i) => i !== index));
    };

    const total = data.lines.reduce((acc, line) => acc + (line.quantity * line.unit_cost), 0);

    const getSeriesPlaceholder = (type: string) => {
        switch (type) {
            case 'FACTURA': return 'F001';
            case 'BOLETA': return 'B001';
            case 'GUIA': return 'G001';
            case 'TICKET': return 'TK01';
            case 'ORDEN_COMPRA': return 'OC01';
            default: return '001';
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/purchases');
    };

    return (
        <>
            <Head title="Nueva Compra" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-5xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/purchases">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Nueva Compra</h2>
                            <p className="text-sm text-gray-500">Registra una nueva entrada de productos.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border">
                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Datos del Comprobante</h3>
                            
                            <div className="space-y-2">
                                <Label htmlFor="supplier_id">Proveedor <span className="text-red-500">*</span></Label>
                                <Select value={data.supplier_id} onValueChange={(v) => setData('supplier_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar proveedor..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.legal_name} ({s.document_number || 'S/D'})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.supplier_id} />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="document_type">Tipo de Documento</Label>
                                    <Select value={data.supplier_document_type} onValueChange={(v) => setData('supplier_document_type', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="FACTURA">Factura</SelectItem>
                                            <SelectItem value="BOLETA">Boleta</SelectItem>
                                            <SelectItem value="ORDEN_COMPRA">Orden de Compra</SelectItem>
                                            <SelectItem value="GUIA">Guía de Remisión</SelectItem>
                                            <SelectItem value="TICKET">Ticket</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="series">Serie</Label>
                                    <Input id="series" value={data.supplier_document_series} onChange={e => setData('supplier_document_series', e.target.value)} placeholder={getSeriesPlaceholder(data.supplier_document_type)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="number">Número</Label>
                                    <Input id="number" value={data.supplier_document_number} onChange={e => setData('supplier_document_number', e.target.value)} placeholder="000123" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date">Fecha del Documento <span className="text-red-500">*</span></Label>
                                <Input id="date" type="date" value={data.document_date} onChange={e => setData('document_date', e.target.value)} required />
                                <InputError message={errors.document_date} />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="currency_code">Moneda <span className="text-red-500">*</span></Label>
                                <Select value={data.currency_code} onValueChange={(v) => setData('currency_code', v)}>
                                    <SelectTrigger id="currency_code">
                                        <SelectValue placeholder="Seleccione Moneda" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PEN">Soles (S/)</SelectItem>
                                        <SelectItem value="USD">Dólares ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.currency_code} />
                            </div>
                            
                            {data.currency_code === 'USD' && (
                                <div className="space-y-2">
                                    <Label htmlFor="exchange_rate">Tipo de Cambio <span className="text-red-500">*</span></Label>
                                    <Input id="exchange_rate" type="number" step="0.001" min="0.01" value={data.exchange_rate} onChange={e => setData('exchange_rate', parseFloat(e.target.value) || 1)} required />
                                    <InputError message={errors.exchange_rate} />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Información Adicional</h3>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas / Observaciones</Label>
                                <Textarea id="notes" rows={3} value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Detalles sobre la compra..." />
                            </div>
                            <div className="space-y-2 mt-4 border-t pt-4">
                                <Label htmlFor="document_file">Archivo de Factura (PDF/Imagen)</Label>
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer relative">
                                    <Input 
                                        id="document_file" 
                                        type="file" 
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={e => setData('document_file', e.target.files?.[0] || null)} 
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {data.document_file ? data.document_file.name : "Haz clic para examinar o arrastra el archivo aquí"}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Soporta PDF, JPG, PNG (Max 5MB)</p>
                                </div>
                                <InputError message={errors.document_file} />
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
                                        placeholder="Buscar por nombre, marca o código..."
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
                                                    <div className="text-xs text-gray-500">{p.primary_reference || p.internal_code || 'Sin código'} | {p.brand?.name || 'Sin marca'}</div>
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
                                    <TableHead className="w-32">Costo Unitario</TableHead>
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
                                                    step="0.001" 
                                                    value={line.unit_cost} 
                                                    onChange={e => updateLine(idx, 'unit_cost', parseFloat(e.target.value) || 0)} 
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {data.currency_code === 'USD' ? '$' : 'S/'} {(line.quantity * line.unit_cost).toFixed(2)}
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
                                            Busca y agrega productos a la compra.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <div className="flex flex-col md:flex-row justify-between pt-4 border-t gap-6">
                            <div className="flex-1 max-w-sm">
                                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Configuración de Impuestos</h4>
                                <RadioGroup value={data.tax_mode} onValueChange={(v) => setData('tax_mode', v)} className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="INCLUDED" id="tax_included" />
                                        <Label htmlFor="tax_included" className="cursor-pointer">Los precios incluyen IGV (Extracción)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="PLUS_TAX" id="tax_plus" />
                                        <Label htmlFor="tax_plus" className="cursor-pointer">Los precios NO incluyen IGV (Adición)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="EXEMPT" id="tax_exempt" />
                                        <Label htmlFor="tax_exempt" className="cursor-pointer">Operación Exonerada / Inafecta</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="text-right space-y-2 w-72">
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">Op. Gravada:</span>
                                    <span>{data.currency_code === 'USD' ? '$' : 'S/'} {(data.tax_mode === 'INCLUDED' ? (total / 1.18) : total).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">IGV (18%):</span>
                                    <span>{data.currency_code === 'USD' ? '$' : 'S/'} {(data.tax_mode === 'INCLUDED' ? (total - (total / 1.18)) : data.tax_mode === 'PLUS_TAX' ? (total * 0.18) : 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold pt-2 border-t mt-2">
                                    <span>Total a Pagar:</span>
                                    <span>{data.currency_code === 'USD' ? '$' : 'S/'} {(data.tax_mode === 'PLUS_TAX' ? (total * 1.18) : total).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Link href="/purchases">
                            <Button type="button" variant="outline">Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={processing || data.lines.length === 0}>
                            Guardar Compra
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}


PurchaseCreate.layout = {
    breadcrumbs,
};
