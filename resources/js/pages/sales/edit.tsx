import { Check, ChevronsUpDown, UserPlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, normalizeSearch } from '@/lib/utils';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
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
    { title: 'Ventas', href: '/sales' },
    { title: 'Editar Venta', href: '#' },
];

export default function SaleEdit({ sale, customers }: { sale: any; customers: any[] }) {
    const { company_settings } = usePage<any>().props;
    const globalExchangeRate = company_settings?.exchange_rate ? parseFloat(company_settings.exchange_rate) : 3.80;

    
    const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);
    const [openCustomerDialog, setOpenCustomerDialog] = useState(false);

    const customerForm = useForm({
        document_type: 'DNI',
        document_number: '',
        legal_name: '',
        status: 'ACTIVE',
    });

    const submitCustomer = (e: React.FormEvent) => {
        e.preventDefault();
        customerForm.post('/customers', {
            preserveScroll: true,
            onSuccess: () => {
                setOpenCustomerDialog(false);
                customerForm.reset();
            },
        });
    };

    const { data, setData, put, processing, errors } = useForm({
        customer_id: sale.customer_id?.toString() || '',
        sale_type: sale.sale_type || 'BOLETA',
        operation_date: sale.operation_date ? sale.operation_date.split(' ')[0] : new Date().toISOString().split('T')[0],
        external_document_series: sale.external_document_series || '',
        external_document_number: sale.external_document_number || '',
        currency_code: sale.currency_code || 'PEN',
        exchange_rate: sale.exchange_rate || 1.0,
        notes: sale.notes || '',
        tax_mode: sale.lines?.[0]?.tax_amount > 0 ? (sale.total_amount > sale.subtotal_amount ? 'PLUS_TAX' : 'INCLUDED') : 'EXEMPT',
        lines: (sale.lines || []).map((l: any) => ({
            product_id: l.product_id,
            product_name: l.product_name_snapshot,
            internal_code: l.product_reference_snapshot,
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price)
        })) as { product_id: number; product_name: string; internal_code: string; quantity: number; unit_price: number }[],
    });

    useEffect(() => {
        if (data.currency_code === 'USD') {
            setData('exchange_rate', globalExchangeRate);
        } else if (data.currency_code === 'PEN') {
            setData('exchange_rate', 1.0);
        }
    }, [data.currency_code]);

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
        put(`/sales/${sale.id}`);
    };

    return (
        <>
            <Head title="Editar Venta" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-5xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/sales">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Editar Venta</h2>
                            <p className="text-sm text-gray-500">Registra una nueva entrada de productos.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border">
                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Datos del Comprobante</h3>
                            
                            <div className="space-y-2 flex flex-col">
                                <Label htmlFor="customer_id">Cliente <span className="text-red-500">*</span></Label>
                                <div className="flex items-center gap-2">
                                    <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openCustomerCombobox}
                                                className="flex-1 justify-between"
                                            >
                                                {data.customer_id
                                                    ? customers.find((s) => s.id.toString() === data.customer_id)?.legal_name || 'Cliente desconocido'
                                                    : "Buscar cliente..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start">
                                            <Command filter={(value, search) => value.includes(normalizeSearch(search)) ? 1 : 0}>
                                                <CommandInput placeholder="Buscar por nombre o documento..." />
                                                <CommandList>
                                                    <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                                                    <CommandGroup>
                                                        {customers.map((s) => (
                                                            <CommandItem
                                                                key={s.id}
                                                                value={`${normalizeSearch(s.legal_name)} ${s.document_number}`}
                                                                onSelect={() => {
                                                                    setData('customer_id', s.id.toString());
                                                                    setOpenCustomerCombobox(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        data.customer_id === s.id.toString() ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {s.legal_name} {s.document_number ? `(${s.document_number})` : ''}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                                <div className="p-2 border-t flex gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        className="w-full justify-start text-sm text-blue-600 dark:text-blue-400" 
                                                        onClick={() => {
                                                            setData('customer_id', generic_customer_id.toString());
                                                            setOpenCustomerCombobox(false);
                                                        }}
                                                    >
                                                        <UserPlus className="mr-2 h-4 w-4" />
                                                        Usar Cliente Genérico
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        className="w-full justify-start text-sm text-green-600 dark:text-green-400" 
                                                        onClick={() => {
                                                            setOpenCustomerCombobox(false);
                                                            setOpenCustomerDialog(true);
                                                        }}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Nuevo Cliente
                                                    </Button>
                                                </div>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
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
                                <div className="space-y-2">
                                    <Label htmlFor="currency_code">Moneda</Label>
                                    <Select value={data.currency_code} onValueChange={(v) => setData('currency_code', v)}>
                                        <SelectTrigger id="currency_code">
                                            <SelectValue placeholder="Seleccione Moneda" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PEN">Soles (PEN)</SelectItem>
                                            <SelectItem value="USD">Dólares (USD)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.currency_code} />
                                </div>
                                {data.currency_code === 'USD' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="exchange_rate">Tipo de Cambio</Label>
                                        <Input id="exchange_rate" type="number" step="0.001" min="0.01" value={data.exchange_rate} onChange={e => setData('exchange_rate', parseFloat(e.target.value) || 1)} required />
                                        <InputError message={errors.exchange_rate} />
                                    </div>
                                )}
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
                                                {data.currency_code === 'USD' ? '$' : 'S/'} {(line.quantity * line.unit_price).toFixed(2)}
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
                        <Link href="/sales">
                            <Button type="button" variant="outline">Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={processing || data.lines.length === 0}>
                            Actualizar Venta
                        </Button>
                    </div>
                </form>
            </div>

            <Dialog open={openCustomerDialog} onOpenChange={setOpenCustomerDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
                        <DialogDescription>
                            Registra rápidamente un cliente. Para agregar más detalles como teléfono o dirección, ve a la pestaña de Clientes.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCustomer} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="c_doc_type">Tipo de Documento</Label>
                                <Select value={customerForm.data.document_type} onValueChange={(v) => { customerForm.setData('document_type', v); customerForm.setData('document_number', ''); }}>
                                    <SelectTrigger id="c_doc_type"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DNI">DNI</SelectItem>
                                        <SelectItem value="RUC">RUC</SelectItem>
                                        <SelectItem value="CE">CE</SelectItem>
                                        <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                                        <SelectItem value="OTRO">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="c_doc_num">Número</Label>
                                <Input 
                                    id="c_doc_num" 
                                    maxLength={customerForm.data.document_type === 'DNI' ? 8 : customerForm.data.document_type === 'RUC' ? 11 : customerForm.data.document_type === 'CE' ? 9 : 15}
                                    value={customerForm.data.document_number} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (customerForm.data.document_type === 'DNI' || customerForm.data.document_type === 'RUC') {
                                            if (val === '' || /^[0-9]+$/.test(val)) {
                                                customerForm.setData('document_number', val);
                                            }
                                        } else {
                                            customerForm.setData('document_number', val);
                                        }
                                    }} 
                                />
                                <InputError message={customerForm.errors.document_number} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c_legal_name">Nombre Completo o Razón Social <span className="text-red-500">*</span></Label>
                            <Input id="c_legal_name" required value={customerForm.data.legal_name} onChange={(e) => customerForm.setData('legal_name', e.target.value)} />
                            <InputError message={customerForm.errors.legal_name} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpenCustomerDialog(false)}>Cancelar</Button>
                            <Button type="submit" disabled={customerForm.processing}>Guardar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}


SaleEdit.layout = {
    breadcrumbs,
};
