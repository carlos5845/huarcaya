import { 
    Check, 
    ChevronsUpDown, 
    UserPlus, 
    Search, 
    Plus, 
    Trash2, 
    ArrowLeft,
    CheckCircle,
    User,
    FileText,
    Phone,
    MapPin,
    CreditCard,
    Package,
    Clock
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, normalizeSearch } from '@/lib/utils';
import { Head, useForm, Link, usePage, router } from '@inertiajs/react';
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
    { title: 'Nueva Venta', href: '#' },
];

export default function SaleCreate({ customers, generic_customer_id, payment_methods }: { customers: any[], generic_customer_id: number, payment_methods: any[] }) {
    const defaultCustomer = generic_customer_id?.toString() || (customers.length > 0 ? customers[0].id.toString() : '');

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

        const { data, setData, post, processing, errors } = useForm({
        customer_id: defaultCustomer,
        sale_type: 'BOLETA',
        payment_type: 'CASH',
        payment_method_id: payment_methods && payment_methods.length > 0 ? payment_methods[0].id.toString() : '',
        operation_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        initial_payment_amount: '',
        amount_received: '',
        external_document_series: '',
        external_document_number: '',
        currency_code: 'PEN',
        exchange_rate: globalExchangeRate,
        notes: '',
        tax_mode: 'INCLUDED',
        lines: [] as { product_id: number; product_name: string; internal_code: string; quantity: number; unit_price: number }[],
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
    const subtotalAmount = data.tax_mode === 'INCLUDED' 
        ? (total / 1.18) 
        : total;
    const taxAmount = data.tax_mode === 'INCLUDED' 
        ? (total - subtotalAmount) 
        : data.tax_mode === 'PLUS_TAX' 
            ? (total * 0.18) 
            : 0;
    const finalTotal = data.tax_mode === 'PLUS_TAX' 
        ? (total * 1.18) 
        : total;
    const currencySymbol = data.currency_code === 'USD' ? '$' : 'S/';

    const selectedCustomer = customers.find((s) => s.id.toString() === data.customer_id);
    const isGenericCustomer = data.customer_id === generic_customer_id.toString();
    const changeAmount = Math.max(0, (parseFloat(data.amount_received) || 0) - finalTotal);
    const initialPay = parseFloat(data.initial_payment_amount || '0');
    const debtAmount = Math.max(0, finalTotal - initialPay);

    const handleFormSubmit = (chosenAction: 'CONFIRM' | 'DRAFT') => {
        if (data.lines.length === 0) {
            alert('Debe agregar al menos un producto a la venta.');
            return;
        }

        if (data.payment_type === 'CREDIT' && isGenericCustomer) {
            alert('El Público en General solo puede comprar al contado. Seleccione o cree un cliente con RUC/DNI para ventas al crédito.');
            return;
        }

        router.post('/sales', {
            ...data,
            action: chosenAction,
        });
    };

    return (
        <>
            <Head title="Nueva Venta" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-6xl mx-auto w-full">
                {/* Header & Breadcrumbs section */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link href="/sales" className="hover:text-foreground transition-colors">Ventas</Link>
                        <span>&rsaquo;</span>
                        <Link href="/sales" className="hover:text-foreground transition-colors">Todas las Ventas</Link>
                        <span>&rsaquo;</span>
                        <span className="bg-muted px-2.5 py-0.5 rounded-full font-medium text-foreground text-xs">
                            Nueva Venta
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-4">
                            <Link href="/sales">
                                <Button variant="outline" size="icon" className="h-9 w-9">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                    Nueva Venta
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Emite un nuevo comprobante comercial o pedido para un cliente.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                Modo: Nueva Venta
                            </div>
                            <Link href="/sales">
                                <Button type="button" variant="outline" size="sm">
                                    Cancelar
                                </Button>
                            </Link>
                            <Button 
                                type="button" 
                                size="sm" 
                                onClick={() => handleFormSubmit('CONFIRM')}
                                disabled={processing || data.lines.length === 0 || (data.payment_type === 'CREDIT' && isGenericCustomer)}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            >
                                <CheckCircle className="h-3.5 w-3.5" /> Emitir y Confirmar
                            </Button>
                        </div>
                    </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit('CONFIRM'); }} className="space-y-6">
                    {/* Top Card: Basic Details */}
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                            Detalles Principales del Comprobante
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-sm">
                            {/* Tipo de Documento */}
                            <div className="space-y-1.5">
                                <Label htmlFor="sale_type" className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    Tipo de Documento
                                </Label>
                                <Select value={data.sale_type} onValueChange={(v) => setData('sale_type', v)}>
                                    <SelectTrigger id="sale_type" className="h-9">
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

                            {/* Serie y Número */}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    Serie y Número
                                </Label>
                                <div className="flex gap-2">
                                    <Input 
                                        type="text" 
                                        id="external_document_series" 
                                        placeholder={getSeriesPlaceholder(data.sale_type)} 
                                        value={data.external_document_series} 
                                        onChange={e => setData('external_document_series', e.target.value)} 
                                        className="w-20 h-9 font-mono uppercase"
                                    />
                                    <Input 
                                        type="text" 
                                        id="external_document_number" 
                                        placeholder="000123" 
                                        value={data.external_document_number} 
                                        onChange={e => setData('external_document_number', e.target.value)} 
                                        className="flex-1 h-9 font-mono"
                                    />
                                </div>
                                <InputError message={errors.external_document_series || errors.external_document_number} />
                            </div>

                            {/* Fecha de Emisión */}
                            <div className="space-y-1.5">
                                <Label htmlFor="operation_date" className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    Fecha de Emisión
                                </Label>
                                <Input 
                                    type="date" 
                                    id="operation_date" 
                                    value={data.operation_date} 
                                    onChange={e => setData('operation_date', e.target.value)} 
                                    className="h-9"
                                />
                                <InputError message={errors.operation_date} />
                            </div>

                            {/* Moneda & Tipo de Cambio */}
                            <div className="space-y-1.5">
                                <Label htmlFor="currency_code" className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    Moneda {data.currency_code === 'USD' && '(T.C.)'}
                                </Label>
                                <div className="flex gap-2">
                                    <Select value={data.currency_code} onValueChange={(v) => setData('currency_code', v)}>
                                        <SelectTrigger id="currency_code" className="h-9 flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PEN">Soles (PEN)</SelectItem>
                                            <SelectItem value="USD">Dólares (USD)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {data.currency_code === 'USD' && (
                                        <Input 
                                            id="exchange_rate" 
                                            type="number" 
                                            step="0.001" 
                                            min="0.01" 
                                            placeholder="3.80"
                                            value={data.exchange_rate} 
                                            onChange={e => setData('exchange_rate', parseFloat(e.target.value) || 1)} 
                                            className="w-20 h-9 font-mono text-right" 
                                            required 
                                        />
                                    )}
                                </div>
                                <InputError message={errors.currency_code || errors.exchange_rate} />
                            </div>

                            {/* Modalidad de Impuestos (IGV) */}
                            <div className="space-y-1.5">
                                <Label htmlFor="tax_mode" className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    Modalidad IGV
                                </Label>
                                <Select value={data.tax_mode} onValueChange={(v) => setData('tax_mode', v)}>
                                    <SelectTrigger id="tax_mode" className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INCLUDED">Precios Incluyen IGV</SelectItem>
                                        <SelectItem value="PLUS_TAX">Precios Más IGV (+18%)</SelectItem>
                                        <SelectItem value="EXEMPT">Operación Exonerada</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.tax_mode} />
                            </div>
                        </div>
                    </div>

                    {/* 2-Column Main Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* LEFT COLUMN: Products + Payment & Settlement */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Product Information Card */}
                            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                                    <div>
                                        <h3 className="font-semibold text-base text-foreground">
                                            Productos de la Venta
                                        </h3>
                                        <span className="text-xs text-muted-foreground">
                                            {data.lines.length} {data.lines.length === 1 ? 'producto agregado' : 'productos agregados'}
                                        </span>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="w-full sm:w-80 relative">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                placeholder="Buscar por nombre, código o marca..."
                                                className="pl-8 h-9"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        {searchResults.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                                {searchResults.map(p => (
                                                    <div 
                                                        key={p.id} 
                                                        className="p-2.5 hover:bg-muted/70 cursor-pointer flex justify-between items-center transition-colors border-b last:border-b-0"
                                                        onClick={() => addProduct(p)}
                                                    >
                                                        <div className="min-w-0 flex-1 pr-2">
                                                            <div className="font-semibold text-sm text-foreground truncate">{p.name}</div>
                                                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                                                <span>{p.primary_reference || p.internal_code || 'S/C'}</span>
                                                                {p.brand?.name && <span>| {p.brand.name}</span>}
                                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${p.available_quantity > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'}`}>
                                                                    Stock: {p.available_quantity || 0}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full shrink-0">
                                                            <Plus className="h-4 w-4 text-emerald-600" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <InputError message={errors.lines} />

                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b">
                                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Código / Ref</TableHead>
                                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</TableHead>
                                                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Cantidad</TableHead>
                                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">Precio Unit.</TableHead>
                                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Subtotal</TableHead>
                                                <TableHead className="w-12"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.lines.length > 0 ? (
                                                data.lines.map((line, idx) => (
                                                    <TableRow key={idx} className="hover:bg-muted/40 transition-colors">
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            {line.internal_code}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                                                    <Package className="h-4 w-4" />
                                                                </div>
                                                                <div className="font-semibold text-sm text-foreground">
                                                                    {line.product_name}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Input 
                                                                type="number" 
                                                                min="1" 
                                                                step="1" 
                                                                value={line.quantity} 
                                                                onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value) || 0)} 
                                                                className="h-8 text-center font-semibold"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Input 
                                                                type="number" 
                                                                min="0" 
                                                                step="0.01" 
                                                                value={line.unit_price} 
                                                                onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)} 
                                                                className="h-8 text-right font-mono"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-sm">
                                                            {currencySymbol} {(line.quantity * line.unit_price).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Button 
                                                                type="button" 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40" 
                                                                onClick={() => removeLine(idx)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                        <div className="flex flex-col items-center justify-center gap-2">
                                                            <Package className="h-8 w-8 text-muted-foreground/50" />
                                                            <p className="text-sm font-medium">No hay productos agregados a la venta</p>
                                                            <p className="text-xs text-muted-foreground">Utiliza el buscador superior para agregar productos de almacén.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Payment Conditions & Settlement Card */}
                            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <h3 className="font-semibold text-base text-foreground">
                                        Condiciones de Pago y Liquidación
                                    </h3>
                                    <div>
                                        {data.payment_type === 'CASH' ? (
                                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                Cobro Inmediato (Contado)
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                Genera Cuenta por Cobrar (Crédito)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="payment_type" className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                            Condición de Pago
                                        </Label>
                                        <Select value={data.payment_type} onValueChange={v => { setData('payment_type', v); if(v === 'CASH') setData('initial_payment_amount', ''); }}>
                                            <SelectTrigger id="payment_type" className="h-9">
                                                <SelectValue placeholder="Seleccione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH">Al Contado</SelectItem>
                                                <SelectItem value="CREDIT">Al Crédito</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.payment_type} />
                                    </div>

                                    {(data.payment_type === 'CASH' || (data.payment_type === 'CREDIT' && parseFloat(data.initial_payment_amount) > 0)) && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="payment_method_id" className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                                Método de Pago
                                            </Label>
                                            <Select value={data.payment_method_id} onValueChange={v => setData('payment_method_id', v)}>
                                                <SelectTrigger id="payment_method_id" className="h-9">
                                                    <SelectValue placeholder="Seleccione..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {payment_methods.map(pm => (
                                                        <SelectItem key={pm.id} value={pm.id.toString()}>{pm.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.payment_method_id} />
                                        </div>
                                    )}
                                    
                                    {data.payment_type === 'CREDIT' && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="due_date" className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                                Fecha de Vencimiento
                                            </Label>
                                            <Input 
                                                type="date" 
                                                id="due_date" 
                                                value={data.due_date} 
                                                onChange={e => setData('due_date', e.target.value)} 
                                                className="h-9"
                                            />
                                            <InputError message={errors.due_date} />
                                        </div>
                                    )}

                                    {data.payment_type === 'CREDIT' && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="initial_payment_amount" className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                                Enganche / Adelanto Inicial
                                            </Label>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                min="0" 
                                                id="initial_payment_amount" 
                                                placeholder="0.00" 
                                                value={data.initial_payment_amount} 
                                                onChange={e => setData('initial_payment_amount', e.target.value)} 
                                                className="h-9 font-mono"
                                            />
                                            <InputError message={errors.initial_payment_amount} />
                                        </div>
                                    )}
                                </div>

                                {/* Financial Summary Breakdown */}
                                <div className="pt-4 border-t space-y-2.5 text-sm">
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Op. Gravada / Subtotal:</span>
                                        <span className="font-medium text-foreground">{currencySymbol} {subtotalAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>IGV (18%):</span>
                                        <span className="font-medium text-foreground">{currencySymbol} {taxAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t flex justify-between items-center text-base">
                                        <span className="font-bold text-foreground">Total de Venta:</span>
                                        <span className="font-extrabold text-xl text-foreground">{currencySymbol} {finalTotal.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Dynamic Settlement Box (Cash vs Credit) */}
                                {data.payment_type === 'CASH' ? (
                                    <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border space-y-3 text-sm">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="amount_received" className="font-medium text-foreground">Paga con:</Label>
                                            <div className="w-36">
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    min="0" 
                                                    id="amount_received" 
                                                    placeholder="0.00" 
                                                    value={data.amount_received} 
                                                    onChange={e => setData('amount_received', e.target.value)} 
                                                    className="h-9 text-right font-mono font-semibold" 
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <span className="font-medium text-muted-foreground">Vuelto a Entregar:</span>
                                            <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
                                                {currencySymbol} {changeAmount.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border space-y-2.5 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Adelanto inicial pactado:</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{currencySymbol} {initialPay.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Saldo Deudor por Cobrar:</span>
                                            <span className="font-bold text-rose-600 dark:text-rose-400 text-base">{currencySymbol} {debtAmount.toFixed(2)}</span>
                                        </div>
                                        {data.due_date && (
                                            <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t">
                                                <span>Fecha Límite de Vencimiento:</span>
                                                <span className="font-semibold text-foreground">{new Date(data.due_date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Customer Information + Notes + Submit */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Customer Information Card */}
                            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <h3 className="font-semibold text-base text-foreground">
                                        Información del Cliente
                                    </h3>
                                </div>

                                {/* Customer Selection Combobox */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCustomerCombobox}
                                                    className="w-full justify-between h-10 font-normal"
                                                >
                                                    <span className="truncate">
                                                        {data.customer_id
                                                            ? customers.find((s) => s.id.toString() === data.customer_id)?.legal_name || 'Cliente desconocido'
                                                            : "Buscar cliente..."}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[380px] p-0" align="start">
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
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="truncate font-medium">{s.legal_name}</div>
                                                                        <div className="text-xs text-muted-foreground">{s.document_number ? `(${s.document_number})` : ''}</div>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                    <div className="p-2 border-t flex gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            className="w-full justify-start text-xs text-blue-600 dark:text-blue-400" 
                                                            onClick={() => {
                                                                setData('customer_id', generic_customer_id.toString());
                                                                setOpenCustomerCombobox(false);
                                                            }}
                                                        >
                                                            <UserPlus className="mr-2 h-3.5 w-3.5" />
                                                            Cliente Genérico
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            className="w-full justify-start text-xs text-emerald-600 dark:text-emerald-400" 
                                                            onClick={() => {
                                                                setOpenCustomerCombobox(false);
                                                                setOpenCustomerDialog(true);
                                                            }}
                                                        >
                                                            <Plus className="mr-2 h-3.5 w-3.5" />
                                                            Nuevo Cliente
                                                        </Button>
                                                    </div>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <InputError message={errors.customer_id} />
                                </div>

                                {/* Pending Debt Alert */}
                                {selectedCustomer && selectedCustomer.total_debt && parseFloat(selectedCustomer.total_debt) > 0 && (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                        <span className="text-sm">⚠️</span>
                                        <div>
                                            Este cliente tiene una deuda pendiente de <strong>{currencySymbol} {parseFloat(selectedCustomer.total_debt).toFixed(2)}</strong>
                                        </div>
                                    </div>
                                )}

                                {/* Generic Customer Warning */}
                                {isGenericCustomer && (
                                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                                        Público en General: solo se permite comprar al contado.
                                    </div>
                                )}

                                {/* Customer Detailed Profile Cards */}
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2.5 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs text-muted-foreground font-medium">Nombre o Razón Social</div>
                                            <div className="font-semibold text-sm text-foreground truncate">
                                                {selectedCustomer?.legal_name || 'Clientes Varios / Público en General'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="p-2.5 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs text-muted-foreground font-medium">Documento de Identidad</div>
                                            <div className="font-semibold text-sm text-foreground">
                                                {selectedCustomer?.document_type || 'DOC'}: {selectedCustomer?.document_number || '00000000'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="p-2.5 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs text-muted-foreground font-medium">Teléfono de Contacto</div>
                                            <div className="font-semibold text-sm text-foreground">
                                                {selectedCustomer?.phone || 'No registrado'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="p-2.5 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs text-muted-foreground font-medium">Dirección de Entrega / Fiscal</div>
                                            <div className="font-semibold text-sm text-foreground break-words">
                                                {selectedCustomer?.address || 'Sin dirección registrada'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="p-2.5 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                                            <CreditCard className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs text-muted-foreground font-medium">Condición Comercial</div>
                                            <div className="font-semibold text-sm text-foreground">
                                                {data.payment_type === 'CASH' ? 'Al Contado' : 'Línea de Crédito'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notes Card */}
                            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-3">
                                <h3 className="font-semibold text-base text-foreground border-b pb-3">
                                    Notas u Observaciones
                                </h3>
                                <Textarea 
                                    id="notes" 
                                    rows={4} 
                                    value={data.notes} 
                                    onChange={e => setData('notes', e.target.value)} 
                                    placeholder="Instrucciones de entrega, detalles especiales de la venta..." 
                                    className="resize-none"
                                />
                                <div className="pt-2 text-xs text-muted-foreground/80 leading-normal">
                                    Estas notas se imprimirán en el comprobante comercial y en la guía de salida de almacén.
                                </div>
                            </div>

                            {/* Action & Submit Card */}
                            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                                <h3 className="font-semibold text-base text-foreground border-b pb-3">
                                    Acciones de Emisión
                                </h3>
                                
                                <div className="space-y-1.5">
                                    <Button 
                                        type="button" 
                                        onClick={() => handleFormSubmit('CONFIRM')}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-xs h-11" 
                                        disabled={processing || data.lines.length === 0 || (data.payment_type === 'CREDIT' && isGenericCustomer)}
                                    >
                                        <CheckCircle className="h-4 w-4" /> Emitir y Confirmar Venta
                                    </Button>
                                    <p className="text-[11px] text-muted-foreground text-center">
                                        Emite el comprobante, descuenta stock de Kardex y envía la deuda a Cuentas por Cobrar.
                                    </p>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t">
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        onClick={() => handleFormSubmit('DRAFT')}
                                        className="w-full gap-2 font-medium h-9" 
                                        disabled={processing || data.lines.length === 0 || (data.payment_type === 'CREDIT' && isGenericCustomer)}
                                    >
                                        <FileText className="h-3.5 w-3.5" /> Guardar como Borrador
                                    </Button>
                                    <p className="text-[11px] text-muted-foreground text-center">
                                        Guarda como cotización o preventa para confirmarla más tarde.
                                    </p>
                                </div>

                                <Link href="/sales" className="block w-full pt-1">
                                    <Button type="button" variant="ghost" className="w-full h-8 text-xs text-muted-foreground hover:text-foreground">
                                        Cancelar y Regresar
                                    </Button>
                                </Link>
                            </div>
                        </div>
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


SaleCreate.layout = {
    breadcrumbs,
};
