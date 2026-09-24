import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import InputError from '@/components/input-error';
import { toast } from 'sonner';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { 
    ArrowLeft, 
    Plus, 
    Trash2, 
    DollarSign, 
    Archive, 
    Layers, 
    Save, 
    Search, 
    Settings, 
    Zap, 
    Pencil, 
    Boxes, 
    TrendingUp, 
    Building2, 
    Lock, 
    AlertTriangle, 
    CheckCircle2, 
    ShieldAlert, 
    History, 
    Clock, 
    ArrowUpRight, 
    ArrowDownRight,
    Coins,
    BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type Branch = { id: number; name: string };
type Component = { 
    id: number; 
    product_id: number; 
    quantity: number; 
    product: { primary_reference: string; name: string };
};

type Lot = {
    id: number;
    uuid: string;
    branch_id: number;
    lot_number: string;
    original_quantity: string | number;
    current_quantity: string | number;
    unit_cost: string | number;
    status: 'ACTIVE' | 'DEPLETED' | 'QUARANTINE';
    created_at: string;
    location?: { name: string };
};

type Inventory = {
    id: number;
    branch_id: number;
    physical_quantity: string | number;
    available_quantity: string | number;
    reserved_quantity?: string | number;
    average_cost: string | number;
    branch?: Branch;
};

type Product = {
    id: number;
    internal_code: string | null;
    primary_reference: string;
    name: string;
    product_type: 'SIMPLE' | 'KIT_UNICO' | 'KIT_COMPONENTES';
    status: 'ACTIVE' | 'INACTIVE';
    prices: any[];
    min_prices?: any[];
    minPrices?: any[];
    min_stocks?: any[];
    minStocks?: any[];
    lots?: Lot[];
    inventories?: Inventory[];
    unit?: { id: number; code: string; name: string };
    brand?: { id: number; name: string };
    category?: { id: number; name: string };
    kit_versions?: { id: number; version_name: string; status: string; components: Component[] }[];
    kitVersions?: { id: number; version_name: string; status: string; components: Component[] }[];
};

type Props = {
    product: Product;
    branches: Branch[];
    userBranchId?: number | null;
    flash?: { success?: string; error?: string };
    isSuperAdmin?: boolean;
};

export default function ProductSettings({
    product,
    branches = [],
    userBranchId = null,
    flash,
    isSuperAdmin = false
}: Props) {
    useFlashToast();

    const prices = product.prices || [];
    const minPrices = product.min_prices || product.minPrices || [];
    const minStocks = product.min_stocks || product.minStocks || [];
    const inventories = product.inventories || [];
    const lots = product.lots || [];
    const kitVersions = product.kit_versions || product.kitVersions || [];
    const activeKitVersion = kitVersions.find(v => v.status === 'ACTIVE') || { components: [] };

    const currentBranchObj = branches.find(b => b.id === userBranchId) || branches[0];
    const currentBranchString = currentBranchObj ? currentBranchObj.id.toString() : '';

    // KPI Metrics
    const totalPhysical = inventories.reduce((acc, inv) => acc + (parseFloat(String(inv.physical_quantity)) || 0), 0);
    const totalAvailable = inventories.reduce((acc, inv) => acc + (parseFloat(String(inv.available_quantity)) || 0), 0);
    const totalReserved = Math.max(0, totalPhysical - totalAvailable);

    const totalValue = inventories.reduce((acc, inv) => {
        const qty = parseFloat(String(inv.physical_quantity)) || 0;
        const cost = parseFloat(String(inv.average_cost)) || 0;
        return acc + (qty * cost);
    }, 0);
    const averageCost = totalPhysical > 0 ? (totalValue / totalPhysical) : (lots.length > 0 ? parseFloat(String(lots[0].unit_cost)) || 0 : 0);

    const globalPrice = prices.find((p: any) => !p.branch_id);
    const suggestedPrice = globalPrice ? parseFloat(globalPrice.amount) : (prices[0] ? parseFloat(prices[0].amount) : 0);
    const grossMargin = suggestedPrice > 0 && averageCost > 0
        ? (((suggestedPrice - averageCost) / suggestedPrice) * 100).toFixed(1)
        : null;

    // 1. Dedicated Public Price Form State (Público Sugerido)
    const { 
        data: publicPriceData, 
        setData: setPublicPriceData, 
        post: postPublicPrice, 
        reset: resetPublicPrice, 
        errors: publicPriceErrors, 
        processing: publicPriceProcessing 
    } = useForm({
        branch_id: (!isSuperAdmin && currentBranchString) ? currentBranchString : 'GLOBAL',
        amount: ''
    });

    const submitPublicPrice = (e: React.FormEvent) => {
        e.preventDefault();
        postPublicPrice(`/products/${product.id}/prices`, {
            preserveScroll: true,
            onSuccess: () => {
                resetPublicPrice('amount');
                toast.success('Precio público sugerido guardado exitosamente');
            },
            onError: (err) => {
                const msg = Object.values(err)[0] || 'No se pudo guardar el precio público. Revisa los datos.';
                toast.error(String(msg));
            }
        });
    };

    // 2. Dedicated Minimum Price Form State (Mínimo Límite)
    const { 
        data: minPriceData, 
        setData: setMinPriceData, 
        post: postMinPrice, 
        reset: resetMinPrice, 
        errors: minPriceErrors, 
        processing: minPriceProcessing 
    } = useForm({
        branch_id: (!isSuperAdmin && currentBranchString) ? currentBranchString : 'GLOBAL',
        amount: ''
    });

    const submitMinPrice = (e: React.FormEvent) => {
        e.preventDefault();
        postMinPrice(`/products/${product.id}/min-prices`, {
            preserveScroll: true,
            onSuccess: () => {
                resetMinPrice('amount');
                toast.success('Precio mínimo de seguridad guardado exitosamente');
            },
            onError: (err) => {
                const msg = Object.values(err)[0] || 'No se pudo guardar el precio mínimo. Revisa los datos.';
                toast.error(String(msg));
            }
        });
    };

    // Min Stock (Alert Threshold) Form State
    const { 
        data: stockData, 
        setData: setStockData, 
        post: postStock, 
        reset: resetStock, 
        errors: stockErrors, 
        processing: stockProcessing 
    } = useForm({
        branch_id: (!isSuperAdmin && currentBranchString) ? currentBranchString : (branches[0]?.id?.toString() || ''),
        quantity: ''
    });

    const submitStock = (e: React.FormEvent) => {
        e.preventDefault();
        postStock(`/products/${product.id}/min-stocks`, {
            preserveScroll: true,
            onSuccess: () => {
                resetStock('quantity');
                toast.success('Umbral de alerta de stock mínimo guardado exitosamente');
            },
            onError: (err) => {
                const msg = Object.values(err)[0] || 'No se pudo guardar el umbral de alerta. Revisa los datos.';
                toast.error(String(msg));
            }
        });
    };

    // Quick Stock Adjustment Dialog State
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    
    const {
        data: adjustData,
        setData: setAdjustData,
        post: postAdjust,
        reset: resetAdjust,
        errors: adjustErrors,
        processing: adjustProcessing
    } = useForm({
        branch_id: !isSuperAdmin ? currentBranchString : (branches[0]?.id?.toString() || ''),
        type: 'POSITIVE' as 'POSITIVE' | 'NEGATIVE',
        quantity: '',
        unit_cost: averageCost > 0 ? averageCost.toFixed(2) : '',
        reason: 'CONTEO_FISICO',
    });

    const openAdjustModal = (targetBranchId?: string) => {
        if (isSuperAdmin && targetBranchId) {
            setAdjustData('branch_id', targetBranchId);
        } else if (!isSuperAdmin) {
            setAdjustData('branch_id', currentBranchString);
        } else if (targetBranchId) {
            setAdjustData('branch_id', targetBranchId);
        }
        setIsAdjustModalOpen(true);
    };

    const submitAdjust = (e: React.FormEvent) => {
        e.preventDefault();
        postAdjust(`/products/${product.id}/quick-adjust-stock`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsAdjustModalOpen(false);
                resetAdjust('quantity');
                toast.success('Ajuste de stock aplicado correctamente');
            },
            onError: (err) => {
                const msg = Object.values(err)[0] || 'No se pudo aplicar el ajuste de stock.';
                toast.error(String(msg));
            }
        });
    };

    // Kit Components Form
    const { data: kitData, setData: setKitData, post: postKit, errors: kitErrors, processing: kitProcessing } = useForm({
        components: activeKitVersion.components.map(c => ({
            product_id: c.product_id,
            quantity: parseFloat(String(c.quantity)),
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
        if (kitData.components.find(c => c.product_id === prod.id)) return;
        if (prod.id === product.id) return;

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

    const submitKit = (e: React.FormEvent) => {
        e.preventDefault();
        postKit(`/products/${product.id}/kit-components`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Composición del kit actualizada correctamente');
            },
            onError: (err) => {
                const msg = Object.values(err)[0] || 'No se pudo actualizar la composición del kit.';
                toast.error(String(msg));
            }
        });
    };

    const removePriceItem = (id: number, type: 'price' | 'min-price' | 'min-stock') => {
        const labels: Record<string, string> = {
            'price': 'precio público',
            'min-price': 'precio mínimo',
            'min-stock': 'umbral de alerta de stock'
        };
        const label = labels[type] || 'registro';
        if (confirm(`¿Estás seguro de eliminar este ${label}?`)) {
            const url = type === 'price' 
                ? `/products/${product.id}/prices/${id}` 
                : type === 'min-price' 
                    ? `/products/${product.id}/min-prices/${id}` 
                    : `/products/${product.id}/min-stocks/${id}`;

            router.delete(url, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Se eliminó el ${label} correctamente`);
                },
                onError: (err) => {
                    const msg = Object.values(err)[0] || `No se pudo eliminar el ${label}`;
                    toast.error(String(msg));
                }
            });
        }
    };

    // Calculate simulated stock for adjustment modal
    const selectedBranchInventory = inventories.find(inv => inv.branch_id.toString() === adjustData.branch_id);
    const currentBranchStock = selectedBranchInventory ? parseFloat(String(selectedBranchInventory.available_quantity)) : 0;
    const adjustQty = parseFloat(adjustData.quantity) || 0;
    const projectedStock = adjustData.type === 'POSITIVE' 
        ? currentBranchStock + adjustQty 
        : Math.max(0, currentBranchStock - adjustQty);

    return (
        <>
            <Head title={`Ficha y Control: ${product.primary_reference}`} />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
                
                {/* Header with Navigation and Quick Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" asChild className="h-9 w-9">
                            <Link href="/products">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {product.primary_reference}
                                </h1>
                                <Badge variant={product.status === 'ACTIVE' ? 'outline' : 'secondary'} className={product.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''}>
                                    {product.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                </Badge>
                                <Badge variant="outline" className="font-medium text-xs">
                                    {product.product_type === 'SIMPLE' && 'Producto Simple'}
                                    {product.product_type === 'KIT_UNICO' && 'Kit Único'}
                                    {product.product_type === 'KIT_COMPONENTES' && 'Kit por Componentes'}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mt-0.5 font-medium uppercase">
                                {product.name}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button 
                            onClick={() => openAdjustModal()}
                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex-1 md:flex-initial"
                        >
                            <Zap className="h-4 w-4 mr-1.5" />
                            Ajustar Stock
                        </Button>
                        <Button variant="outline" asChild className="flex-1 md:flex-initial">
                            <Link href={`/products/${product.id}/edit`}>
                                <Pencil className="h-4 w-4 mr-1.5" />
                                Editar Datos
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Flash Messages Banner */}
                {flash?.success && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2.5 shadow-xs">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-medium">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-red-700 dark:text-red-300 text-sm flex items-center gap-2.5 shadow-xs">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                        <span className="font-medium">{flash.error}</span>
                    </div>
                )}

                {/* KPI Metrics Dashboard Bar */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Card className="shadow-xs border-l-4 border-l-blue-500">
                        <CardContent className="p-3.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Físico Total</span>
                                <Boxes className="h-4 w-4 text-blue-500" />
                            </div>
                            <div className="text-xl font-bold font-mono mt-1 text-foreground">
                                {totalPhysical.toFixed(2)}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">En todos los almacenes</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs border-l-4 border-l-emerald-500">
                        <CardContent className="p-3.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Disponible</span>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div className="text-xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
                                {totalAvailable.toFixed(2)}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {totalReserved > 0 ? `(${totalReserved.toFixed(2)} reservado)` : 'Libre para venta'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs border-l-4 border-l-violet-500">
                        <CardContent className="p-3.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Costo Promedio</span>
                                <Coins className="h-4 w-4 text-violet-500" />
                            </div>
                            <div className="text-xl font-bold font-mono mt-1 text-foreground">
                                S/ {averageCost.toFixed(2)}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Ponderado Kardex</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs border-l-4 border-l-amber-500">
                        <CardContent className="p-3.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Precio Público</span>
                                <DollarSign className="h-4 w-4 text-amber-500" />
                            </div>
                            <div className="text-xl font-bold font-mono mt-1 text-foreground">
                                {suggestedPrice > 0 ? `S/ ${suggestedPrice.toFixed(2)}` : 'Sin precio'}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Tarifa vigente</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs border-l-4 border-l-primary col-span-2 md:col-span-1">
                        <CardContent className="p-3.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Margen Bruto</span>
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                            <div className={cn(
                                "text-xl font-bold font-mono mt-1",
                                grossMargin !== null && parseFloat(grossMargin) >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                            )}>
                                {grossMargin !== null ? `${grossMargin}%` : '—'}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Sobre costo promedio</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Functional Tabs */}
                <Tabs defaultValue="stocks" className="w-full">
                    <TabsList className="grid w-full max-w-2xl grid-cols-3 lg:grid-cols-4">
                        <TabsTrigger value="stocks" className="gap-2">
                            <Archive className="h-4 w-4" />
                            <span>Existencias y Lotes</span>
                        </TabsTrigger>
                        <TabsTrigger value="prices" className="gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Precios y Tarifas</span>
                        </TabsTrigger>
                        <TabsTrigger value="alerts" className="gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Alertas de Reposición</span>
                        </TabsTrigger>
                        {product.product_type === 'KIT_COMPONENTES' && (
                            <TabsTrigger value="kit" className="gap-2">
                                <Layers className="h-4 w-4" />
                                <span>Composición Kit</span>
                            </TabsTrigger>
                        )}
                    </TabsList>
                    
                    {/* TAB 1: EXISTENCIAS Y LOTES */}
                    <TabsContent value="stocks" className="mt-6 space-y-6">
                        
                        {/* Section A: Existencias por Sucursal */}
                        <Card>
                            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-primary" />
                                        Existencias Actuales por Sucursal
                                    </CardTitle>
                                    <CardDescription>
                                        Inventario físico consolidado y balance de piezas disponibles en cada sede operativa.
                                    </CardDescription>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={() => openAdjustModal()}
                                    className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                                >
                                    <Zap className="h-3.5 w-3.5" />
                                    Nuevo Ajuste de Stock
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 border-b">
                                            <tr>
                                                <th className="p-3 font-semibold">Sucursal</th>
                                                <th className="p-3 font-semibold text-right">Físico</th>
                                                <th className="p-3 font-semibold text-right">Reservado</th>
                                                <th className="p-3 font-semibold text-right">Disponible</th>
                                                <th className="p-3 font-semibold text-center">Estado Operativo</th>
                                                <th className="p-3 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {branches.map((b) => {
                                                const inv = inventories.find((i: any) => i.branch_id === b.id);
                                                const branchMinStock = minStocks.find((ms: any) => ms.branch_id === b.id);
                                                const minQty = branchMinStock ? parseFloat(branchMinStock.minimum_quantity) : 0;
                                                const availQty = inv ? (parseFloat(String(inv.available_quantity)) || 0) : 0;
                                                const physicalQty = inv ? (parseFloat(String(inv.physical_quantity)) || 0) : 0;
                                                const reservedQty = Math.max(0, physicalQty - availQty);

                                                const isCurrentBranch = userBranchId ? b.id === userBranchId : false;
                                                const canAdjust = isSuperAdmin || isCurrentBranch;

                                                let statusBadge = (
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                                                        🟢 Óptimo
                                                    </Badge>
                                                );
                                                if (availQty <= 0) {
                                                    statusBadge = (
                                                        <Badge variant="destructive" className="text-xs">
                                                            🔴 Sin Stock
                                                        </Badge>
                                                    );
                                                } else if (minQty > 0 && availQty <= minQty) {
                                                    statusBadge = (
                                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                                                            🟡 Alerta Mínima (≤ {minQty})
                                                        </Badge>
                                                    );
                                                }

                                                return (
                                                    <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                                                        <td className="p-3 font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                                <span>{b.name}</span>
                                                                {isCurrentBranch && (
                                                                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 py-0">
                                                                        Tu sede actual
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-medium">
                                                            {physicalQty.toFixed(2)}
                                                        </td>
                                                        <td className="p-3 text-right font-mono text-orange-600 dark:text-orange-400">
                                                            {reservedQty.toFixed(2)}
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                            {availQty.toFixed(2)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {statusBadge}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            {canAdjust ? (
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    className="h-8 gap-1 text-xs"
                                                                    onClick={() => openAdjustModal(b.id.toString())}
                                                                >
                                                                    <Zap className="h-3 w-3 text-amber-500" />
                                                                    Ajustar
                                                                </Button>
                                                            ) : (
                                                                <span 
                                                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded cursor-not-allowed select-none"
                                                                    title="Solo el personal de esta sede o Super Admin pueden modificar su stock"
                                                                >
                                                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                                                    Solo lectura
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {branches.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                        <div className="flex flex-col items-center justify-center gap-2">
                                                            <Boxes className="h-8 w-8 text-muted-foreground/40" />
                                                            <p className="font-medium">No existen sucursales registradas en el sistema.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section B: Lotes Trazables FIFO */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <History className="h-5 w-5 text-primary" />
                                            Lotes Trazables FIFO
                                        </CardTitle>
                                        <CardDescription>
                                            Control cronológico de lotes activos. El sistema descuenta automáticamente primero los más antiguos.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="text-xs font-mono">
                                        Total Lotes: {lots.length}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 border-b">
                                            <tr>
                                                <th className="p-3 font-semibold">N° de Lote</th>
                                                <th className="p-3 font-semibold">Sucursal</th>
                                                <th className="p-3 font-semibold text-right">Cant. Original</th>
                                                <th className="p-3 font-semibold text-right">Cant. Restante</th>
                                                <th className="p-3 font-semibold text-right">Costo Unitario</th>
                                                <th className="p-3 font-semibold text-center">Estado</th>
                                                <th className="p-3 font-semibold text-right">Ingreso</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {lots.map((lot: any) => {
                                                const currentQty = parseFloat(String(lot.current_quantity)) || 0;
                                                const origQty = parseFloat(String(lot.original_quantity)) || 0;
                                                const lotBranch = branches.find(b => b.id === lot.branch_id);

                                                return (
                                                    <tr key={lot.id} className="hover:bg-muted/40 transition-colors">
                                                        <td className="p-3 font-mono font-medium text-xs">
                                                            {lot.lot_number}
                                                        </td>
                                                        <td className="p-3 text-xs">
                                                            {lotBranch?.name || `Sede #${lot.branch_id}`}
                                                        </td>
                                                        <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                                                            {origQty.toFixed(2)}
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-xs">
                                                            <span className={cn(
                                                                currentQty > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                                            )}>
                                                                {currentQty.toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-mono text-xs">
                                                            S/ {parseFloat(String(lot.unit_cost)).toFixed(2)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Badge 
                                                                variant={lot.status === 'ACTIVE' ? 'outline' : 'secondary'}
                                                                className={lot.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]' : 'text-[10px]'}
                                                            >
                                                                {lot.status === 'ACTIVE' ? 'Activo' : 'Agotado'}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-right text-xs text-muted-foreground">
                                                            {lot.created_at ? new Date(lot.created_at).toLocaleDateString() : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {lots.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                                        Sin lotes registrados para este repuesto.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                    </TabsContent>

                    {/* TAB 2: PRECIOS Y TARIFAS */}
                    <TabsContent value="prices" className="mt-6 space-y-6">

                        {/* SECCIÓN 1: PRECIO PÚBLICO SUGERIDO (PVP) */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3 border-b bg-muted/15">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-foreground">
                                            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                            Precio Público Sugerido (PVP)
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Tarifa oficial de lista para cotizaciones y órdenes de venta a clientes.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="w-fit text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                        Tarifa de Venta Sugerida
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                    {/* Formulario Precio Público */}
                                    <div className="lg:col-span-4 p-4 rounded-xl border bg-card space-y-4">
                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                            <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            Registrar Precio Público
                                        </h4>
                                        <form onSubmit={submitPublicPrice} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Ámbito / Sucursal</Label>
                                                {isSuperAdmin ? (
                                                    <Select 
                                                        value={publicPriceData.branch_id} 
                                                        onValueChange={v => setPublicPriceData('branch_id', v)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Global (Todas las sedes)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="GLOBAL">Global (Todas las sedes)</SelectItem>
                                                            {branches.map(b => (
                                                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <div className="p-2.5 rounded-lg border bg-muted/40 text-xs font-medium flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span>{currentBranchObj?.name || 'Sucursal Principal'}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px]">Tu Sede</Badge>
                                                    </div>
                                                )}
                                                <InputError message={publicPriceErrors.branch_id} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="public_price_amount">Precio Sugerido (PEN) <span className="text-destructive">*</span></Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">S/</span>
                                                    <Input 
                                                        id="public_price_amount"
                                                        type="number" 
                                                        step="0.01" 
                                                        min="1" 
                                                        placeholder="0.00" 
                                                        className="pl-8 font-mono text-base"
                                                        value={publicPriceData.amount} 
                                                        onChange={e => setPublicPriceData('amount', e.target.value)} 
                                                        required 
                                                    />
                                                </div>
                                                <InputError message={publicPriceErrors.amount} />
                                            </div>

                                            <Button 
                                                type="submit" 
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                                                disabled={publicPriceProcessing}
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                Guardar Precio Público
                                            </Button>
                                        </form>
                                    </div>

                                    {/* Tabla Precios Públicos */}
                                    <div className="lg:col-span-8 rounded-lg border overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    <th className="p-3 font-semibold">Ámbito / Sede</th>
                                                    <th className="p-3 font-semibold text-right">Precio Sugerido</th>
                                                    <th className="p-3 font-semibold text-right">Margen Estimado</th>
                                                    <th className="p-3 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {prices.map((p: any) => {
                                                    const amount = parseFloat(p.amount);
                                                    const margin = averageCost > 0 
                                                        ? (((amount - averageCost) / amount) * 100).toFixed(1)
                                                        : null;
                                                    const canDelete = isSuperAdmin || (p.branch_id && p.branch_id === userBranchId);

                                                    return (
                                                        <tr key={`pub-${p.id}`} className="hover:bg-muted/40 transition-colors">
                                                            <td className="p-3 font-medium">
                                                                {p.branch ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        <span>{p.branch.name}</span>
                                                                    </div>
                                                                ) : (
                                                                    <Badge variant="secondary" className="font-semibold text-xs">
                                                                        Global (Predeterminado)
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-right font-mono font-bold text-foreground">
                                                                S/ {amount.toFixed(2)}
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-xs">
                                                                {margin !== null ? (
                                                                    <span className={cn(
                                                                        "font-semibold",
                                                                        parseFloat(margin) >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"
                                                                    )}>
                                                                        +{margin}%
                                                                    </span>
                                                                ) : '—'}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                {canDelete ? (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10" 
                                                                        onClick={() => removePriceItem(p.id, 'price')}
                                                                        title="Eliminar este precio público"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic px-2">🔒</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {prices.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">
                                                            Sin precios públicos registrados. Ingresa una tarifa usando el formulario.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* SECCIÓN 2: PRECIO MÍNIMO DE SEGURIDAD (LÍMITE NO NEGOCIABLE) */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3 border-b bg-muted/15">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base flex items-center gap-2 text-foreground">
                                            <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
                                            Precio Mínimo de Seguridad (Límite Infranqueable)
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Precio piso no negociable. Los vendedores no podrán vender ni aplicar descuentos por debajo de este valor.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="w-fit text-xs bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                                        Piso Mínimo de Seguridad
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                    {/* Formulario Precio Mínimo */}
                                    <div className="lg:col-span-4 p-4 rounded-xl border bg-card space-y-4">
                                        <h4 className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                                            <Plus className="h-4 w-4" />
                                            Registrar Precio Mínimo
                                        </h4>
                                        <form onSubmit={submitMinPrice} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Ámbito / Sucursal</Label>
                                                {isSuperAdmin ? (
                                                    <Select 
                                                        value={minPriceData.branch_id} 
                                                        onValueChange={v => setMinPriceData('branch_id', v)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Global (Todas las sedes)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="GLOBAL">Global (Todas las sedes)</SelectItem>
                                                            {branches.map(b => (
                                                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <div className="p-2.5 rounded-lg border bg-muted/40 text-xs font-medium flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span>{currentBranchObj?.name || 'Sucursal Principal'}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px]">Tu Sede</Badge>
                                                    </div>
                                                )}
                                                <InputError message={minPriceErrors.branch_id} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="min_price_amount">Precio Mínimo (PEN) <span className="text-destructive">*</span></Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">S/</span>
                                                    <Input 
                                                        id="min_price_amount"
                                                        type="number" 
                                                        step="0.01" 
                                                        min="1" 
                                                        placeholder="0.00" 
                                                        className="pl-8 font-mono text-base"
                                                        value={minPriceData.amount} 
                                                        onChange={e => setMinPriceData('amount', e.target.value)} 
                                                        required 
                                                    />
                                                </div>
                                                <InputError message={minPriceErrors.amount} />
                                            </div>

                                            <Button 
                                                type="submit" 
                                                className="w-full bg-red-600 hover:bg-red-700 text-white" 
                                                disabled={minPriceProcessing}
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                Guardar Precio Mínimo
                                            </Button>
                                        </form>
                                    </div>

                                    {/* Tabla Precios Mínimos */}
                                    <div className="lg:col-span-8 rounded-lg border overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    <th className="p-3 font-semibold">Ámbito / Sede</th>
                                                    <th className="p-3 font-semibold text-right">Precio Mínimo</th>
                                                    <th className="p-3 font-semibold text-right">Margen Mínimo</th>
                                                    <th className="p-3 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {minPrices.map((mp: any) => {
                                                    const minAmount = parseFloat(mp.amount);
                                                    const minMargin = averageCost > 0 
                                                        ? (((minAmount - averageCost) / minAmount) * 100).toFixed(1)
                                                        : null;
                                                    const canDelete = isSuperAdmin || (mp.branch_id && mp.branch_id === userBranchId);

                                                    return (
                                                        <tr key={`min-${mp.id}`} className="hover:bg-muted/40 transition-colors">
                                                            <td className="p-3 font-medium">
                                                                {mp.branch ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        <span>{mp.branch.name}</span>
                                                                    </div>
                                                                ) : (
                                                                    <Badge variant="secondary" className="font-semibold text-xs">
                                                                        Global (Predeterminado)
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                                                                S/ {minAmount.toFixed(2)}
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-xs">
                                                                {minMargin !== null ? (
                                                                    <span className={cn(
                                                                        "font-semibold",
                                                                        parseFloat(minMargin) >= 10 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                                                                    )}>
                                                                        +{minMargin}%
                                                                    </span>
                                                                ) : '—'}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                {canDelete ? (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10" 
                                                                        onClick={() => removePriceItem(mp.id, 'min-price')}
                                                                        title="Eliminar este precio mínimo"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic px-2">🔒</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {minPrices.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">
                                                            Sin precios mínimos configurados. Define un límite de seguridad usando el formulario.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </TabsContent>

                    {/* TAB 3: ALERTAS DE REPOSICIÓN (STOCK MÍNIMO) */}
                    <TabsContent value="alerts" className="mt-6 space-y-6">
                        
                        {/* Explanatory Banner */}
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-foreground flex items-start gap-3">
                            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                                    ¿Cómo funcionan las Alertas de Stock Mínimo?
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    El stock mínimo <strong>no añade ni descuenta unidades de inventario</strong>. Es un umbral de seguridad preventiva: cuando la cantidad disponible en una sucursal cae a este número o menos, el sistema emitirá avisos automáticos en el módulo de ventas y compras para reponer stock a tiempo.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Formulario Configurar Alerta */}
                            <Card className="lg:col-span-1">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        Fijar Umbral de Alerta
                                    </CardTitle>
                                    <CardDescription>
                                        Define el punto de reorden para una sede específica.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={submitStock} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Sucursal Operativa <span className="text-destructive">*</span></Label>
                                            {isSuperAdmin ? (
                                                <Select 
                                                    value={stockData.branch_id} 
                                                    onValueChange={v => setStockData('branch_id', v)} 
                                                    required
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione sucursal..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {branches.map(b => (
                                                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="p-2.5 rounded-lg border bg-muted/40 text-xs font-medium flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span>{currentBranchObj?.name || 'Sucursal Principal'}</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                                        Tu Sede Asignada
                                                    </Badge>
                                                </div>
                                            )}
                                            <InputError message={stockErrors.branch_id} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="stock_quantity">Cantidad Mínima de Alerta <span className="text-destructive">*</span></Label>
                                            <Input 
                                                id="stock_quantity"
                                                type="number" 
                                                step="1" 
                                                min="0" 
                                                placeholder="Ej: 5" 
                                                className="font-mono text-base"
                                                value={stockData.quantity} 
                                                onChange={e => setStockData('quantity', e.target.value)} 
                                                required 
                                            />
                                            <p className="text-[11px] text-muted-foreground">Si el stock cae por debajo de este valor, se activará la alerta.</p>
                                            <InputError message={stockErrors.quantity} />
                                        </div>

                                        <Button type="submit" className="w-full" disabled={stockProcessing}>
                                            <Save className="h-4 w-4 mr-2" />
                                            Guardar Umbral de Alerta
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Tabla de Umbrales Configurados */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-primary" />
                                        Estado de Existencias vs. Umbral Mínimo
                                    </CardTitle>
                                    <CardDescription>
                                        Monitoreo en vivo de suficiencia de inventario contra el nivel mínimo configurado.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    <th className="p-3 font-semibold">Sucursal</th>
                                                    <th className="p-3 font-semibold text-right">Disponible Actual</th>
                                                    <th className="p-3 font-semibold text-right">Umbral Mínimo</th>
                                                    <th className="p-3 font-semibold text-center">Diagnóstico</th>
                                                    <th className="p-3 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {branches.map(b => {
                                                    const minStockObj = minStocks.find((ms: any) => ms.branch_id === b.id);
                                                    const invObj = inventories.find((inv: any) => inv.branch_id === b.id);
                                                    const availQty = invObj ? parseFloat(String(invObj.available_quantity)) : 0;
                                                    const minQty = minStockObj ? parseFloat(String(minStockObj.minimum_quantity)) : null;
                                                    const canDelete = isSuperAdmin || (b.id === userBranchId);

                                                    let badge = (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Sin umbral fijado
                                                        </Badge>
                                                    );
                                                    if (minQty !== null) {
                                                        if (availQty <= 0) {
                                                            badge = <Badge variant="destructive" className="text-xs">🚨 Agotado / Urgente</Badge>;
                                                        } else if (availQty <= minQty) {
                                                            badge = <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">⚠️ Comprar / Reponer</Badge>;
                                                        } else {
                                                            badge = <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">✅ Abastecido</Badge>;
                                                        }
                                                    }

                                                    return (
                                                        <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                                                            <td className="p-3 font-medium">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    <span>{b.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-3 text-right font-mono font-bold">
                                                                {availQty.toFixed(2)}
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-muted-foreground">
                                                                {minQty !== null ? minQty.toFixed(2) : '—'}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {badge}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                {minStockObj && canDelete ? (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10" 
                                                                        onClick={() => removePriceItem(minStockObj.id, 'min-stock')}
                                                                        title="Eliminar umbral de alerta"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                ) : minStockObj ? (
                                                                    <span className="text-xs text-muted-foreground italic px-2">🔒</span>
                                                                ) : null}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>

                    </TabsContent>

                    {/* TAB 4: COMPOSICIÓN KIT (Solo si KIT_COMPONENTES) */}
                    {product.product_type === 'KIT_COMPONENTES' && (
                        <TabsContent value="kit" className="mt-6 max-w-4xl">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Layers className="h-5 w-5 text-primary" />
                                        Composición del Kit (Lista de Materiales BOM)
                                    </CardTitle>
                                    <CardDescription>
                                        Define las partes que componen este Kit. Al confirmarse una venta de este producto, el sistema descontará automáticamente el stock de cada uno de sus componentes.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-3 gap-8">
                                        {/* Buscador */}
                                        <div className="md:col-span-1 space-y-4">
                                            <div className="space-y-2">
                                                <Label>Buscar Repuesto Componente</Label>
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
                                                                <div className="font-medium font-mono text-xs">{res.primary_reference}</div>
                                                                <div className="text-xs text-muted-foreground truncate w-40">{res.name}</div>
                                                            </div>
                                                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => addComponent(res)}>
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Componentes Lista */}
                                        <div className="md:col-span-2">
                                            <form onSubmit={submitKit}>
                                                <div className="rounded-md border overflow-hidden mb-4">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-orange-500/10 text-foreground border-b">
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
                                                                            className="h-8 w-20 text-right font-mono" 
                                                                            value={c.quantity} 
                                                                            onChange={e => updateQuantity(idx, e.target.value)} 
                                                                            required 
                                                                        />
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeComponent(idx)}>
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {kitData.components.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={3} className="p-6 text-center text-muted-foreground">
                                                                        No has agregado ningún componente al kit todavía.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        Al guardar, se generará una nueva <strong className="text-foreground">Versión {kitVersions.length + 1}</strong> de la composición.
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

                {/* MODAL DIALOG: AJUSTE RÁPIDO DE STOCK */}
                <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <Zap className="h-5 w-5 text-amber-500" />
                                Ajuste Rápido de Stock
                            </DialogTitle>
                            <DialogDescription>
                                Registra un ingreso o deducción directa de existencias en el inventario de una sucursal.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={submitAdjust} className="space-y-4 py-2">
                            {/* Tipo de Ajuste */}
                            <div className="space-y-2">
                                <Label>Tipo de Movimiento</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant={adjustData.type === 'POSITIVE' ? 'default' : 'outline'}
                                        className={cn(
                                            "w-full gap-2",
                                            adjustData.type === 'POSITIVE' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                                        )}
                                        onClick={() => setAdjustData('type', 'POSITIVE')}
                                    >
                                        <ArrowUpRight className="h-4 w-4" />
                                        Entrada / Positivo (+)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={adjustData.type === 'NEGATIVE' ? 'destructive' : 'outline'}
                                        className="w-full gap-2"
                                        onClick={() => setAdjustData('type', 'NEGATIVE')}
                                    >
                                        <ArrowDownRight className="h-4 w-4" />
                                        Salida / Descuento (-)
                                    </Button>
                                </div>
                            </div>

                            {/* Sucursal */}
                            <div className="space-y-2">
                                <Label>Sucursal de Aplicación <span className="text-destructive">*</span></Label>
                                {isSuperAdmin ? (
                                    <Select 
                                        value={adjustData.branch_id} 
                                        onValueChange={v => setAdjustData('branch_id', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione sucursal..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map(b => (
                                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="p-2.5 rounded-lg border bg-muted/40 text-xs font-semibold flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-primary" />
                                            <span>{currentBranchObj?.name || 'Sucursal Asignada'}</span>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] gap-1 bg-background">
                                            <Lock className="h-3 w-3" /> Tu Sede Asignada
                                        </Badge>
                                    </div>
                                )}
                                {!isSuperAdmin && (
                                    <p className="text-[11px] text-muted-foreground">
                                        🔒 Como usuario de sede, solo puedes aplicar ajustes al stock de tu sucursal.
                                    </p>
                                )}
                                <InputError message={adjustErrors.branch_id} />
                            </div>

                            {/* Cantidad y Costo */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="adjust_qty">Cantidad <span className="text-destructive">*</span></Label>
                                    <Input 
                                        id="adjust_qty"
                                        type="number" 
                                        step="any" 
                                        min="0.01" 
                                        placeholder="0.00" 
                                        className="font-mono text-base"
                                        value={adjustData.quantity} 
                                        onChange={e => setAdjustData('quantity', e.target.value)} 
                                        required 
                                    />
                                    <InputError message={adjustErrors.quantity} />
                                </div>

                                {adjustData.type === 'POSITIVE' ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="adjust_cost">Costo Unit. (PEN)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">S/</span>
                                            <Input 
                                                id="adjust_cost"
                                                type="number" 
                                                step="0.01" 
                                                min="0" 
                                                placeholder="0.00" 
                                                className="pl-8 font-mono text-base"
                                                value={adjustData.unit_cost} 
                                                onChange={e => setAdjustData('unit_cost', e.target.value)} 
                                            />
                                        </div>
                                        <InputError message={adjustErrors.unit_cost} />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>Costo de Salida</Label>
                                        <div className="p-2.5 rounded-lg border bg-muted/40 text-xs font-mono text-muted-foreground">
                                            Automático (FIFO)
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Motivo */}
                            <div className="space-y-2">
                                <Label>Motivo del Ajuste <span className="text-destructive">*</span></Label>
                                <Select 
                                    value={adjustData.reason} 
                                    onValueChange={v => setAdjustData('reason', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione motivo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CONTEO_FISICO">Conteo físico / Cuadre de inventario</SelectItem>
                                        <SelectItem value="SOBRANTE_FISICO">Sobrante físico hallado en almacén</SelectItem>
                                        <SelectItem value="MERMA_DETERIORO">Merma, daño o producto deteriorado</SelectItem>
                                        <SelectItem value="INVENTARIO_INICIAL">Carga de inventario inicial</SelectItem>
                                        <SelectItem value="AJUSTE_ADMINISTRATIVO">Corrección administrativa</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={adjustErrors.reason} />
                            </div>

                            {/* Previsualización del Impacto */}
                            {adjustQty > 0 && (
                                <div className="rounded-lg bg-muted/50 p-3 text-xs border space-y-1">
                                    <div className="flex justify-between font-medium">
                                        <span className="text-muted-foreground">Stock actual en sede:</span>
                                        <span className="font-mono">{currentBranchStock.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold">
                                        <span>Nuevo stock proyectado:</span>
                                        <span className={cn(
                                            "font-mono font-bold",
                                            adjustData.type === 'POSITIVE' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"
                                        )}>
                                            {projectedStock.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="pt-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsAdjustModalOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={adjustProcessing}
                                    className={cn(
                                        adjustData.type === 'POSITIVE' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"
                                    )}
                                >
                                    {adjustProcessing ? 'Aplicando...' : 'Confirmar Ajuste'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </>
    );
}

ProductSettings.layout = {
    breadcrumbs: [
        { title: 'Catálogo', href: '#' },
        { title: 'Repuestos', href: '/products' },
        { title: 'Configuración y Ficha', href: '#' },
    ],
};
