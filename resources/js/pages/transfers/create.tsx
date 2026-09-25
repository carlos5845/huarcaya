import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    ArrowLeft, 
    ArrowRight, 
    ArrowRightLeft, 
    Building2, 
    Store, 
    Package, 
    Search, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    AlertTriangle, 
    FileText, 
    Clock, 
    Check,
    Send
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Transferencias', href: '/transfers' },
    { title: 'Nueva Transferencia', href: '/transfers/create' },
];

export default function TransfersCreate({ 
    myBranches = [], 
    allBranches = [] 
}: { 
    myBranches: any[]; 
    allBranches: any[]; 
}) {
    const { auth } = usePage<any>().props;
    const defaultSource = myBranches.length === 1 ? myBranches[0].id.toString() : '';

    const { data, setData, post, processing, errors } = useForm({
        source_branch_id: defaultSource,
        destination_branch_id: '',
        notes: '',
        lines: [] as {
            product_id: number;
            name: string;
            sku: string;
            brand_name: string | null;
            available: number;
            requested_quantity: number | string;
        }[],
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
            const branchQuery = data.source_branch_id ? `&branch_id=${data.source_branch_id}` : '';
            fetch(`/products/search?q=${encodeURIComponent(searchQuery)}${branchQuery}`, {
                headers: { 'Accept': 'application/json' }
            })
            .then(res => res.json())
            .then(resultData => {
                setSearchResults(resultData);
                setIsSearching(false);
            })
            .catch(() => setIsSearching(false));
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, data.source_branch_id]);

    const handleSourceChange = (newSourceId: string) => {
        setData('source_branch_id', newSourceId);
        if (data.destination_branch_id === newSourceId) {
            setData('destination_branch_id', '');
        }

        // Re-verify stocks of already added lines when source branch changes
        if (data.lines.length > 0 && newSourceId) {
            data.lines.forEach((line, idx) => {
                fetch(`/products/search?q=${encodeURIComponent(line.sku)}&branch_id=${newSourceId}`)
                    .then(r => r.json())
                    .then(results => {
                        const found = results.find((p: any) => p.id === line.product_id);
                        if (found) {
                            const newLines = [...data.lines];
                            newLines[idx].available = found.available_quantity || 0;
                            setData('lines', newLines);
                        }
                    })
                    .catch(() => {});
            });
        }
    };

    const addProduct = (product: any) => {
        const existingIndex = data.lines.findIndex(l => l.product_id === product.id);
        if (existingIndex >= 0) {
            const currentQty = parseFloat(data.lines[existingIndex].requested_quantity.toString()) || 0;
            updateLineQty(existingIndex, (currentQty + 1).toString());
        } else {
            setData('lines', [
                ...data.lines,
                {
                    product_id: product.id,
                    name: product.name,
                    sku: product.primary_reference || product.internal_code || 'S/C',
                    brand_name: product.brand?.name || null,
                    available: product.available_quantity || 0,
                    requested_quantity: 1,
                }
            ]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeLine = (index: number) => {
        const newLines = [...data.lines];
        newLines.splice(index, 1);
        setData('lines', newLines);
    };

    const updateLineQty = (index: number, val: string) => {
        const newLines = [...data.lines];
        newLines[index].requested_quantity = val;
        setData('lines', newLines);
    };

    const totalItemsCount = data.lines.length;
    const totalUnitsCount = data.lines.reduce((acc, l) => acc + (parseFloat(l.requested_quantity.toString()) || 0), 0);
    const sourceBranch = allBranches.find((b: any) => b.id.toString() === data.source_branch_id);
    const destinationBranch = allBranches.find((b: any) => b.id.toString() === data.destination_branch_id);

    const hasStockIssues = data.lines.some(l => (parseFloat(l.requested_quantity.toString()) || 0) > (parseFloat(l.available.toString()) || 0));
    const isSameBranch = Boolean(data.source_branch_id && data.destination_branch_id && data.source_branch_id === data.destination_branch_id);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.source_branch_id) {
            alert('Debe seleccionar la sucursal de origen.');
            return;
        }
        if (!data.destination_branch_id) {
            alert('Debe seleccionar la sucursal de destino.');
            return;
        }
        if (isSameBranch) {
            alert('La sucursal de origen y destino no pueden ser la misma.');
            return;
        }
        if (data.lines.length === 0) {
            alert('Debe agregar al menos un producto a la transferencia.');
            return;
        }
        post('/transfers');
    };

    return (
        <>
            <Head title="Nueva Transferencia" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 max-w-6xl mx-auto w-full">
                {/* Header with Navigation & Action Buttons */}
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-4">
                            <Link href="/transfers">
                                <Button variant="outline" size="icon" className="h-9 w-9">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Nueva Transferencia entre Sucursales
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Solicita y traslada existencias de repuestos y mercadería entre almacenes.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                Modo: Solicitud de Traspaso
                            </div>
                            <Link href="/transfers">
                                <Button type="button" variant="outline" size="sm">
                                    Cancelar
                                </Button>
                            </Link>
                            <Button 
                                type="button" 
                                size="sm" 
                                onClick={submit}
                                disabled={processing || data.lines.length === 0 || !data.source_branch_id || !data.destination_branch_id || isSameBranch}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            >
                                <Send className="h-3.5 w-3.5" /> Registrar Transferencia
                            </Button>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Visual Route Flow Card */}
                    <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs">
                        <div className="flex items-center justify-between border-b pb-3 mb-5">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                                    Ruta de Transferencia y Almacenes
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Define el almacén de salida y el almacén receptor de los productos.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Fecha: {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                            {/* Sucursal Origen (5 cols) */}
                            <div className="md:col-span-5 p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            <Building2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                                Almacén Origen (Emisor) <span className="text-red-500">*</span>
                                            </Label>
                                            <span className="text-[11px] text-muted-foreground block">
                                                Punto desde donde saldrá la mercadería
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-background">
                                        Salida
                                    </Badge>
                                </div>

                                <Select value={data.source_branch_id} onValueChange={handleSourceChange}>
                                    <SelectTrigger className="h-10 bg-background">
                                        <SelectValue placeholder="Seleccione sucursal de origen..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {myBranches.map((b: any) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <Store className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="font-medium">{b.name}</span>
                                                    {b.code && <span className="text-xs text-muted-foreground">({b.code})</span>}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.source_branch_id} />
                            </div>

                            {/* Flow Connector Arrow (1 col) */}
                            <div className="md:col-span-1 flex flex-col items-center justify-center my-1 md:my-0">
                                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                                    <ArrowRight className="h-5 w-5 hidden md:block" />
                                    <ArrowRightLeft className="h-5 w-5 md:hidden" />
                                </div>
                                <span className="text-[10px] font-semibold text-muted-foreground mt-1 tracking-wider uppercase">
                                    Hacia
                                </span>
                            </div>

                            {/* Sucursal Destino (5 cols) */}
                            <div className="md:col-span-5 p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <Store className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                                Almacén Destino (Receptor) <span className="text-red-500">*</span>
                                            </Label>
                                            <span className="text-[11px] text-muted-foreground block">
                                                Punto que recepcionará y validará el ingreso
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-background">
                                        Ingreso
                                    </Badge>
                                </div>

                                <Select value={data.destination_branch_id} onValueChange={(v) => setData('destination_branch_id', v)}>
                                    <SelectTrigger className="h-10 bg-background">
                                        <SelectValue placeholder="Seleccione sucursal de destino..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allBranches.map((b: any) => (
                                            <SelectItem 
                                                key={b.id} 
                                                value={b.id.toString()}
                                                disabled={b.id.toString() === data.source_branch_id}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="font-medium">{b.name}</span>
                                                    {b.id.toString() === data.source_branch_id && (
                                                        <span className="text-xs text-rose-500 font-normal">(Es el origen)</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.destination_branch_id} />
                            </div>
                        </div>

                        {isSameBranch && (
                            <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>La sucursal de origen y destino no pueden ser la misma. Selecciona un destino diferente.</span>
                            </div>
                        )}
                    </div>

                    {/* 2-Column Main Body Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* LEFT COLUMN: Products Catalogue & Table (2 Cols) */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Products Card */}
                            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-base text-foreground">
                                                Productos a Transferir
                                            </h3>
                                            <Badge variant="secondary" className="text-xs">
                                                {totalItemsCount} {totalItemsCount === 1 ? 'ítem' : 'ítems'}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            Total acumulado: {totalUnitsCount.toFixed(2)} unidades
                                        </span>
                                    </div>

                                    {/* Product Search Bar */}
                                    <div className="w-full sm:w-80 relative">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                placeholder="Buscar por código, nombre o marca..."
                                                className="pl-8 h-9 bg-background"
                                                value={searchQuery}
                                                disabled={!data.source_branch_id}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>

                                        {/* Dropdown Floating Results */}
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
                                                                <span className="font-mono">{p.primary_reference || p.internal_code || 'S/C'}</span>
                                                                {p.brand?.name && <span>• {p.brand.name}</span>}
                                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${p.available_quantity > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'}`}>
                                                                    Origen: {p.available_quantity || 0}
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

                                {!data.source_branch_id ? (
                                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-3">
                                        <Building2 className="h-5 w-5 shrink-0 text-blue-600" />
                                        <span>Selecciona primero la <strong>Sucursal de Origen</strong> en la parte superior para consultar el stock disponible en tiempo real de cada repuesto.</span>
                                    </div>
                                ) : hasStockIssues && (
                                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                                        <span>Atención: Uno o más productos superan el stock disponible en la sucursal de origen. Ajusta las cantidades antes de registrar.</span>
                                    </div>
                                )}

                                <InputError message={errors.lines} />

                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b">
                                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">Código / Ref</TableHead>
                                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</TableHead>
                                                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">Stock Origen</TableHead>
                                                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">Cantidad a Enviar</TableHead>
                                                <TableHead className="w-12"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.lines.length > 0 ? (
                                                data.lines.map((line, idx) => {
                                                    const requestedNum = parseFloat(line.requested_quantity.toString()) || 0;
                                                    const availableNum = parseFloat(line.available.toString()) || 0;
                                                    const isOverStock = requestedNum > availableNum;

                                                    return (
                                                        <TableRow key={idx} className="hover:bg-muted/40 transition-colors">
                                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                                {line.sku}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                                                        <Package className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="font-semibold text-sm text-foreground truncate">
                                                                            {line.name}
                                                                        </div>
                                                                        {line.brand_name && (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                Marca: {line.brand_name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <span className={cn(
                                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                                                    availableNum > 0 
                                                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" 
                                                                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                                                )}>
                                                                    {availableNum} disp.
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="space-y-1">
                                                                    <Input 
                                                                        type="number" 
                                                                        min="0.01" 
                                                                        step="1" 
                                                                        value={line.requested_quantity} 
                                                                        onChange={e => updateLineQty(idx, e.target.value)} 
                                                                        className={cn(
                                                                            "h-8 text-center font-bold font-mono",
                                                                            isOverStock && "border-rose-500 focus-visible:ring-rose-500 bg-rose-50/50 dark:bg-rose-950/20"
                                                                        )}
                                                                    />
                                                                    {isOverStock && (
                                                                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold block">
                                                                            Excede stock
                                                                        </span>
                                                                    )}
                                                                </div>
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
                                                    );
                                                })
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                        <div className="flex flex-col items-center justify-center gap-2">
                                                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground/60">
                                                                <ArrowRightLeft className="h-6 w-6" />
                                                            </div>
                                                            <p className="text-sm font-medium text-foreground">No hay productos agregados a la transferencia</p>
                                                            <p className="text-xs text-muted-foreground max-w-sm">
                                                                Utiliza el buscador superior para seleccionar repuestos o existencias disponibles en la sucursal de origen.
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Summary & Confirmation (1 Col) */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Operation Summary Card */}
                            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                                <h3 className="font-semibold text-base text-foreground border-b pb-3">
                                    Resumen de la Transferencia
                                </h3>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Origen:</span>
                                        <span className="font-semibold text-foreground text-right truncate max-w-[170px]">
                                            {sourceBranch?.name || 'No seleccionado'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Destino:</span>
                                        <span className="font-semibold text-foreground text-right truncate max-w-[170px]">
                                            {destinationBranch?.name || 'No seleccionado'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Variedad de Ítems:</span>
                                        <span className="font-semibold text-foreground">{totalItemsCount} productos</span>
                                    </div>
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Total Unidades:</span>
                                        <span className="font-extrabold text-base text-foreground">{totalUnitsCount} uds.</span>
                                    </div>
                                    <div className="pt-2 border-t flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground font-medium">Estado Inicial:</span>
                                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                            Solicitado (Borrador)
                                        </Badge>
                                    </div>
                                </div>

                                {/* Stock Health Check Badge */}
                                <div className="pt-2 border-t">
                                    {data.lines.length === 0 ? (
                                        <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground text-center">
                                            Añade productos para validar disponibilidad
                                        </div>
                                    ) : hasStockIssues ? (
                                        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                                            <span>Existen cantidades que superan el stock disponible.</span>
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                            <span>Todas las unidades cuentan con stock suficiente en origen.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Notes & Justification Card */}
                            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-3">
                                <h3 className="font-semibold text-base text-foreground border-b pb-3">
                                    Notas u Observaciones
                                </h3>
                                <Textarea 
                                    id="notes" 
                                    rows={4} 
                                    value={data.notes} 
                                    onChange={e => setData('notes', e.target.value)} 
                                    placeholder="Motivo del traslado (ej. Reabastecimiento semanal, pedido especial de cliente, urgencia taller)..." 
                                    className="resize-none bg-background"
                                />
                                <div className="pt-1 text-xs text-muted-foreground/80 leading-normal">
                                    Estas notas se incluirán en el comprobante y en la guía de remisión de salida interna.
                                </div>
                            </div>

                            {/* Action Buttons Card */}
                            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-xs space-y-4">
                                <h3 className="font-semibold text-base text-foreground border-b pb-3">
                                    Confirmación del Traspaso
                                </h3>
                                
                                <div className="space-y-1.5">
                                    <Button 
                                        type="button" 
                                        onClick={submit}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-xs h-11" 
                                        disabled={processing || data.lines.length === 0 || !data.source_branch_id || !data.destination_branch_id || isSameBranch}
                                    >
                                        <Send className="h-4 w-4" /> Registrar Transferencia
                                    </Button>
                                    <p className="text-[11px] text-muted-foreground text-center">
                                        Crea la solicitud para que el almacén de origen proceda con el embalaje y despacho.
                                    </p>
                                </div>

                                <Link href="/transfers" className="block w-full pt-1">
                                    <Button type="button" variant="ghost" className="w-full h-8 text-xs text-muted-foreground hover:text-foreground">
                                        Cancelar y Regresar
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

TransfersCreate.layout = (page: any) => <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>;
