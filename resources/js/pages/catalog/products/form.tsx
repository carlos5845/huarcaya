import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InputError from '@/components/input-error';
import { PackageOpen, ArrowLeft, Save, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BrandManager } from './components/brand-manager';
import { CategoryManager } from './components/category-manager';
import { UnitManager } from './components/unit-manager';
type Brand = { id: number; name: string };
type Category = { id: number; name: string };
type Unit = { id: number; code: string; name: string };
type Alias = { id?: number; alias: string };

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
    product: Product | null;
};

export default function ProductForm({ brands, categories, units, product }: Props) {
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
    });

    const [similarityStatus, setSimilarityStatus] = useState<'idle' | 'checking' | 'exists' | 'ok'>('idle');
    const [similarProduct, setSimilarProduct] = useState<{ reference: string, name: string } | null>(null);

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
        
        if (isEditing) {
            put(`/products/${product.id}`);
        } else {
            post('/products');
        }
    };

    const addAlias = () => {
        setData('aliases', [...data.aliases, { alias: '' }]);
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

    return (
        <>
            <Head title={isEditing ? 'Editar Repuesto' : 'Nuevo Repuesto'} />
            
            <form onSubmit={handleSubmit} className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8 max-w-5xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" asChild>
                            <Link href="/products">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <PackageOpen className="h-6 w-6 text-primary" />
                                {isEditing ? 'Editar Repuesto' : 'Nuevo Repuesto'}
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                Completa el formulario para registrar un producto en el catálogo maestro.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" asChild>
                            <Link href="/products">Cancelar</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            Guardar Producto
                        </Button>
                    </div>
                </div>

                <div className="bg-card border rounded-xl shadow-sm">
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                            <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent px-6 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                                Datos Generales
                            </TabsTrigger>
                            <TabsTrigger value="aliases" className="rounded-none border-b-2 border-transparent px-6 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                                Códigos y Alias ({data.aliases.length})
                            </TabsTrigger>
                            <TabsTrigger value="config" className="rounded-none border-b-2 border-transparent px-6 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                                Configuración Comercial
                            </TabsTrigger>
                        </TabsList>
                        
                        <div className="p-6">
                            <TabsContent value="general" className="mt-0 space-y-6">
                                {/* Similarity Alert */}
                                {similarityStatus === 'exists' && (
                                    <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Posible Duplicado Encontrado</AlertTitle>
                                        <AlertDescription>
                                            El sistema detectó que la referencia <strong>{data.primary_reference}</strong> es muy similar al producto existente: 
                                            <br/><strong>{similarProduct?.reference} - {similarProduct?.name}</strong>.
                                            <br/><br/>
                                            Recuerda que no deben existir referencias duplicadas en el sistema. Puedes continuar bajo tu propia responsabilidad.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                {similarityStatus === 'ok' && data.primary_reference.trim().length > 0 && (
                                    <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                                        <AlertTitle>Referencia Libre</AlertTitle>
                                        <AlertDescription>
                                            No se detectaron duplicados para esta referencia.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="primary_reference">Referencia Principal <span className="text-red-500">*</span></Label>
                                        <Input 
                                            id="primary_reference" 
                                            value={data.primary_reference} 
                                            onChange={(e) => setData('primary_reference', e.target.value)} 
                                            required 
                                            placeholder="Ej. RK-428"
                                            className="font-mono uppercase text-lg"
                                        />
                                        <InputError message={errors.primary_reference} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="internal_code">Código Interno (Opcional)</Label>
                                        <Input 
                                            id="internal_code" 
                                            value={data.internal_code} 
                                            onChange={(e) => setData('internal_code', e.target.value)} 
                                            placeholder="Ej. PRD-000285"
                                        />
                                        <InputError message={errors.internal_code} />
                                    </div>
                                    
                                    <div className="grid gap-2 md:col-span-2">
                                        <Label htmlFor="name">Nombre del Repuesto <span className="text-red-500">*</span></Label>
                                        <Input 
                                            id="name" 
                                            value={data.name} 
                                            onChange={(e) => setData('name', e.target.value)} 
                                            required 
                                            placeholder="Ej. ACC BLOQUE DE ORBITROL"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Marca <span className="text-red-500">*</span></Label>
                                        <BrandManager
                                            brands={brands}
                                            value={data.brand_id}
                                            onChange={(v) => setData('brand_id', v)}
                                            error={errors.brand_id}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Categoría <span className="text-red-500">*</span></Label>
                                        <CategoryManager
                                            categories={categories}
                                            value={data.category_id}
                                            onChange={(v) => setData('category_id', v)}
                                            error={errors.category_id}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Unidad de Medida <span className="text-red-500">*</span></Label>
                                        <UnitManager
                                            units={units}
                                            value={data.unit_id}
                                            onChange={(v) => setData('unit_id', v)}
                                            error={errors.unit_id}
                                        />
                                    </div>

                                    <div className="grid gap-2 md:col-span-2">
                                        <Label htmlFor="description">Descripción Adicional</Label>
                                        <Textarea 
                                            id="description" 
                                            value={data.description || ''} 
                                            onChange={(e) => setData('description', e.target.value)} 
                                            placeholder="Detalles técnicos, dimensiones, etc."
                                            rows={3}
                                        />
                                        <InputError message={errors.description} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="aliases" className="mt-0 space-y-6">
                                <div className="flex justify-between items-center border-b pb-4">
                                    <div>
                                        <h3 className="text-lg font-medium">Referencias Secundarias y Alias</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Añade aquí otros códigos con los que el cliente o proveedor podría buscar este repuesto.
                                        </p>
                                    </div>
                                    <Button type="button" onClick={addAlias} variant="secondary" size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Añadir Alias
                                    </Button>
                                </div>

                                {data.aliases.length === 0 ? (
                                    <div className="py-8 text-center border-2 border-dashed rounded-lg">
                                        <p className="text-muted-foreground">No se han registrado alias adicionales.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data.aliases.map((alias, idx) => (
                                            <div key={idx} className="flex items-start gap-3">
                                                <div className="flex-1 grid gap-1">
                                                    <Input 
                                                        value={alias.alias} 
                                                        onChange={e => updateAlias(idx, e.target.value)} 
                                                        placeholder="Ej. RK 428, ORB-428..."
                                                        className="font-mono uppercase"
                                                    />
                                                    <InputError message={(errors as any)[`aliases.${idx}.alias`]} />
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeAlias(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="config" className="mt-0 space-y-8">
                                
                                <div>
                                    <h3 className="text-lg font-medium mb-4 pb-2 border-b">Clasificación Operativa</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="grid gap-2">
                                            <Label>Tipo de Producto <span className="text-red-500">*</span></Label>
                                            <Select value={data.product_type} onValueChange={(v: any) => setData('product_type', v)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SIMPLE">
                                                        <div className="font-medium">Producto Simple</div>
                                                        <div className="text-xs text-muted-foreground">Un repuesto individual normal.</div>
                                                    </SelectItem>
                                                    <SelectItem value="KIT_UNICO">
                                                        <div className="font-medium">Kit Único (Pre-armado)</div>
                                                        <div className="text-xs text-muted-foreground">Conjunto que ya viene armado y tiene su propio stock y lote.</div>
                                                    </SelectItem>
                                                    <SelectItem value="KIT_COMPONENTES">
                                                        <div className="font-medium">Kit por Componentes</div>
                                                        <div className="text-xs text-muted-foreground">Conjunto que se arma desde otros repuestos (Descuenta stock de componentes).</div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.product_type} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Estado de Catálogo</Label>
                                            <Select value={data.status} onValueChange={(v: any) => setData('status', v)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ACTIVE">Activo - Disponible para operaciones</SelectItem>
                                                    <SelectItem value="INACTIVE">Inactivo - Oculto y bloqueado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.status} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium mb-4 pb-2 border-b">Configuración de Inventario Base</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <Checkbox 
                                                id="lot_tracking" 
                                                checked={data.requires_lot_tracking} 
                                                onCheckedChange={(c) => setData('requires_lot_tracking', !!c)} 
                                            />
                                            <div className="space-y-1 leading-none">
                                                <Label htmlFor="lot_tracking" className="font-medium cursor-pointer">Requerir Seguimiento de Lotes</Label>
                                                <p className="text-sm text-muted-foreground">Obligará al almacenero a ingresar y seleccionar lotes para este producto.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <Checkbox 
                                                id="fifo" 
                                                checked={data.fifo_enabled} 
                                                onCheckedChange={(c) => setData('fifo_enabled', !!c)} 
                                            />
                                            <div className="space-y-1 leading-none">
                                                <Label htmlFor="fifo" className="font-medium cursor-pointer">Habilitar PEPS Estricto (FIFO)</Label>
                                                <p className="text-sm text-muted-foreground">Obligará al sistema a descontar siempre las unidades más antiguas primero.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </TabsContent>
                        </div>
                    </Tabs>
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
