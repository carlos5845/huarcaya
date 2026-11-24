import { Head, Link, useForm, router } from '@inertiajs/react';
import { getLastConnectivityStatus, searchLocalProducts } from '@/services/sync-service';
import { 
    Calculator, 
    ArrowLeft, 
    Plus, 
    Trash2, 
    Search, 
    Calendar, 
    Building2, 
    User, 
    Clock, 
    AlertTriangle, 
    Check, 
    HelpCircle,
    UserPlus,
    Save,
    X,
    Sparkles,
    Tag,
    Hash,
    Layers
} from 'lucide-react';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import QuickCustomerDialog from '@/components/quick-customer-dialog';

type Customer = {
    id: number;
    legal_name: string;
    document_type: string;
    document_number: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
};

type Branch = {
    id: number;
    name: string;
};

type ProductSearchItem = {
    id: number;
    name: string;
    primary_reference?: string | null;
    internal_code?: string | null;
    sku?: string | null;
    unit_price?: number;
    suggested_price?: number;
    current_stock?: number;
    available_quantity?: number;
    unit?: { code: string; name?: string };
    brand?: { name: string } | null;
};

type QuotationLineState = {
    product_id: number;
    product_reference: string;
    product_name: string;
    unit_code: string;
    current_stock: number;
    quantity: number | string;
    unit_price: number | string;
    discount_amount: number | string;
    delivery_time_line: string;
    notes: string;
};

type Props = {
    branches: Branch[];
    default_branch_id?: number;
    tentative_number: string;
    exchange_rate: number;
    customers: Customer[];
};

