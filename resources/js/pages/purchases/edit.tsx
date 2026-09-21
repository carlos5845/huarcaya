import React, { useState, useEffect } from 'react';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { 
    Search, 
    Plus, 
    Trash2, 
    ArrowLeft, 
    Check, 
    ChevronsUpDown, 
    Building2, 
    Phone, 
    MapPin, 
    FileText, 
    DollarSign, 
    Package, 
    CheckCircle2, 
    Upload, 
    File, 
    Calendar, 
    Warehouse, 
    Percent, 
    Save, 
    Loader2,
    ExternalLink
} from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { cn, normalizeSearch } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compras', href: '/purchases' },
    { title: 'Editar Compra', href: '#' },
];

export default function PurchaseEdit({ 
    purchase, 
    suppliers = [] 
}: { 
    purchase: any; 
    suppliers: any[]; 
}) {
    const { company_settings } = usePage<any>().props;
    const globalExchangeRate = company_settings?.exchange_rate ? parseFloat(company_settings.exchange_rate) : 3.80;

    // Detect tax mode from existing amounts if possible
    const initialTaxMode = (() => {
        const sub = Number(purchase.subtotal_amount || 0);
        const tax = Number(purchase.tax_amount || 0);
        const tot = Number(purchase.total_amount || 0);
        if (tax === 0 && tot === sub) return 'EXEMPT';
        if (Math.abs((sub * 1.18) - tot) < 0.05) return 'PLUS_TAX';
        return 'INCLUDED';
    })();

    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        supplier_id: purchase.supplier_id ? purchase.supplier_id.toString() : '',
        supplier_document_type: purchase.supplier_document_type || 'FACTURA',
        supplier_document_series: purchase.supplier_document_series || '',
        supplier_document_number: purchase.supplier_document_number || '',
        document_date: purchase.document_date ? purchase.document_date.split('T')[0] : new Date().toISOString().split('T')[0],
        tax_mode: initialTaxMode as 'INCLUDED' | 'PLUS_TAX' | 'EXEMPT',
        currency_code: purchase.currency_code || 'PEN',
        exchange_rate: Number(purchase.exchange_rate) || globalExchangeRate,
        notes: purchase.notes || '',
        document_file: null as File | null,
        action: 'DRAFT' as 'DRAFT' | 'CONFIRM',
        lines: (purchase.lines || []).map((line: any) => ({
            product_id: line.product_id,
            product_name: line.product?.name || 'Producto sin nombre',
            internal_code: line.product?.primary_reference || line.product?.internal_code || '-',
            brand_name: line.product?.brand?.name || null,
            unit_code: line.product?.unit?.code || 'UND',
            quantity: Number(line.ordered_quantity || 1),
            unit_cost: Number(line.unit_cost_original || 0)
        })) as Array<{
            product_id: number;
            product_name: string;
            internal_code: string;
            brand_name?: string | null;
            unit_code?: string;
            quantity: number;
            unit_cost: number;
        }>,
    });

    useEffect(() => {
        if (data.currency_code === 'USD' && !purchase.exchange_rate) {
            setData('exchange_rate', globalExchangeRate);
        } else if (data.currency_code === 'PEN') {
            setData('exchange_rate', 1.0);
        }
    }, [data.currency_code]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Quick create supplier modal
    const [supplierOpen, setSupplierOpen] = useState(false);
    const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState(false);
    
    const { 
        data: createSupplierData, 
        setData: setCreateSupplierData, 
        post: postSupplier, 
        processing: processingSupplier, 
        errors: errorsSupplier, 
        reset: resetSupplier 
    } = useForm({
        document_type: 'RUC',
        document_number: '',
        legal_name: '',
        trade_name: '',
        phone: '',
        address: '',
        status: 'ACTIVE',
    });

    const handleCreateSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        postSupplier('/suppliers', {
            onSuccess: () => {
                setIsCreateSupplierOpen(false);
                resetSupplier();
            }
        });
    };

    // Product search with debounce
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            setIsSearching(true);
            fetch(`/products/search?q=${encodeURIComponent(searchQuery)}`, {
                headers: { 'Accept': 'application/json' }
            })
            .then(res => res.json())
            .then(items => {
                setSearchResults(items);
                setIsSearching(false);
            })
            .catch(() => setIsSearching(false));
        }, 250);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const addProduct = (product: any) => {
        if (data.lines.some(l => l.product_id === product.id)) {
            const updated = data.lines.map(l => 
                l.product_id === product.id ? { ...l, quantity: l.quantity + 1 } : l
            );
            setData('lines', updated);
        } else {
            setData('lines', [
                ...data.lines,
                { 
                    product_id: product.id, 
                    product_name: product.name, 
                    internal_code: product.primary_reference || product.internal_code || '-', 
                    brand_name: product.brand?.name || null,
                    unit_code: product.unit?.code || 'UND',
                    quantity: 1, 
                    unit_cost: Number(product.current_cost || product.cost || 0)
                }
            ]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const updateLine = (index: number, field: 'quantity' | 'unit_cost', value: number) => {
        const newLines = [...data.lines];
        newLines[index] = { 
            ...newLines[index], 
            [field]: Math.max(0, value) 
        };
        setData('lines', newLines);
    };

    const removeLine = (index: number) => {
        setData('lines', data.lines.filter((_, i) => i !== index));
    };

    // Cálculos de liquidación e impuestos
    const rawTotal = data.lines.reduce((acc, line) => acc + (Number(line.quantity || 0) * Number(line.unit_cost || 0)), 0);
    const totalUnits = data.lines.reduce((acc, line) => acc + Number(line.quantity || 0), 0);

    let subtotalAmount = rawTotal;
    let taxAmount = 0;
    let finalTotalAmount = rawTotal;

    if (data.tax_mode === 'INCLUDED') {
        subtotalAmount = rawTotal > 0 ? rawTotal / 1.18 : 0;
        taxAmount = rawTotal - subtotalAmount;
        finalTotalAmount = rawTotal;
    } else if (data.tax_mode === 'PLUS_TAX') {
        subtotalAmount = rawTotal;
        taxAmount = rawTotal * 0.18;
        finalTotalAmount = rawTotal + taxAmount;
    } else {
        // EXEMPT
        subtotalAmount = rawTotal;
        taxAmount = 0;
        finalTotalAmount = rawTotal;
    }

    const currencySymbol = data.currency_code === 'USD' ? '$' : 'S/';

    const selectedSupplier = suppliers.find(s => s.id.toString() === data.supplier_id);

    const getSeriesPlaceholder = (type: string) => {
        switch (type) {
            case 'FACTURA': return 'F001';
            case 'BOLETA': return 'B001';
            case 'GUIA': return 'T001';
            case 'TICKET': return 'TK01';
            case 'ORDEN_COMPRA': return 'OC01';
            default: return '001';
        }
    };

    const handleSave = (actionType: 'DRAFT' | 'CONFIRM') => {
        data.action = actionType;
        post(`/purchases/${purchase.id}`);
    };

    return (
        <>
            <Head title={`Editar Compra ${purchase.purchase_number}`} />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-7xl mx-auto w-full">
                {/* Header & Breadcrumbs */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link href="/purchases" className="hover:text-foreground transition-colors">Compras</Link>
                        <span>&rsaquo;</span>
                        <Link href={`/purchases/${purchase.id}`} className="hover:text-foreground transition-colors">
                            {purchase.purchase_number}
                        </Link>
                        <span>&rsaquo;</span>
                        <span className="bg-muted px-2.5 py-0.5 rounded-full font-medium text-foreground text-xs">
                            Editar Compra
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-4">
                            <Link href={`/purchases/${purchase.id}`}>
                                <Button variant="outline" size="icon" className="h-9 w-9">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                        Editar Compra #{purchase.purchase_number}
                                    </h1>
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
                                        Borrador
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Modifica datos de cabecera, comprobante o repuestos solicitados
                                </p>
                            </div>
                        </div>

                        {/* Warehouse receiver badge */}
                        {purchase.branch && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/40 text-xs">
                                <Warehouse className="w-4 h-4 text-primary" />
                                <span className="text-muted-foreground">Almacén Destino:</span>
                                <strong className="text-foreground">{purchase.branch.name}</strong>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2-Column Main Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* LEFT COLUMN: Voucher Info, Supplier, Products (2 Cols) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Voucher & Supplier Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-5">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    <h3 className="font-semibold text-base text-foreground">
                                        Datos del Proveedor y Comprobante
                                    </h3>
                                </div>
                                <span className="text-xs text-muted-foreground">Campos obligatorios (*)</span>
                            </div>

                            {/* Supplier Selector */}
                            <div className="space-y-2">
                                <Label htmlFor="supplier_id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Proveedor <span className="text-rose-500">*</span>
                                </Label>
                                <Popover open={supplierOpen} onOpenChange={setSupplierOpen} modal={true}>
                                    <PopoverTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            role="combobox" 
                                            aria-expanded={supplierOpen} 
                                            className={cn("w-full justify-between h-11 text-left font-normal bg-background border-input", !data.supplier_id && "text-muted-foreground")}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Building2 className="w-4 h-4 text-primary shrink-0" />
                                                <span className="truncate">
                                                    {selectedSupplier 
                                                        ? `${selectedSupplier.legal_name} (${selectedSupplier.document_number || 'Sin Doc'})` 
                                                        : "Buscar o seleccionar proveedor..."}
                                                </span>
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[480px] p-0 bg-popover text-popover-foreground border-border" align="start">
                                        <Command filter={(value, search) => value.includes(normalizeSearch(search)) ? 1 : 0}>
                                            <CommandInput placeholder="Buscar por RUC o Razón Social..." />
                                            <CommandList>
                                                <CommandEmpty className="p-4 text-xs text-center text-muted-foreground">
                                                    No se encontraron proveedores registrados.
                                                </CommandEmpty>
                                                <CommandGroup heading="Proveedores Activos">
                                                    {suppliers.map(s => (
                                                        <CommandItem
                                                            key={s.id}
                                                            value={`${normalizeSearch(s.legal_name)} ${s.document_number || ''}`}
                                                            onSelect={() => {
                                                                setData('supplier_id', s.id.toString());
                                                                setSupplierOpen(false);
                                                            }}
                                                            className="cursor-pointer"
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4 text-primary", data.supplier_id === s.id.toString() ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-semibold text-sm truncate">{s.legal_name}</div>
                                                                <div className="text-xs text-muted-foreground">{s.document_type || 'RUC'}: {s.document_number || 'S/D'}</div>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                                <CommandSeparator />
                                                <CommandGroup>
                                                    <CommandItem
                                                        onSelect={() => {
                                                            setSupplierOpen(false);
                                                            setIsCreateSupplierOpen(true);
                                                        }}
                                                        className="cursor-pointer text-primary font-semibold"
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Registrar nuevo proveedor
                                                    </CommandItem>
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <InputError message={errors.supplier_id} />
                            </div>

                            {/* Supplier Quick Details Preview Card */}
                            {selectedSupplier && (
                                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="space-y-1">
                                        <div className="font-bold text-sm text-foreground flex items-center gap-2">
                                            {selectedSupplier.legal_name}
                                            <Badge variant="outline" className="text-[10px] bg-background">
                                                {selectedSupplier.document_type || 'RUC'} {selectedSupplier.document_number}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-muted-foreground">
                                            {selectedSupplier.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {selectedSupplier.phone}
                                                </span>
                                            )}
                                            {selectedSupplier.address && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {selectedSupplier.address}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0 self-start sm:self-auto">
                                        Proveedor Activo
                                    </Badge>
                                </div>
                            )}

                            {/* Document Inputs Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="space-y-1.5 sm:col-span-1">
                                    <Label htmlFor="supplier_document_type" className="text-xs text-muted-foreground">
                                        Tipo Documento
                                    </Label>
                                    <Select 
                                        value={data.supplier_document_type} 
                                        onValueChange={(v) => setData('supplier_document_type', v)}
                                    >
                                        <SelectTrigger id="supplier_document_type" className="bg-background border-input">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="FACTURA">Factura</SelectItem>
                                            <SelectItem value="BOLETA">Boleta</SelectItem>
                                            <SelectItem value="GUIA">Guía Remisión</SelectItem>
                                            <SelectItem value="ORDEN_COMPRA">Orden Compra</SelectItem>
                                            <SelectItem value="TICKET">Ticket</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5 sm:col-span-1">
                                    <Label htmlFor="series" className="text-xs text-muted-foreground">
                                        Serie
                                    </Label>
                                    <Input 
                                        id="series" 
                                        value={data.supplier_document_series} 
                                        onChange={e => setData('supplier_document_series', e.target.value.toUpperCase())} 
                                        placeholder={getSeriesPlaceholder(data.supplier_document_type)} 
                                        className="bg-background border-input font-mono uppercase"
                                    />
                                </div>

                                <div className="space-y-1.5 sm:col-span-1">
                                    <Label htmlFor="number" className="text-xs text-muted-foreground">
                                        Número
                                    </Label>
                                    <Input 
                                        id="number" 
                                        value={data.supplier_document_number} 
                                        onChange={e => setData('supplier_document_number', e.target.value)} 
                                        placeholder="000123" 
                                        className="bg-background border-input font-mono"
                                    />
                                    <InputError message={errors.supplier_document_number} />
                                </div>

                                <div className="space-y-1.5 sm:col-span-1">
                                    <Label htmlFor="date" className="text-xs text-muted-foreground">
                                        Fecha Emisión <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input 
                                        id="date" 
                                        type="date" 
                                        value={data.document_date} 
                                        onChange={e => setData('document_date', e.target.value)} 
                                        required 
                                        className="bg-background border-input"
                                    />
                                    <InputError message={errors.document_date} />
                                </div>
                            </div>
                        </div>

                        {/* Product Detail and Search Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Package className="w-5 h-5 text-primary" />
                                    <div>
                                        <h3 className="font-bold text-base text-foreground">
                                            Ítems y Repuestos a Ingresar
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Busca repuestos en catálogo o modifica cantidades pactadas
                                        </p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-semibold self-start sm:self-auto">
                                    {data.lines.length} {data.lines.length === 1 ? 'producto' : 'productos'}
                                </span>
                            </div>

                            {/* Search Bar with Predictive Dropdown */}
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Buscar por nombre, código interno, OEM o marca..."
                                        className="pl-10 h-10 bg-background border-input"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3.5 top-3 h-4 w-4 text-primary animate-spin" />
                                    )}
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="absolute z-30 w-full mt-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-border">
                                        {searchResults.map(p => (
                                            <div 
                                                key={p.id} 
                                                className="p-3 hover:bg-muted/50 cursor-pointer flex justify-between items-center transition-colors"
                                                onClick={() => addProduct(p)}
                                            >
                                                <div className="min-w-0 flex-1 mr-3">
                                                    <div className="font-semibold text-sm text-foreground truncate">
                                                        {p.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-mono text-primary font-medium">
                                                            {p.primary_reference || p.internal_code || 'Sin código'}
                                                        </span>
                                                        {p.brand?.name && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-muted/40">
                                                                {p.brand.name}
                                                            </Badge>
                                                        )}
                                                        <span className="text-xs text-muted-foreground">
                                                            Stock actual: <strong>{Number(p.stock || p.available || 0)}</strong> {p.unit?.code || 'UND'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0 text-primary border-primary/30 hover:bg-primary/10">
                                                    <Plus className="h-3.5 w-3.5" /> Agregar
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <InputError message={errors.lines} />

                            {/* Products Table */}
                            <div className="overflow-x-auto rounded-lg border border-border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 border-b border-border text-xs">
                                            <TableHead className="w-10 text-center font-semibold uppercase">#</TableHead>
                                            <TableHead className="font-semibold uppercase">Repuesto / Descripción</TableHead>
                                            <TableHead className="w-32 text-center font-semibold uppercase">Cantidad</TableHead>
                                            <TableHead className="w-36 text-center font-semibold uppercase">Costo Unitario</TableHead>
                                            <TableHead className="w-32 text-right font-semibold uppercase">Subtotal</TableHead>
                                            <TableHead className="w-14 text-center"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.lines.length > 0 ? (
                                            data.lines.map((line, idx) => {
                                                const lineSubtotal = Number(line.quantity || 0) * Number(line.unit_cost || 0);
                                                return (
                                                    <TableRow key={line.product_id || idx} className="border-b border-border/70 hover:bg-muted/30">
                                                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                                            {idx + 1}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-semibold text-sm text-foreground">
                                                                {line.product_name}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-xs font-mono text-primary font-medium">
                                                                    {line.internal_code}
                                                                </span>
                                                                {line.brand_name && (
                                                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-muted/40 border-border">
                                                                        {line.brand_name}
                                                                    </Badge>
                                                                )}
                                                                <span className="text-[11px] text-muted-foreground">
                                                                    {line.unit_code}
                                                                </span>
                                                            </div>
                                                            {errors[`lines.${idx}.quantity` as keyof typeof errors] && (
                                                                <p className="text-rose-500 text-xs mt-0.5">Cantidad inválida</p>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input 
                                                                type="number" 
                                                                min="1" 
                                                                step="1" 
                                                                value={line.quantity} 
                                                                onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value, 10) || 0)} 
                                                                className="h-10 text-center font-bold text-sm bg-background border-input"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">
                                                                    {currencySymbol}
                                                                </span>
                                                                <Input 
                                                                    type="number" 
                                                                    min="0" 
                                                                    step="0.001" 
                                                                    value={line.unit_cost} 
                                                                    onChange={e => updateLine(idx, 'unit_cost', parseFloat(e.target.value) || 0)} 
                                                                    className="h-10 pl-7 text-right font-semibold text-sm bg-background border-input"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-sm text-foreground">
                                                            {currencySymbol} {lineSubtotal.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Button 
                                                                type="button" 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10" 
                                                                onClick={() => removeLine(idx)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Package className="w-8 h-8 opacity-30 text-primary" />
                                                        <p className="text-sm font-medium">No hay productos en esta compra</p>
                                                        <p className="text-xs opacity-70">Utiliza la barra superior para buscar y añadir repuestos</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                    {data.lines.length > 0 && (
                                        <tfoot className="bg-muted/40 font-semibold border-t-2 border-border text-xs">
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-right py-3 text-muted-foreground">
                                                    TOTAL ÍTEMS ({data.lines.length}):
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-foreground">
                                                    {totalUnits} uds.
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    Subtotal Líneas:
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-foreground text-sm">
                                                    {currencySymbol} {rawTotal.toFixed(2)}
                                                </TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </tfoot>
                                    )}
                                </Table>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Taxes, File Upload, Notes & Totals (1 Col) */}
                    <div className="space-y-6">
                        {/* Currency & Exchange Rate Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs space-y-4">
                            <div className="flex items-center gap-2 border-b border-border pb-2.5">
                                <DollarSign className="w-4 h-4 text-primary" />
                                <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                                    Moneda y Tipo de Cambio
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="currency_code" className="text-xs text-muted-foreground">Moneda</Label>
                                    <Select value={data.currency_code} onValueChange={(v) => setData('currency_code', v)}>
                                        <SelectTrigger id="currency_code" className="bg-background border-input">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PEN">Soles (S/ PEN)</SelectItem>
                                            <SelectItem value="USD">Dólares ($ USD)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="exchange_rate" className="text-xs text-muted-foreground">Tipo de Cambio</Label>
                                    <Input 
                                        id="exchange_rate" 
                                        type="number" 
                                        step="0.001" 
                                        min="0.01" 
                                        disabled={data.currency_code === 'PEN'}
                                        value={data.exchange_rate} 
                                        onChange={e => setData('exchange_rate', parseFloat(e.target.value) || 1)} 
                                        className="bg-background border-input font-mono text-center disabled:opacity-60"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tax Configuration Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs space-y-3">
                            <div className="flex items-center gap-2 border-b border-border pb-2.5">
                                <Percent className="w-4 h-4 text-primary" />
                                <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                                    Tratamiento de Impuestos (IGV 18%)
                                </h3>
                            </div>

                            <div className="space-y-2">
                                <label 
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                        data.tax_mode === 'PLUS_TAX' 
                                            ? 'border-primary/50 bg-primary/5 shadow-xs' 
                                            : 'border-border bg-muted/20 hover:bg-muted/40'
                                    }`}
                                    onClick={() => setData('tax_mode', 'PLUS_TAX')}
                                >
                                    <input 
                                        type="radio" 
                                        name="tax_mode" 
                                        checked={data.tax_mode === 'PLUS_TAX'} 
                                        onChange={() => setData('tax_mode', 'PLUS_TAX')} 
                                        className="mt-0.5 text-primary focus:ring-primary"
                                    />
                                    <div className="text-xs">
                                        <div className="font-bold text-foreground">Precios NO incluyen IGV (+ 18%)</div>
                                        <div className="text-muted-foreground">El 18% de IGV se suma sobre el costo pactado.</div>
                                    </div>
                                </label>

                                <label 
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                        data.tax_mode === 'INCLUDED' 
                                            ? 'border-primary/50 bg-primary/5 shadow-xs' 
                                            : 'border-border bg-muted/20 hover:bg-muted/40'
                                    }`}
                                    onClick={() => setData('tax_mode', 'INCLUDED')}
                                >
                                    <input 
                                        type="radio" 
                                        name="tax_mode" 
                                        checked={data.tax_mode === 'INCLUDED'} 
                                        onChange={() => setData('tax_mode', 'INCLUDED')} 
                                        className="mt-0.5 text-primary focus:ring-primary"
                                    />
                                    <div className="text-xs">
                                        <div className="font-bold text-foreground">Precios incluyen IGV (Extracción)</div>
                                        <div className="text-muted-foreground">El valor ingresado ya contiene el 18% de impuesto.</div>
                                    </div>
                                </label>

                                <label 
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                        data.tax_mode === 'EXEMPT' 
                                            ? 'border-primary/50 bg-primary/5 shadow-xs' 
                                            : 'border-border bg-muted/20 hover:bg-muted/40'
                                    }`}
                                    onClick={() => setData('tax_mode', 'EXEMPT')}
                                >
                                    <input 
                                        type="radio" 
                                        name="tax_mode" 
                                        checked={data.tax_mode === 'EXEMPT'} 
                                        onChange={() => setData('tax_mode', 'EXEMPT')} 
                                        className="mt-0.5 text-primary focus:ring-primary"
                                    />
                                    <div className="text-xs">
                                        <div className="font-bold text-foreground">Exonerado / Inafecto (0%)</div>
                                        <div className="text-muted-foreground">Operación sin afectación al impuesto general a las ventas.</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Totals Summary Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs space-y-3">
                            <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider border-b border-border pb-2.5">
                                Resumen de Liquidación
                            </h3>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Op. Gravada / Subtotal:</span>
                                    <span className="font-semibold text-foreground">{currencySymbol} {subtotalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>IGV ({data.tax_mode === 'EXEMPT' ? '0%' : '18%'}):</span>
                                    <span className="font-semibold text-foreground">{currencySymbol} {taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="pt-3 border-t border-border flex justify-between items-center">
                                    <span className="font-bold text-base text-foreground">Total Compra:</span>
                                    <span className="text-2xl font-black text-primary">
                                        {currencySymbol} {finalTotalAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Document File Uploader Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs space-y-3">
                            <div className="flex items-center justify-between border-b border-border pb-2.5">
                                <div className="flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-primary" />
                                    <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                                        Factura Adjunta (PDF/Img)
                                    </h3>
                                </div>
                                {data.document_file && (
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-xs text-rose-600 hover:text-rose-700 p-0"
                                        onClick={() => setData('document_file', null)}
                                    >
                                        Quitar
                                    </Button>
                                )}
                            </div>

                            {purchase.document_file_path && !data.document_file && (
                                <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between text-xs mb-2">
                                    <div className="flex items-center gap-2 truncate">
                                        <File className="w-4 h-4 text-primary shrink-0" />
                                        <span className="truncate">Comprobante actual guardado</span>
                                    </div>
                                    <a 
                                        href={`/storage/${purchase.document_file_path}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline flex items-center gap-1 shrink-0 font-medium"
                                    >
                                        Ver <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}

                            <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors relative cursor-pointer">
                                <input 
                                    id="document_file" 
                                    type="file" 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={e => setData('document_file', e.target.files?.[0] || null)} 
                                />
                                {data.document_file ? (
                                    <div className="flex items-center gap-3 text-left w-full">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <File className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-xs text-foreground truncate">{data.document_file.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{(data.document_file.size / 1024).toFixed(1)} KB (Nuevo)</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                                        <span className="text-xs font-semibold text-foreground">
                                            {purchase.document_file_path ? 'Reemplazar archivo adjunto' : 'Examinar o arrastrar comprobante'}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground mt-0.5">
                                            Soporta PDF, JPG, PNG (Hasta 5MB)
                                        </span>
                                    </>
                                )}
                            </div>
                            <InputError message={errors.document_file} />
                        </div>

                        {/* Notes Card */}
                        <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs space-y-2">
                            <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Notas / Observaciones de Compra
                            </Label>
                            <Textarea 
                                id="notes" 
                                rows={3} 
                                value={data.notes} 
                                onChange={e => setData('notes', e.target.value)} 
                                placeholder="Condiciones de entrega, notas del flete, número de guía..." 
                                className="bg-background border-input text-xs resize-none"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2.5 pt-2">
                            <Button 
                                type="button" 
                                onClick={() => handleSave('CONFIRM')}
                                disabled={processing || data.lines.length === 0 || !data.supplier_id}
                                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                Guardar y Confirmar Entrada a Kardex
                            </Button>

                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => handleSave('DRAFT')}
                                disabled={processing || data.lines.length === 0 || !data.supplier_id}
                                className="w-full h-10 font-semibold flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Guardar Cambios (Borrador)
                            </Button>

                            <Link href={`/purchases/${purchase.id}`} className="block w-full">
                                <Button type="button" variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground">
                                    Cancelar y Volver al Detalle
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Crear Proveedor Rápido */}
            <Dialog open={isCreateSupplierOpen} onOpenChange={setIsCreateSupplierOpen}>
                <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Registrar Nuevo Proveedor</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Ingresa los datos fiscales para asociarlo inmediatamente a esta compra.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSupplier} className="space-y-4 py-2">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5 col-span-1">
                                <Label htmlFor="sup_doc_type" className="text-xs">Tipo Doc.</Label>
                                <Select value={createSupplierData.document_type} onValueChange={(v) => setCreateSupplierData('document_type', v)}>
                                    <SelectTrigger id="sup_doc_type" className="bg-background border-input"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RUC">RUC</SelectItem>
                                        <SelectItem value="DNI">DNI</SelectItem>
                                        <SelectItem value="CE">CE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 col-span-2">
                                <Label htmlFor="sup_doc_num" className="text-xs">Número Doc. <span className="text-rose-500">*</span></Label>
                                <Input 
                                    id="sup_doc_num" 
                                    value={createSupplierData.document_number} 
                                    onChange={e => setCreateSupplierData('document_number', e.target.value)} 
                                    required 
                                    className="bg-background border-input font-mono"
                                />
                                <InputError message={errorsSupplier.document_number} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="sup_name" className="text-xs">Razón Social / Nombre <span className="text-rose-500">*</span></Label>
                            <Input 
                                id="sup_name" 
                                value={createSupplierData.legal_name} 
                                onChange={e => setCreateSupplierData('legal_name', e.target.value)} 
                                required 
                                className="bg-background border-input"
                            />
                            <InputError message={errorsSupplier.legal_name} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="sup_phone" className="text-xs">Teléfono</Label>
                                <Input 
                                    id="sup_phone" 
                                    value={createSupplierData.phone} 
                                    onChange={e => setCreateSupplierData('phone', e.target.value)} 
                                    className="bg-background border-input"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="sup_address" className="text-xs">Dirección</Label>
                                <Input 
                                    id="sup_address" 
                                    value={createSupplierData.address} 
                                    onChange={e => setCreateSupplierData('address', e.target.value)} 
                                    className="bg-background border-input"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateSupplierOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processingSupplier} className="bg-primary text-primary-foreground font-semibold">
                                {processingSupplier ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                Guardar Proveedor
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

PurchaseEdit.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
