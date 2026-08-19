import { useState, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Trash2, ArrowLeft } from 'lucide-react';
import InputError from '@/components/input-error';

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
        notes: '',
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
        if (data.lines.find(l => l.product_id === product.id)) return;
        setData('lines', [
            ...data.lines,
            { product_id: product.id, product_name: product.name, internal_code: product.internal_code || '', quantity: 1, unit_cost: 0 }
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
                                    <Label htmlFor="document_type">Tipo</Label>
                                    <Select value={data.supplier_document_type} onValueChange={(v) => setData('supplier_document_type', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="FACTURA">Factura</SelectItem>
                                            <SelectItem value="BOLETA">Boleta</SelectItem>
                                            <SelectItem value="GUIA">Guía</SelectItem>
                                            <SelectItem value="TICKET">Ticket</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="series">Serie</Label>
                                    <Input id="series" value={data.supplier_document_series} onChange={e => setData('supplier_document_series', e.target.value)} placeholder="F001" />
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
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Información Adicional</h3>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas / Observaciones</Label>
                                <Textarea id="notes" rows={5} value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Detalles sobre la compra..." />
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
                                                    <div className="text-xs text-gray-500">{p.internal_code || 'Sin código'}</div>
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
                                                    step="0.01" 
                                                    value={line.unit_cost} 
                                                    onChange={e => updateLine(idx, 'unit_cost', parseFloat(e.target.value) || 0)} 
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                S/ {(line.quantity * line.unit_cost).toFixed(2)}
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

                        <div className="flex justify-end pt-4 border-t">
                            <div className="text-xl font-bold">
                                Total: S/ {total.toFixed(2)}
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