export default function QuotationsCreate({ branches, default_branch_id, tentative_number, exchange_rate, customers }: Props) {
    const [customerList, setCustomerList] = useState<Customer[]>(customers || []);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    
    // Búsqueda de productos
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ProductSearchItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Cerrar sugerencias al hacer click afuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Función para resaltar coincidencias
    const highlightMatch = (text?: string | null, query?: string) => {
        if (!text) return null;
        if (!query || !query.trim()) return text;

        const terms = query.trim().split(/\s+/).filter(Boolean);
        if (terms.length === 0) return text;

        const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const regex = new RegExp(`(${escaped})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, i) => 
            regex.test(part) ? (
                <mark key={i} className="bg-primary/20 text-primary font-semibold rounded-xs px-0.5">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const { data, setData, post, processing, errors } = useForm({
        branch_id: default_branch_id ? String(default_branch_id) : (branches[0]?.id ? String(branches[0].id) : ''),
        customer_id: '',
        operation_date: todayStr,
        validity_days: 15 as number | string,
        currency_code: 'PEN',
        exchange_rate: exchange_rate || 3.80,
        tax_mode: 'INCLUDED',
        payment_terms: 'Contado',
        delivery_time: 'Entrega inmediata',
        notes: '',
        lines: [] as QuotationLineState[],
    });

    // Búsqueda reactiva de repuestos en backend
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchResults([]);
            setIsSearchOpen(false);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsSearching(true);

            const loadLocal = async () => {
                const localItems = await searchLocalProducts(searchQuery, data.branch_id ? Number(data.branch_id) : undefined);
                setSearchResults(
                    localItems.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        primary_reference: p.primary_reference,
                        internal_code: p.barcode,
                        suggested_price: p.sale_price,
                        unit_price: p.sale_price,
                        current_stock: p.local_stock,
                        available_quantity: p.local_stock,
                        unit: { code: p.unit_code || 'NIU' },
                        brand: p.brand_name ? { name: p.brand_name } : null,
                    }))
                );
                setIsSearchOpen(true);
            };

            if (!navigator.onLine || !getLastConnectivityStatus()) {
                try {
                    await loadLocal();
                } finally {
                    setIsSearching(false);
                }
                return;
            }

            try {
                const url = data.branch_id 
                    ? `/products/search?q=${encodeURIComponent(searchQuery)}&branch_id=${data.branch_id}`
                    : `/products/search?q=${encodeURIComponent(searchQuery)}`;
                const res = await fetch(url);
                if (res.ok) {
                    const result = await res.json();
                    const items = Array.isArray(result) ? result : (result.data || []);
                    setSearchResults(items);
                    setIsSearchOpen(true);
                } else {
                    await loadLocal();
                }
            } catch {
                await loadLocal().catch(() => {});
            } finally {
                setIsSearching(false);
            }
        }, 200);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery, data.branch_id]);

    const handleAddProduct = (prod: ProductSearchItem) => {
        const existingIdx = data.lines.findIndex((l) => l.product_id === prod.id);
        const stock = prod.current_stock ?? prod.available_quantity ?? 0;
        const isSpecial = stock <= 0;

        if (existingIdx >= 0) {
            const updatedLines = [...data.lines];
            updatedLines[existingIdx].quantity = (Number(updatedLines[existingIdx].quantity) || 0) + 1;
            setData('lines', updatedLines);
            toast.info(`Cantidad actualizada para ${prod.name}`);
        } else {
            const newLine: QuotationLineState = {
                product_id: prod.id,
                product_reference: prod.primary_reference || prod.internal_code || prod.sku || 'N/A',
                product_name: prod.name,
                unit_code: prod.unit?.code || 'NIU',
                current_stock: stock,
                quantity: 1,
                unit_price: Number(prod.unit_price || prod.suggested_price || 0),
                discount_amount: 0,
                delivery_time_line: isSpecial ? '3 a 5 días hábiles' : 'Inmediata',
                notes: '',
            };
            setData('lines', [...data.lines, newLine]);
            if (isSpecial) {
                toast.warning(`Repuesto agregado bajo pedido (Stock actual: 0)`);
            } else {
                toast.success(`Repuesto agregado a la cotización`);
            }
        }
        setSearchQuery('');
        setSearchResults([]);
        setIsSearchOpen(false);
    };

    const handleRemoveLine = (index: number) => {
        const updated = [...data.lines];
        updated.splice(index, 1);
        setData('lines', updated);
    };

    const handleUpdateLine = (index: number, field: keyof QuotationLineState, val: any) => {
        const updated = [...data.lines];
        updated[index] = { ...updated[index], [field]: val };
        setData('lines', updated);
    };

    // Cálculos de totales
    const totals = useMemo(() => {
        let subtotal = 0;
        let discountTotal = 0;
        let grandTotal = 0;

        data.lines.forEach((l) => {
            const lineSub = Number(l.quantity) * Number(l.unit_price);
            const lineDisc = Number(l.discount_amount || 0);
            const lineTot = Math.max(0, lineSub - lineDisc);

            subtotal += lineSub;
            discountTotal += lineDisc;
            grandTotal += lineTot;
        });

        let tax = 0;
        let taxableBase = grandTotal;

        if (data.tax_mode === 'INCLUDED') {
            taxableBase = Math.round((grandTotal / 1.18) * 100) / 100;
            tax = Math.round((grandTotal - taxableBase) * 100) / 100;
        } else if (data.tax_mode === 'PLUS_TAX') {
            tax = Math.round(grandTotal * 0.18 * 100) / 100;
            grandTotal += tax;
            taxableBase = grandTotal - tax;
        } else {
            tax = 0;
            taxableBase = grandTotal;
        }

        return {
            subtotal: taxableBase,
            discount: discountTotal,
            tax,
            total: grandTotal,
        };
    }, [data.lines, data.tax_mode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.customer_id) {
            toast.warning('Debe seleccionar o registrar un cliente.');
            return;
        }
        if (data.lines.length === 0) {
            toast.warning('Debe agregar al menos un repuesto para cotizar.');
            return;
        }
        post('/quotations');
    };

    const selectedCustomer = customerList.find((c) => String(c.id) === String(data.customer_id));

    return (
        <>
            <Head title="Nueva Cotización" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
                {/* Cabecera de Página */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/quotations">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <Calculator className="h-6 w-6 text-primary" />
                                Nueva Cotización de Repuestos
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Correlativo tentativo: <strong className="font-mono text-foreground">{tentative_number}</strong>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild size="sm">
                            <Link href="/quotations">Cancelar</Link>
                        </Button>
                        <Button onClick={handleSubmit} disabled={processing} size="sm" className="font-semibold gap-1.5 shadow-xs">
                            <Save className="h-4 w-4" />
                            {processing ? 'Guardando...' : 'Emitir Cotización'}
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna Izquierda: Datos del Cliente y Condiciones */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="border border-border/60 shadow-xs">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <User className="h-4 w-4 text-primary" /> Datos del Cliente
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-8 px-3 py-1.5 text-xs font-semibold gap-1.5 text-primary border-primary/40 hover:bg-primary/10 transition-colors shadow-2xs"
                                        onClick={() => setIsCustomerModalOpen(true)}
                                    >
                                        <UserPlus className="h-3.5 w-3.5" /> Nuevo Cliente
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Seleccionar Cliente <span className="text-red-500">*</span></Label>
                                    <Select value={data.customer_id} onValueChange={(val) => setData('customer_id', val)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Buscar cliente registrado..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {customerList.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.legal_name} ({c.document_number})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.customer_id && <p className="text-xs text-rose-500">{errors.customer_id}</p>}
                                </div>

                                {selectedCustomer && (
                                    <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1 border border-border/50">
                                        <p><strong>Razón Social:</strong> {selectedCustomer.legal_name}</p>
                                        <p><strong>{selectedCustomer.document_type}:</strong> {selectedCustomer.document_number}</p>
                                        {selectedCustomer.phone && <p><strong>Teléfono:</strong> {selectedCustomer.phone}</p>}
                                        {selectedCustomer.email && <p><strong>Email:</strong> {selectedCustomer.email}</p>}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Sucursal Emisora</Label>
                                    <Select value={data.branch_id} onValueChange={(val) => setData('branch_id', val)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Seleccione sucursal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map((b) => (
                                                <SelectItem key={b.id} value={String(b.id)}>
                                                    {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Fecha Emisión</Label>
                                        <Input
                                            type="date"
                                            value={data.operation_date}
                                            onChange={(e) => setData('operation_date', e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs flex items-center justify-between">
                                            <span>Validez (Días)</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">Sugerido: 15</span>
                                        </Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={180}
                                            step="1"
                                            placeholder="15"
                                            value={data.validity_days}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => {
                                                const raw = e.target.value;
                                                setData('validity_days', raw === '' ? '' : parseInt(raw, 10));
                                            }}
                                            onBlur={() => {
                                                const parsed = parseInt(String(data.validity_days), 10);
                                                if (isNaN(parsed) || parsed < 1) {
                                                    setData('validity_days', 15);
                                                }
                                            }}
                                            className="h-9"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Moneda</Label>
                                        <Select value={data.currency_code} onValueChange={(val) => setData('currency_code', val)}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PEN">Soles (PEN S/)</SelectItem>
                                                <SelectItem value="USD">Dólares (USD $)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Régimen IGV</Label>
                                        <Select value={data.tax_mode} onValueChange={(val) => setData('tax_mode', val)}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="INCLUDED">IGV Incluido (18%)</SelectItem>
                                                <SelectItem value="PLUS_TAX">+ 18% IGV</SelectItem>
                                                <SelectItem value="EXEMPT">Exonerado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Condición de Pago</Label>
                                    <Input
                                        value={data.payment_terms}
                                        onChange={(e) => setData('payment_terms', e.target.value)}
                                        placeholder="Ej: Contado, Crédito a 15 días, 50% anticipo..."
                                        className="h-9"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Tiempo de Entrega General</Label>
                                    <Input
                                        value={data.delivery_time}
                                        onChange={(e) => setData('delivery_time', e.target.value)}
                                        placeholder="Ej: Entrega inmediata en tienda / 24 hrs..."
                                        className="h-9"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Notas / Observaciones</Label>
                                    <Textarea
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder="Instrucciones adicionales para el cliente..."
                                        className="h-20 text-xs"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna Derecha: Búsqueda y Tabla de Repuestos */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border border-border/60 shadow-xs">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                    <span>Repuestos & Artículos a Cotizar</span>
                                    <span className="text-xs font-normal text-muted-foreground">
                                        {data.lines.length} {data.lines.length === 1 ? 'ítem' : 'ítems'} agregados
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Buscador de repuestos con autosugerencias y resaltado */}
                                <div className="relative" ref={searchContainerRef}>
                                    <div className="flex items-center gap-2 border rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary bg-background shadow-2xs">
                                        <Search className="h-4 w-4 text-primary shrink-0" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => {
                                                if (searchResults.length > 0) setIsSearchOpen(true);
                                            }}
                                            placeholder="Escribe para autocompletar repuesto por nombre, código interno, referencia o marca..."
                                            className="w-full bg-transparent border-none text-sm outline-none placeholder:text-muted-foreground"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setSearchResults([]);
                                                    setIsSearchOpen(false);
                                                }}
                                                className="text-muted-foreground hover:text-foreground p-0.5"
                                                title="Limpiar búsqueda"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {isSearching && (
                                            <span className="text-[11px] font-medium text-primary animate-pulse whitespace-nowrap">
                                                Buscando coincidencias...
                                            </span>
                                        )}
                                    </div>

                                    {/* Dropdown de sugerencias de búsqueda con resaltado */}
                                    {isSearchOpen && searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto divide-y divide-border/60 animate-in fade-in-50 zoom-in-95 duration-100">
                                            <div className="p-2 bg-muted/40 text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                                                <span className="flex items-center gap-1.5">
                                                    <Sparkles className="h-3 w-3 text-primary" />
                                                    Sugerencias coincidentes ({searchResults.length})
                                                </span>
                                                <span className="text-[10px] font-normal">Clic para agregar</span>
                                            </div>

                                            {searchResults.map((p) => {
                                                const stock = Number(p.current_stock ?? p.available_quantity ?? 0);
                                                const hasStock = stock > 0;
                                                const price = Number(p.unit_price || p.suggested_price || 0);

                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => handleAddProduct(p)}
                                                        className="p-3 hover:bg-accent/60 cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-semibold text-sm text-foreground flex items-center gap-2 flex-wrap">
                                                                <span>{highlightMatch(p.name, searchQuery)}</span>
                                                                {!hasStock ? (
                                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] py-0 px-1.5 font-medium">
                                                                        Sin Stock (Bajo Pedido)
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5 font-medium">
                                                                        Stock disponible
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Referencias, códigos y marca */}
                                                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 font-mono">
                                                                {(p.primary_reference || p.sku) && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Hash className="h-3 w-3 text-muted-foreground/70" />
                                                                        Ref: <strong className="text-foreground">{highlightMatch(p.primary_reference || p.sku, searchQuery)}</strong>
                                                                    </span>
                                                                )}

                                                                {p.internal_code && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Layers className="h-3 w-3 text-muted-foreground/70" />
                                                                        Cód: <strong className="text-foreground">{highlightMatch(p.internal_code, searchQuery)}</strong>
                                                                    </span>
                                                                )}

                                                                {p.brand?.name && (
                                                                    <span className="flex items-center gap-1 font-sans">
                                                                        <Tag className="h-3 w-3 text-muted-foreground/70" />
                                                                        Marca: <strong className="text-foreground">{highlightMatch(p.brand.name, searchQuery)}</strong>
                                                                    </span>
                                                                )}

                                                                <span className="font-sans ml-auto sm:ml-0 text-muted-foreground">
                                                                    Stock: <strong className={hasStock ? 'text-foreground' : 'text-amber-600 font-bold'}>{stock} {p.unit?.code || 'NIU'}</strong>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Precio y botón de agregar */}
                                                        <div className="text-right shrink-0 flex items-center gap-2">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[11px] text-muted-foreground">Precio Unit.</span>
                                                                <span className="text-sm font-bold text-primary font-mono">
                                                                    S/ {price.toFixed(2)}
                                                                </span>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-7 w-7 rounded-full border-primary/30 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0 ml-1"
                                                            >
                                                                <Plus className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Estado vacío cuando busca y no encuentra */}
                                    {isSearchOpen && !isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-4 text-center animate-in fade-in-50 duration-100">
                                            <p className="text-xs text-muted-foreground">
                                                No se encontraron repuestos que coincidan con <strong className="text-foreground">"{searchQuery}"</strong> en nombre, referencia o códigos.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Tabla de líneas */}
                                <div className="rounded-md border border-border/60 overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-muted/60 text-muted-foreground uppercase font-semibold border-b">
                                            <tr>
                                                <th className="py-2.5 px-3">Repuesto / Detalle</th>
                                                <th className="py-2.5 px-3 w-20 text-center">Cant.</th>
                                                <th className="py-2.5 px-3 w-28 text-right">P. Unitario</th>
                                                <th className="py-2.5 px-3 w-24 text-right">Desc.</th>
                                                <th className="py-2.5 px-3 w-28 text-right">Total</th>
                                                <th className="py-2.5 px-2 w-10 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {data.lines.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                                        Usa el buscador superior para agregar repuestos a la cotización.
                                                    </td>
                                                </tr>
                                            ) : (
                                                data.lines.map((line, idx) => {
                                                    const isSpecial = line.current_stock <= 0;
                                                    const lineTotal = Math.max(0, ((Number(line.quantity) || 0) * (Number(line.unit_price) || 0)) - (Number(line.discount_amount) || 0));
                                                    return (
                                                        <tr key={idx} className={isSpecial ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                                                            <td className="py-2.5 px-3 space-y-1">
                                                                <div className="font-medium text-foreground flex items-center gap-1.5">
                                                                    {line.product_name}
                                                                    {isSpecial && (
                                                                        <span className="text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                                                            <AlertTriangle className="h-3 w-3" /> Pedido Especial
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                                                                    <span>Ref: {line.product_reference}</span>
                                                                    <span>• U.M: {line.unit_code}</span>
                                                                </div>
                                                                {isSpecial && (
                                                                    <div className="flex items-center gap-1.5 pt-1">
                                                                        <Clock className="h-3 w-3 text-amber-600" />
                                                                        <Input
                                                                            type="text"
                                                                            value={line.delivery_time_line}
                                                                            onChange={(e) => handleUpdateLine(idx, 'delivery_time_line', e.target.value)}
                                                                            placeholder="Tiempo de llegada estimado..."
                                                                            className="h-6 text-[11px] max-w-[200px]"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    step="1"
                                                                    placeholder="1"
                                                                    value={line.quantity}
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => {
                                                                        const raw = e.target.value;
                                                                        handleUpdateLine(idx, 'quantity', raw === '' ? '' : parseInt(raw, 10));
                                                                    }}
                                                                    onBlur={() => {
                                                                        const parsed = parseInt(String(line.quantity), 10);
                                                                        if (isNaN(parsed) || parsed < 1) {
                                                                            handleUpdateLine(idx, 'quantity', 1);
                                                                        }
                                                                    }}
                                                                    className="h-8 text-center text-xs"
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right">
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={line.unit_price}
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => handleUpdateLine(idx, 'unit_price', e.target.value)}
                                                                    onBlur={() => {
                                                                        const parsed = parseFloat(String(line.unit_price));
                                                                        handleUpdateLine(idx, 'unit_price', isNaN(parsed) || parsed < 0 ? 0 : parsed);
                                                                    }}
                                                                    className="h-8 text-right text-xs"
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right">
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={line.discount_amount}
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => handleUpdateLine(idx, 'discount_amount', e.target.value)}
                                                                    onBlur={() => {
                                                                        const parsed = parseFloat(String(line.discount_amount));
                                                                        handleUpdateLine(idx, 'discount_amount', isNaN(parsed) || parsed < 0 ? 0 : parsed);
                                                                    }}
                                                                    className="h-8 text-right text-xs"
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-bold text-foreground">
                                                                {data.currency_code === 'USD' ? '$' : 'S/'} {lineTotal.toFixed(2)}
                                                            </td>
                                                            <td className="py-2.5 px-2 text-center">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                                    onClick={() => handleRemoveLine(idx)}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Resumen de totales */}
                                <div className="flex justify-end pt-2">
                                    <div className="w-full sm:w-72 border rounded-md p-3 space-y-2 bg-muted/30 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Subtotal Gravado:</span>
                                            <span className="font-medium">{data.currency_code === 'USD' ? '$' : 'S/'} {totals.subtotal.toFixed(2)}</span>
                                        </div>
                                        {totals.discount > 0 && (
                                            <div className="flex justify-between text-emerald-600">
                                                <span>Descuentos:</span>
                                                <span className="font-medium">- {data.currency_code === 'USD' ? '$' : 'S/'} {totals.discount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">I.G.V. (18%):</span>
                                            <span className="font-medium">{data.currency_code === 'USD' ? '$' : 'S/'} {totals.tax.toFixed(2)}</span>
                                        </div>
                                        <div className="border-t pt-2 flex justify-between text-sm font-bold text-primary">
                                            <span>TOTAL COTIZACIÓN:</span>
                                            <span>{data.currency_code === 'USD' ? '$' : 'S/'} {totals.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </form>

                {/* Modal de Cliente Rápido */}
                <QuickCustomerDialog
                    open={isCustomerModalOpen}
                    onOpenChange={setIsCustomerModalOpen}
                    onCustomerCreated={(newCust) => {
                        setCustomerList((prev) => [newCust, ...prev]);
                        setData('customer_id', String(newCust.id));
                        toast.success(`Cliente ${newCust.legal_name} seleccionado.`);
                    }}
                />
            </div>
        </>
    );
}

QuotationsCreate.layout = {
    breadcrumbs: [
        { title: 'Comercial y Ventas', href: '#' },
        { title: 'Cotizaciones', href: '/quotations' },
        { title: 'Nueva Cotización', href: '/quotations/create' },
    ],
};
