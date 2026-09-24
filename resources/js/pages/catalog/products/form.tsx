import { Head, Link, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { 
    PackageOpen, 
    ArrowLeft, 
    Save, 
    Plus, 
    Trash2, 
    AlertTriangle, 
    CheckCircle2, 
    Package, 
    Boxes, 
    Layers, 
    Check, 
    ShieldCheck, 
    Barcode, 
    Tag, 
    FileText, 
    Eye,
    Loader2,
    DollarSign,
    Building2,
    TrendingUp,
    Coins,
    Lock
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { BrandManager } from './components/brand-manager';
import { CategoryManager } from './components/category-manager';
import { UnitManager } from './components/unit-manager';

type Brand = { id: number; name: string };
type Category = { id: number; name: string };
type Unit = { id: number; code: string; name: string };
type Alias = { id?: number; alias: string };
type Branch = { id: number; name: string; code?: string };

type Product = {
    id: number;
    internal_code: string | null;
    primary_reference: string;
    name: string;
    description: string | null;
    brand_id: number;
    category_id: number;
    unit_id: number;
    product_type: 'SIMPLE' | 'KIT_UNICO' | 'KIT_COMPONENTES';
    status: 'ACTIVE' | 'INACTIVE';
    requires_lot_tracking: boolean;
    fifo_enabled: boolean;
    aliases?: Alias[];
};

type Props = {
    brands: Brand[];
    categories: Category[];
    units: Unit[];
    branches?: Branch[];
    defaultBranchId?: number | null;
    isSuperAdmin?: boolean;
    product: Product | null;
};

export default function ProductForm({
    brands,
    categories,
    units,
    branches = [],
    defaultBranchId = null,
    isSuperAdmin = false,
    product
}: Props) {
    const isEditing = !!product;

    const { data, setData, post, put, processing, errors } = useForm({
        internal_code: product?.internal_code || '',
        primary_reference: product?.primary_reference || '',
        name: product?.name || '',
        description: product?.description || '',
        brand_id: product?.brand_id ? product.brand_id.toString() : '',
        category_id: product?.category_id ? product.category_id.toString() : '',
        unit_id: product?.unit_id ? product.unit_id.toString() : '',
        product_type: product?.product_type || 'SIMPLE',
        status: product?.status || 'ACTIVE',
        requires_lot_tracking: product?.requires_lot_tracking ?? false,
        fifo_enabled: product?.fifo_enabled ?? true,
        aliases: product?.aliases || [],
        initial_price: '',
        initial_min_price: '',
        has_initial_stock: false,
        initial_branch_id: defaultBranchId ? defaultBranchId.toString() : (branches[0]?.id ? branches[0].id.toString() : ''),
        initial_stock: '',
        initial_unit_cost: '',
    });

    const [similarityStatus, setSimilarityStatus] = useState<'idle' | 'checking' | 'exists' | 'ok'>('idle');
    const [similarProduct, setSimilarProduct] = useState<{ reference: string; name: string } | null>(null);
    const [showAliases, setShowAliases] = useState(data.aliases.length > 0);

    // Debounce reference check
    useEffect(() => {
        if (!data.primary_reference || data.primary_reference.trim().length < 3) {
            setSimilarityStatus('idle');
            return;
        }

        const timer = setTimeout(() => {
            checkSimilarity(data.primary_reference);
        }, 500);

        return () => clearTimeout(timer);
    }, [data.primary_reference]);

    const checkSimilarity = async (reference: string) => {
        setSimilarityStatus('checking');

        try {
            const response = await fetch('/products/check-similarity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({ 
                    reference, 
                    ignore_id: product?.id 
                })
            });
            const result = await response.json();
            
            if (result.exists) {
                setSimilarityStatus('exists');
                setSimilarProduct(result.similar_product);
            } else {
                setSimilarityStatus('ok');
                setSimilarProduct(null);
            }
        } catch (error) {
            console.error("Error checking similarity", error);
            setSimilarityStatus('idle');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Hardcode inventory settings to true as required by business logic
        data.requires_lot_tracking = true;
        data.fifo_enabled = true;
        
        if (isEditing) {
            put(`/products/${product.id}`, {
                onSuccess: () => {
                    toast.success('Repuesto actualizado exitosamente');
                },
                onError: (err) => {
                    const firstErr = Object.values(err)[0] || 'Hubo un problema al actualizar el repuesto. Revisa los campos.';
                    toast.error(String(firstErr));
                }
            });
        } else {
            post('/products', {
                onSuccess: () => {
                    toast.success('Repuesto registrado exitosamente');
                },
                onError: (err) => {
                    const firstErr = Object.values(err)[0] || 'Hubo un problema al crear el repuesto. Revisa los campos obligatorios.';
                    toast.error(String(firstErr));
                }
            });
        }
    };

    const addAlias = () => {
        setData('aliases', [...data.aliases, { alias: '' }]);
        setShowAliases(true);
    };

    const updateAlias = (index: number, value: string) => {
        const newAliases = [...data.aliases];
        newAliases[index].alias = value;
        setData('aliases', newAliases);
    };

    const removeAlias = (index: number) => {
        const newAliases = [...data.aliases];
        newAliases.splice(index, 1);
        setData('aliases', newAliases);
    };

    const selectedBrand = brands.find((b) => b.id.toString() === data.brand_id);
    const selectedCategory = categories.find((c) => c.id.toString() === data.category_id);
    const selectedUnit = units.find((u) => u.id.toString() === data.unit_id);
    const assignedBranch = branches.find((b) => b.id.toString() === data.initial_branch_id)
        || branches.find((b) => b.id === defaultBranchId)
        || branches[0];

    const initialQty = parseFloat(data.initial_stock) || 0;
    const initialCost = parseFloat(data.initial_unit_cost) || 0;
    const initialSalePrice = parseFloat(data.initial_price) || 0;
    const totalInitialInvestment = initialQty * initialCost;
    const grossMarginPct = initialSalePrice > 0 && initialCost > 0
        ? (((initialSalePrice - initialCost) / initialSalePrice) * 100).toFixed(1)
        : null;

    return (
        <>
            <Head title={isEditing ? `Editar: ${product.primary_reference}` : 'Nuevo Repuesto'} />
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" asChild className="h-9 w-9">
                            <Link href="/products">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {isEditing ? 'Editar Repuesto' : 'Nuevo Repuesto'}
                                </h1>
                                <Badge variant={data.status === 'ACTIVE' ? 'outline' : 'secondary'} className={data.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''}>
                                    {data.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                {isEditing 
                                    ? `Modificando especificaciones y clasificación de ${product.primary_reference}.` 
                                    : 'Completa los datos para dar de alta un producto en el catálogo maestro.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" type="button" asChild className="flex-1 sm:flex-initial">
                            <Link href="/products">Cancelar</Link>
                        </Button>
                        <Button type="submit" disabled={processing} className="flex-1 sm:flex-initial">
                            {processing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {isEditing ? 'Guardar Cambios' : 'Registrar Repuesto'}
                        </Button>
                    </div>
                </div>

                {/* Main 2-column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Form Sections (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* Bloque 1: Identificación y Referencias */}
                        <Card>
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <Barcode className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-semibold">Identificación y Referencias</CardTitle>
                                            <CardDescription className="text-xs">
                                                Códigos clave para búsqueda, rotulado y control de inventario.
                                            </CardDescription>
                                        </div>
                                    </div>
                                    {similarityStatus === 'checking' && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                            <span>Verificando...</span>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                
                                {/* Live Similarity Alerts */}
                                {similarityStatus === 'exists' && (
                                    <Alert variant="destructive" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 py-3">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle className="text-sm font-semibold">Posible Duplicado Encontrado</AlertTitle>
                                        <AlertDescription className="text-xs mt-1">
                                            La referencia <strong>{data.primary_reference}</strong> coincide o es muy similar al repuesto existente:
                                            <div className="mt-1 font-mono font-medium text-foreground bg-background/80 p-1.5 rounded border">
                                                {similarProduct?.reference} — {similarProduct?.name}
                                            </div>
                                            <span className="text-[11px] opacity-80 block mt-1">
                                                Evita duplicar códigos para mantener la integridad de existencias y costos.
                                            </span>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {similarityStatus === 'ok' && data.primary_reference.trim().length >= 3 && (
                                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-md">
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        <span>Referencia única disponible para registrar en el catálogo.</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="primary_reference" className="flex items-center justify-between">
                                            <span>Referencia Principal <span className="text-red-500">*</span></span>
                                            <span className="text-[11px] text-muted-foreground font-mono">Único</span>
                                        </Label>
                                        <Input 
                                            id="primary_reference" 
                                            value={data.primary_reference} 
                                            onChange={(e) => setData('primary_reference', e.target.value)} 
                                            required 
                                            placeholder="Ej. RK-428, 1R-0716..."
                                            className="font-mono uppercase font-semibold text-base"
                                        />
                                        <InputError message={errors.primary_reference} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="internal_code" className="flex items-center justify-between">
                                            <span>Código Interno (Opcional)</span>
                                            <span className="text-[11px] text-muted-foreground">SKU / Barra</span>
                                        </Label>
                                        <Input 
                                            id="internal_code" 
                                            value={data.internal_code} 
                                            onChange={(e) => setData('internal_code', e.target.value)} 
                                            placeholder="Ej. PRD-000285"
                                            className="font-mono"
                                        />
                                        <InputError message={errors.internal_code} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre Comercial del Repuesto <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="name" 
                                        value={data.name} 
                                        onChange={(e) => setData('name', e.target.value)} 
                                        required 
                                        placeholder="Ej. BLOQUE DE ORBITROL DE DIRECCIÓN HIDRÁULICA"
                                        className="uppercase"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                {/* Seccion Alias / Referencias Secundarias */}
                                <div className="pt-2">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">Referencias Secundarias y Alias</span>
                                                <Badge variant="secondary" className="text-xs font-mono">
                                                    {data.aliases.length}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Códigos equivalentes u originales con los que clientes o proveedores buscan esta pieza.
                                            </p>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={addAlias}
                                            className="h-8 text-xs shrink-0"
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            Añadir Alias
                                        </Button>
                                    </div>

                                    {data.aliases.length > 0 && (
                                        <div className="mt-3 space-y-2.5 pl-1">
                                            {data.aliases.map((alias, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <Badge variant="outline" className="h-8 w-8 rounded flex items-center justify-center font-mono text-xs text-muted-foreground shrink-0">
                                                        #{idx + 1}
                                                    </Badge>
                                                    <div className="flex-1">
                                                        <Input 
                                                            value={alias.alias} 
                                                            onChange={e => updateAlias(idx, e.target.value)} 
                                                            placeholder="Ej. RK 428, ORB-428-ALT, 150-1284..."
                                                            className="font-mono uppercase h-9 text-sm"
                                                        />
                                                        <InputError message={(errors as any)[`aliases.${idx}.alias`]} />
                                                    </div>
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => removeAlias(idx)} 
                                                        className="h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 shrink-0"
                                                        title="Eliminar alias"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bloque 2: Clasificación Técnica */}
                        <Card>
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Tag className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">Clasificación Técnica</CardTitle>
                                        <CardDescription className="text-xs">
                                            Fabricante, familia de producto y unidad de medida oficial.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <BrandManager
                                        brands={brands}
                                        value={data.brand_id}
                                        onChange={(v) => setData('brand_id', v)}
                                        error={errors.brand_id}
                                        label="Marca"
                                        required
                                    />

                                    <CategoryManager
                                        categories={categories}
                                        value={data.category_id}
                                        onChange={(v) => setData('category_id', v)}
                                        error={errors.category_id}
                                        label="Categoría"
                                        required
                                    />

                                    <UnitManager
                                        units={units}
                                        value={data.unit_id}
                                        onChange={(v) => setData('unit_id', v)}
                                        error={errors.unit_id}
                                        label="Unidad de Medida"
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Descripción Técnica / Observaciones</Label>
                                    <Textarea 
                                        id="description" 
                                        value={data.description || ''} 
                                        onChange={(e) => setData('description', e.target.value)} 
                                        placeholder="Detalles dimensionales, rosca, material, modelos compatibles de maquinaria o notas del repuesto..."
                                        rows={3}
                                        className="resize-y text-sm"
                                    />
                                    <InputError message={errors.description} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bloque 3: Clasificación Operativa y Estado */}
                        <Card>
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Boxes className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">Clasificación Operativa</CardTitle>
                                        <CardDescription className="text-xs">
                                            Define cómo se comporta el producto en inventarios, ventas y kits.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                
                                {/* Product Type Clickable Cards */}
                                <div className="space-y-2">
                                    <Label>Tipo de Producto <span className="text-red-500">*</span></Label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        
                                        {/* SIMPLE */}
                                        <div
                                            onClick={() => setData('product_type', 'SIMPLE')}
                                            className={cn(
                                                "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                                                data.product_type === 'SIMPLE'
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border hover:border-muted-foreground/40 bg-card"
                                            )}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className={cn(
                                                        "p-2 rounded-lg",
                                                        data.product_type === 'SIMPLE' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                    {data.product_type === 'SIMPLE' && (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    )}
                                                </div>
                                                <div className="font-semibold text-sm">Producto Simple</div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Repuesto individual estándar para compra, stock y venta directa.
                                                </p>
                                            </div>
                                            <div className="mt-3 pt-2 border-t text-[11px] font-medium text-muted-foreground">
                                                Stock directo individual
                                            </div>
                                        </div>

                                        {/* KIT_UNICO */}
                                        <div
                                            onClick={() => setData('product_type', 'KIT_UNICO')}
                                            className={cn(
                                                "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                                                data.product_type === 'KIT_UNICO'
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border hover:border-muted-foreground/40 bg-card"
                                            )}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className={cn(
                                                        "p-2 rounded-lg",
                                                        data.product_type === 'KIT_UNICO' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        <Boxes className="h-4 w-4" />
                                                    </div>
                                                    {data.product_type === 'KIT_UNICO' && (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    )}
                                                </div>
                                                <div className="font-semibold text-sm">Kit Único (Pre-armado)</div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Conjunto ensamblado que ingresa y se gestiona como una sola unidad con lote propio.
                                                </p>
                                            </div>
                                            <div className="mt-3 pt-2 border-t text-[11px] font-medium text-muted-foreground">
                                                Lote y costo consolidado
                                            </div>
                                        </div>

                                        {/* KIT_COMPONENTES */}
                                        <div
                                            onClick={() => setData('product_type', 'KIT_COMPONENTES')}
                                            className={cn(
                                                "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between",
                                                data.product_type === 'KIT_COMPONENTES'
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border hover:border-muted-foreground/40 bg-card"
                                            )}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className={cn(
                                                        "p-2 rounded-lg",
                                                        data.product_type === 'KIT_COMPONENTES' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        <Layers className="h-4 w-4" />
                                                    </div>
                                                    {data.product_type === 'KIT_COMPONENTES' && (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    )}
                                                </div>
                                                <div className="font-semibold text-sm">Kit por Componentes</div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Conjunto virtual que al venderse descuenta el stock de sus repuestos componentes.
                                                </p>
                                            </div>
                                            <div className="mt-3 pt-2 border-t text-[11px] font-medium text-muted-foreground">
                                                Descuento dinámico
                                            </div>
                                        </div>

                                    </div>
                                    <InputError message={errors.product_type} />
                                </div>

                                <Separator />

                                {/* Estado de Catálogo */}
                                <div className="space-y-2">
                                    <Label>Estado en el Catálogo</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div
                                            onClick={() => setData('status', 'ACTIVE')}
                                            className={cn(
                                                "p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                                                data.status === 'ACTIVE'
                                                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                    : "border-border bg-card hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn(
                                                    "h-2.5 w-2.5 rounded-full",
                                                    data.status === 'ACTIVE' ? "bg-emerald-500" : "bg-muted-foreground"
                                                )} />
                                                <div>
                                                    <div className="font-medium text-sm">Activo / Operativo</div>
                                                    <div className="text-xs opacity-80">Visible para cotizaciones, compras y ventas</div>
                                                </div>
                                            </div>
                                            {data.status === 'ACTIVE' && <Check className="h-4 w-4 shrink-0" />}
                                        </div>

                                        <div
                                            onClick={() => setData('status', 'INACTIVE')}
                                            className={cn(
                                                "p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                                                data.status === 'INACTIVE'
                                                    ? "border-muted-foreground/50 bg-muted/60 text-foreground"
                                                    : "border-border bg-card hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn(
                                                    "h-2.5 w-2.5 rounded-full",
                                                    data.status === 'INACTIVE' ? "bg-red-500" : "bg-muted-foreground"
                                                )} />
                                                <div>
                                                    <div className="font-medium text-sm">Inactivo / Bloqueado</div>
                                                    <div className="text-xs opacity-80">Oculto para nuevas transacciones comerciales</div>
                                                </div>
                                            </div>
                                            {data.status === 'INACTIVE' && <Check className="h-4 w-4 shrink-0" />}
                                        </div>
                                    </div>
                                    <InputError message={errors.status} />
                                </div>

                            </CardContent>
                        </Card>

                        {!isEditing && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <Coins className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">Precios y Stock Inicial (Opcional)</CardTitle>
                                            <CardDescription>
                                                Configura los precios de venta y opcionalmente apertura la primera existencia física.
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Precios Comerciales */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <DollarSign className="h-4 w-4 text-primary" />
                                            <h4 className="text-sm font-semibold">Precios Comerciales de Venta</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="initial_price">Precio Público Sugerido (PEN)</Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">S/</span>
                                                    <Input
                                                        id="initial_price"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        className="pl-8 font-mono"
                                                        value={data.initial_price}
                                                        onChange={(e) => setData('initial_price', e.target.value)}
                                                    />
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">Precio estándar para facturación y mostrador.</p>
                                                <InputError message={errors.initial_price} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="initial_min_price">Precio Mínimo de Seguridad (PEN)</Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">S/</span>
                                                    <Input
                                                        id="initial_min_price"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        className="pl-8 font-mono"
                                                        value={data.initial_min_price}
                                                        onChange={(e) => setData('initial_min_price', e.target.value)}
                                                    />
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">Límite para alertas o bloqueos de descuento.</p>
                                                <InputError message={errors.initial_min_price} />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Existencia Física Inicial */}
                                    <div className="space-y-4">
                                        <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30">
                                            <Checkbox
                                                id="has_initial_stock"
                                                checked={data.has_initial_stock}
                                                onCheckedChange={(checked) => setData('has_initial_stock', !!checked)}
                                                className="mt-0.5"
                                            />
                                            <div className="space-y-1 leading-none">
                                                <label
                                                    htmlFor="has_initial_stock"
                                                    className="text-sm font-semibold cursor-pointer text-foreground"
                                                >
                                                    Registrar existencia física de arranque
                                                </label>
                                                <p className="text-xs text-muted-foreground">
                                                    Genera el asiento de apertura en Kardex (INVENTARIO_INICIAL) y el primer Lote FIFO trazable.
                                                </p>
                                            </div>
                                        </div>

                                        {data.has_initial_stock && (
                                            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                                                {/* Sucursal destino */}
                                                <div className="space-y-2">
                                                    <Label>Sucursal de Ingreso <span className="text-destructive">*</span></Label>
                                                    {isSuperAdmin ? (
                                                        <Select
                                                            value={data.initial_branch_id}
                                                            onValueChange={(val) => setData('initial_branch_id', val)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Seleccione sucursal..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {branches.map((b) => (
                                                                    <SelectItem key={b.id} value={b.id.toString()}>
                                                                        {b.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                                            <div className="flex items-center gap-2">
                                                                <Building2 className="h-4 w-4 text-primary" />
                                                                <span className="font-semibold text-sm">
                                                                    {assignedBranch?.name || 'Sucursal Principal'}
                                                                </span>
                                                            </div>
                                                            <Badge variant="outline" className="text-[11px] gap-1 bg-muted text-muted-foreground">
                                                                <Lock className="h-3 w-3" /> Tu Sede Asignada
                                                            </Badge>
                                                        </div>
                                                    )}
                                                    {!isSuperAdmin && (
                                                        <p className="text-[11px] text-muted-foreground">
                                                            🔒 Como usuario de sede, el inventario se asigna exclusivamente a tu sucursal.
                                                        </p>
                                                    )}
                                                    <InputError message={errors.initial_branch_id} />
                                                </div>

                                                {/* Cantidad y Costo */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="initial_stock">
                                                            Cantidad Inicial ({selectedUnit?.name || 'Unidades'}) <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            id="initial_stock"
                                                            type="number"
                                                            step="any"
                                                            min="0.01"
                                                            placeholder="0"
                                                            className="font-mono text-base"
                                                            value={data.initial_stock}
                                                            onChange={(e) => setData('initial_stock', e.target.value)}
                                                            required={data.has_initial_stock}
                                                        />
                                                        <InputError message={errors.initial_stock} />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="initial_unit_cost">
                                                            Costo Unitario de Compra (PEN)
                                                        </Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">S/</span>
                                                            <Input
                                                                id="initial_unit_cost"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="0.00"
                                                                className="pl-8 font-mono text-base"
                                                                value={data.initial_unit_cost}
                                                                onChange={(e) => setData('initial_unit_cost', e.target.value)}
                                                            />
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Costo base para valorización de Kardex y margen.
                                                        </p>
                                                        <InputError message={errors.initial_unit_cost} />
                                                    </div>
                                                </div>

                                                {/* Resumen Calculado en Vivo */}
                                                {(initialQty > 0 || initialCost > 0) && (
                                                    <div className="pt-3 border-t border-primary/10 grid grid-cols-2 gap-3 text-xs">
                                                        <div className="p-2.5 rounded-lg bg-card/60 border border-primary/10">
                                                            <span className="text-muted-foreground block text-[11px]">Valorización Total Ingreso:</span>
                                                            <span className="font-mono font-bold text-foreground text-sm">
                                                                S/ {totalInitialInvestment.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="p-2.5 rounded-lg bg-card/60 border border-primary/10">
                                                            <span className="text-muted-foreground block text-[11px]">Margen Bruto Estimado:</span>
                                                            {grossMarginPct !== null ? (
                                                                <span className={cn(
                                                                    "font-mono font-bold text-sm",
                                                                    parseFloat(grossMarginPct) >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"
                                                                )}>
                                                                    {grossMarginPct}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground italic">Requiere precio y costo</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    </div>

                    {/* Right Column: Live Ficha Técnica / Summary (4 cols, Sticky) */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
                        
                        {/* Live Ficha Card */}
                        <Card className="border-2 border-primary/20 shadow-sm overflow-hidden">
                            <div className="bg-primary/5 px-4 py-3 border-b border-primary/10 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                    <Eye className="h-4 w-4" />
                                    <span>Ficha Técnica en Vivo</span>
                                </div>
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                            </div>

                            <CardContent className="p-5 space-y-4">
                                
                                {/* Product Primary Reference */}
                                <div>
                                    <div className="text-xs text-muted-foreground">Referencia Principal</div>
                                    <div className="text-xl font-bold font-mono tracking-tight text-foreground break-words mt-0.5">
                                        {data.primary_reference ? data.primary_reference.toUpperCase() : 'REF-PENDIENTE'}
                                    </div>
                                    {data.internal_code && (
                                        <div className="text-xs font-mono text-muted-foreground mt-0.5">
                                            SKU: {data.internal_code}
                                        </div>
                                    )}
                                </div>

                                {/* Commercial Name */}
                                <div>
                                    <div className="text-xs text-muted-foreground">Descripción Comercial</div>
                                    <div className="text-sm font-medium text-foreground break-words uppercase mt-0.5">
                                        {data.name || 'Sin nombre registrado'}
                                    </div>
                                </div>

                                <Separator />

                                {/* Badges Grid */}
                                <div className="space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Estado:</span>
                                        <Badge 
                                            variant={data.status === 'ACTIVE' ? 'outline' : 'secondary'}
                                            className={data.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''}
                                        >
                                            {data.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Tipo de Producto:</span>
                                        <Badge variant="outline" className="font-medium">
                                            {data.product_type === 'SIMPLE' && 'Producto Simple'}
                                            {data.product_type === 'KIT_UNICO' && 'Kit Único'}
                                            {data.product_type === 'KIT_COMPONENTES' && 'Kit por Componentes'}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Marca:</span>
                                        <span className="font-medium text-foreground truncate max-w-[160px] text-right">
                                            {selectedBrand?.name || '—'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Categoría:</span>
                                        <span className="font-medium text-foreground truncate max-w-[160px] text-right">
                                            {selectedCategory?.name || '—'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Unidad:</span>
                                        <span className="font-medium text-foreground">
                                            {selectedUnit ? `${selectedUnit.name} (${selectedUnit.code})` : '—'}
                                        </span>
                                    </div>

                                    {!isEditing && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Precio Público:</span>
                                                <span className="font-mono font-semibold text-foreground">
                                                    {data.initial_price ? `S/ ${parseFloat(data.initial_price).toFixed(2)}` : '—'}
                                                </span>
                                            </div>

                                            {data.initial_min_price && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Precio Mínimo:</span>
                                                    <span className="font-mono font-medium text-red-600 dark:text-red-400">
                                                        S/ {parseFloat(data.initial_min_price).toFixed(2)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Stock de Arranque:</span>
                                                <span className="font-mono font-semibold text-foreground">
                                                    {data.has_initial_stock && data.initial_stock
                                                        ? `${data.initial_stock} ${selectedUnit?.code || 'UND'}`
                                                        : '0 (Sin stock inicial)'}
                                                </span>
                                            </div>

                                            {data.has_initial_stock && data.initial_stock && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Sede Ingreso:</span>
                                                    <span className="font-medium text-foreground truncate max-w-[150px] text-right">
                                                        {assignedBranch?.name || '—'}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {data.aliases.length > 0 && (
                                        <div className="pt-1">
                                            <span className="text-muted-foreground block mb-1">Alias / Equivalencias:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {data.aliases.slice(0, 4).map((a, i) => a.alias.trim() && (
                                                    <Badge key={i} variant="secondary" className="font-mono text-[10px]">
                                                        {a.alias}
                                                    </Badge>
                                                ))}
                                                {data.aliases.length > 4 && (
                                                    <Badge variant="outline" className="text-[10px]">
                                                        +{data.aliases.length - 4} más
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* System Rules Notice */}
                                <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1.5 border">
                                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                        <span>Políticas de Inventario Huarcaya</span>
                                    </div>
                                    <div className="text-muted-foreground text-[11px] leading-relaxed">
                                        • Trazabilidad por Lotes obligatoria.<br/>
                                        • Salida bajo algoritmo FIFO automático.
                                    </div>
                                </div>

                                {/* Form Submit in Sidebar */}
                                <div className="pt-2 space-y-2">
                                    <Button type="submit" disabled={processing} className="w-full">
                                        {processing ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        {isEditing ? 'Guardar Cambios' : 'Registrar Repuesto'}
                                    </Button>
                                    <Button variant="outline" type="button" asChild className="w-full">
                                        <Link href="/products">Cancelar</Link>
                                    </Button>
                                </div>

                            </CardContent>
                        </Card>

                    </div>

                </div>
            </form>
        </>
    );
}

ProductForm.layout = {
    breadcrumbs: [
        { title: 'Catálogo', href: '#' },
        { title: 'Repuestos', href: '/products' },
        { title: 'Registro', href: '#' },
    ],
};
