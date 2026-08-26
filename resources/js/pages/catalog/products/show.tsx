import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import InputError from '@/components/input-error';
import { PackageOpen, ArrowLeft, Plus, Trash2, DollarSign, Archive, Layers, Save, Search, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Branch = { id: number; name: string };
type Component = { id: number; product_id: number; quantity: number; product: { primary_reference: string, name: string } };

type Product = {
    id: number;
    internal_code: string | null;
    primary_reference: string;
    name: string;
    product_type: 'SIMPLE' | 'KIT_UNICO' | 'KIT_COMPONENTES';
    status: 'ACTIVE' | 'INACTIVE';
    prices: any[];
    min_prices: any[];
    min_stocks: any[];
    kit_versions: { id: number, version_name: string, status: string, components: Component[] }[];
};

type Props = {
    product: Product;
    branches: Branch[];
    flash: { success?: string };
};

export default function ProductSettings({ product, branches, flash, isSuperAdmin = false }: Props & { isSuperAdmin?: boolean }) {
    const activeKitVersion = product.kit_versions.find(v => v.status === 'ACTIVE') || { components: [] };
    
    // Price Form
    const { data: priceData, setData: setPriceData, post: postPrice, reset: resetPrice, errors: priceErrors, processing: priceProcessing } = useForm({
        branch_id: (!isSuperAdmin && branches.length === 1) ? branches[0].id.toString() : 'GLOBAL',
        amount: ''
    });

    // Min Price Form
    const { data: minPriceData, setData: setMinPriceData, post: postMinPrice, reset: resetMinPrice, errors: minPriceErrors, processing: minPriceProcessing } = useForm({
        branch_id: (!isSuperAdmin && branches.length === 1) ? branches[0].id.toString() : 'GLOBAL',
        amount: ''
    });

    // Min Stock Form
    const { data: stockData, setData: setStockData, post: postStock, reset: resetStock, errors: stockErrors, processing: stockProcessing } = useForm({
        branch_id: (!isSuperAdmin && branches.length === 1) ? branches[0].id.toString() : '',
        quantity: ''
    });

    // Kit Components Form
    const { data: kitData, setData: setKitData, post: postKit, errors: kitErrors, processing: kitProcessing } = useForm({
        components: activeKitVersion.components.map(c => ({
            product_id: c.product_id,
            quantity: parseFloat(c.quantity),
            _ref: c.product?.primary_reference,
            _name: c.product?.name
        }))
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        try {
            const res = await fetch(`/products/search?q=${searchQuery}`);
            const data = await res.json();
            setSearchResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const addComponent = (prod: any) => {
        if (kitData.components.find(c => c.product_id === prod.id)) return; // Already exists
        if (prod.id === product.id) return; // Cannot add itself

        setKitData('components', [
            ...kitData.components, 
            { product_id: prod.id, quantity: 1, _ref: prod.primary_reference, _name: prod.name }
        ]);
        setSearchResults([]);
        setSearchQuery('');
    };

    const removeComponent = (idx: number) => {
        const newComps = [...kitData.components];
        newComps.splice(idx, 1);
        setKitData('components', newComps);
    };

    const updateQuantity = (idx: number, qty: string) => {
        const newComps = [...kitData.components];
        newComps[idx].quantity = parseFloat(qty) || 0;
        setKitData('components', newComps);
    };

    const submitPrice = (e: React.FormEvent) => {
        e.preventDefault();
        postPrice(`/products/${product.id}/prices`, {
            preserveScroll: true,
            onSuccess: () => resetPrice('amount')
        });
    };

    const submitMinPrice = (e: React.FormEvent) => {
        e.preventDefault();
        postMinPrice(`/products/${product.id}/min-prices`, {
            preserveScroll: true,
            onSuccess: () => resetMinPrice('amount')
        });
    };

    const submitStock = (e: React.FormEvent) => {
        e.preventDefault();
        postStock(`/products/${product.id}/min-stocks`, {
            preserveScroll: true,
            onSuccess: () => resetStock('quantity')
        });
    };

    const submitKit = (e: React.FormEvent) => {
        e.preventDefault();
        postKit(`/products/${product.id}/kit-components`, {
            preserveScroll: true,
        });
    };

    const removePrice = (id: number, type: 'price' | 'min-price' | 'min-stock') => {
        if (confirm('¿Estás seguro de eliminar este registro?')) {
            if (type === 'price') router.delete(`/products/${product.id}/prices/${id}`);
            if (type === 'min-price') router.delete(`/products/${product.id}/min-prices/${id}`);
            if (type === 'min-stock') router.delete(`/products/${product.id}/min-stocks/${id}`);
        }
    };

    return (
        <>
            <Head title={`Configuración: ${product.primary_reference}`} />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8 max-w-6xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" asChild>
                            <Link href="/products">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <Settings className="h-6 w-6 text-primary" />
                                Configuración de Producto
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                                <span className="font-mono text-black dark:text-white font-medium bg-muted px-2 py-0.5 rounded">{product.primary_reference}</span>
                                {product.name}
                            </p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="prices" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 lg:grid-cols-3">
                        <TabsTrigger value="prices"><DollarSign className="h-4 w-4 mr-2"/> Precios</TabsTrigger>
                        <TabsTrigger value="stocks"><Archive className="h-4 w-4 mr-2"/> Stock Mínimo</TabsTrigger>
                        {product.product_type === 'KIT_COMPONENTES' && (
                            <TabsTrigger value="kit"><Layers className="h-4 w-4 mr-2"/> Composición Kit</TabsTrigger>
                        )}
                    </TabsList>
                    
                    {/* PRICES TAB */}
                    <TabsContent value="prices" className="mt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Precio Sugerido */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Precio Sugerido (Público)</CardTitle>
                                    <CardDescription>Establece el precio general o excepciones por sucursal.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={submitPrice} className="flex gap-2 items-end mb-6">
                                        {isSuperAdmin && (
<div className="grid gap-2 flex-1">
                                            <Label>Sucursal (Excepción)</Label>
                                            <Select value={priceData.branch_id} onValueChange={v => setPriceData('branch_id', v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Global (Todas)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GLOBAL">Global (Predeterminado)</SelectItem>
                                                    {branches.map(b => (
                                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
)}
                                        <div className="grid gap-2 w-32">
                                            <Label>Monto (PEN)</Label>
                                            <Input type="number" step="0.01" min="0" value={priceData.amount} onChange={e => setPriceData('amount', e.target.value)} required />
                                        </div>
                                        <Button type="submit" disabled={priceProcessing}><Plus className="h-4 w-4" /></Button>
                                    </form>

                                    <div className="rounded-md border overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th className="p-2 text-left font-medium">Sucursal</th>
                                                    <th className="p-2 text-right font-medium">Precio</th>
                                                    <th className="p-2 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {product.prices.map((p: any) => (
                                                    <tr key={p.id}>
                                                        <td className="p-2">{p.branch ? p.branch.name : <Badge variant="secondary">Global</Badge>}</td>
                                                        <td className="p-2 text-right font-mono font-medium">S/ {parseFloat(p.amount).toFixed(2)}</td>
                                                        <td className="p-2">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removePrice(p.id, 'price')}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {product.prices.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Sin precios registrados</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Precio Mínimo */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-red-600 dark:text-red-400">Precio Mínimo (Límite)</CardTitle>
                                    <CardDescription>Establece el precio más bajo permitido para ventas.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={submitMinPrice} className="flex gap-2 items-end mb-6">
                                        {isSuperAdmin && (
<div className="grid gap-2 flex-1">
                                            <Label>Sucursal (Excepción)</Label>
                                            <Select value={minPriceData.branch_id} onValueChange={v => setMinPriceData('branch_id', v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Global (Todas)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GLOBAL">Global (Predeterminado)</SelectItem>
                                                    {branches.map(b => (
                                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
)}
                                        <div className="grid gap-2 w-32">
                                            <Label>Monto (PEN)</Label>
                                            <Input type="number" step="0.01" min="0" value={minPriceData.amount} onChange={e => setMinPriceData('amount', e.target.value)} required />
                                        </div>
                                        <Button type="submit" variant="destructive" disabled={minPriceProcessing}><Plus className="h-4 w-4" /></Button>
                                    </form>

                                    <div className="rounded-md border overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-red-50 dark:bg-red-900/10">
                                                <tr>
                                                    <th className="p-2 text-left font-medium">Sucursal</th>
                                                    <th className="p-2 text-right font-medium">Precio Mín.</th>
                                                    <th className="p-2 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {product.min_prices.map((p: any) => (
                                                    <tr key={p.id}>
                                                        <td className="p-2">{p.branch ? p.branch.name : <Badge variant="secondary">Global</Badge>}</td>
                                                        <td className="p-2 text-right font-mono font-medium text-red-600 dark:text-red-400">S/ {parseFloat(p.amount).toFixed(2)}</td>
                                                        <td className="p-2">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removePrice(p.id, 'min-price')}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {product.min_prices.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Sin precios mínimos</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* STOCKS TAB */}
                    <TabsContent value="stocks" className="mt-6 space-y-6">
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Existencias Actuales por Sucursal</CardTitle>
                                <CardDescription>Consolidado de inventario actual de este repuesto.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="p-2 font-medium">Sucursal</th>
                                                <th className="p-2 font-medium">Ubicación</th>
                                                <th className="p-2 text-right font-medium">Físico</th>
                                                <th className="p-2 text-right font-medium">Reservado</th>
                                                <th className="p-2 text-right font-medium">Disponible</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {product.inventories && product.inventories.map((inv: any) => {
                                                const branchLots = product.lots?.filter((l: any) => l.branch_id === inv.branch_id) || [];
                                                const locationDisplay = branchLots.length > 1 ? 'Múltiples' : (branchLots[0]?.location?.name || '-');
                                                return (
                                                    <tr key={inv.id}>
                                                        <td className="p-2">{inv.branch?.name}</td>
                                                        <td className="p-2">{locationDisplay}</td>
                                                        <td className="p-2 text-right font-mono">{parseFloat(inv.physical_quantity)}</td>
                                                        <td className="p-2 text-right font-mono text-orange-600">
                                                            {parseFloat(inv.physical_quantity) - parseFloat(inv.available_quantity)}
                                                        </td>
                                                    <td className="p-2 text-right font-mono font-medium text-green-600">
                                                        {parseFloat(inv.available_quantity)}
                                                    </td>
                                                </tr>
                                            ); })}
                                            {(!product.inventories || product.inventories.length === 0) && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                        No hay existencias registradas para este producto.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="max-w-2xl">
                            <CardHeader>
                                <CardTitle>Configuración de Stock Mínimo</CardTitle>
                                <CardDescription>Establece el nivel de alerta de stock por cada sucursal física.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submitStock} className="flex gap-2 items-end mb-6">
                                    <div className="grid gap-2 flex-1">
                                        <Label>Sucursal Fïsica <span className="text-red-500">*</span></Label>
                                        <Select value={stockData.branch_id} onValueChange={v => setStockData('branch_id', v)} required>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branches.map(b => (
                                                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2 w-32">
                                        <Label>Cantidad</Label>
                                        <Input type="number" step="1" min="0" value={stockData.quantity} onChange={e => setStockData('quantity', e.target.value)} required />
                                    </div>
                                    <Button type="submit" disabled={stockProcessing}><Save className="h-4 w-4" /></Button>
                                </form>

                                <div className="rounded-md border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="p-2 text-left font-medium">Sucursal</th>
                                                <th className="p-2 text-right font-medium">Stock Mínimo Alerta</th>
                                                <th className="p-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {product.min_stocks.map((p: any) => (
                                                <tr key={p.id}>
                                                    <td className="p-2">{p.branch?.name}</td>
                                                    <td className="p-2 text-right font-mono font-medium">{parseFloat(p.minimum_quantity)}</td>
                                                    <td className="p-2">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removePrice(p.id, 'min-stock')}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {product.min_stocks.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Sin configuración de stock</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* KIT TAB */}
                    {product.product_type === 'KIT_COMPONENTES' && (
                        <TabsContent value="kit" className="mt-6 max-w-4xl">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Composición del Kit (Lista de Materiales)</CardTitle>
                                    <CardDescription>
                                        Define las partes que componen este Kit. El sistema creará una nueva versión por cada cambio. Versiones anteriores: {product.kit_versions.length}. Agrega los repuestos y las cantidades exactas que conforman este kit. Al venderse, se descontará el stock de estos componentes.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-3 gap-8">
                                        {/* Buscador */}
                                        <div className="md:col-span-1 space-y-4">
                                            <div className="space-y-2">
                                                <Label>Buscar Repuesto</Label>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        placeholder="Referencia o nombre..." 
                                                        value={searchQuery}
                                                        onChange={e => setSearchQuery(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                                    />
                                                    <Button variant="secondary" onClick={handleSearch} disabled={isSearching}>
                                                        <Search className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {searchResults.length > 0 && (
                                                <div className="border rounded-md divide-y max-h-80 overflow-y-auto">
                                                    {searchResults.map(res => (
                                                        <div key={res.id} className="p-2 text-sm flex justify-between items-center hover:bg-muted/50">
                                                            <div>
                                                                <div className="font-medium font-mono">{res.primary_reference}</div>
                                                                <div className="text-xs text-muted-foreground truncate w-40">{res.name}</div>
                                                            </div>
                                                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => addComponent(res)}><Plus className="h-3 w-3" /></Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Componentes */}
                                        <div className="md:col-span-2">
                                            <form onSubmit={submitKit}>
                                                <div className="rounded-md border overflow-hidden mb-4">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-orange-50 text-orange-900 dark:bg-orange-900/20 dark:text-orange-400">
                                                            <tr>
                                                                <th className="p-3 text-left font-medium">Repuesto Componente</th>
                                                                <th className="p-3 text-right font-medium w-24">Cant.</th>
                                                                <th className="p-3 w-12"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {kitData.components.map((c, idx) => (
                                                                <tr key={idx} className="hover:bg-muted/30">
                                                                    <td className="p-3">
                                                                        <div className="font-mono font-medium">{c._ref}</div>
                                                                        <div className="text-xs text-muted-foreground">{c._name}</div>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <Input 
                                                                            type="number" 
                                                                            step="1" 
                                                                            min="1" 
                                                                            className="h-8 w-20 text-right"
                                                                            value={c.quantity}
                                                                            onChange={e => updateQuantity(idx, e.target.value)}
                                                                            required
                                                                        />
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeComponent(idx)}>
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {kitData.components.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={3} className="p-6 text-center text-muted-foreground">
                                                                        No has agregado ningún componente al kit.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-xs text-muted-foreground">
                                                        Al guardar, se generará una nueva <strong className="text-foreground">Versión {product.kit_versions.length + 1}</strong> de la composición, manteniendo intacto el historial de ventas previas.
                                                    </p>
                                                    <Button type="submit" disabled={kitProcessing || kitData.components.length === 0}>
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Guardar Composición
                                                    </Button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </>
    );
}

ProductSettings.layout = {
    breadcrumbs: [
        { title: 'Catálogo', href: '#' },
        { title: 'Repuestos', href: '/products' },
        { title: 'Configuración', href: '#' },
    ],
};
