import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PackageOpen, Plus, Edit, Power, PowerOff, Search, Box, Layers, Hash, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Brand = { id: number; name: string };
type Category = { id: number; name: string };
type Unit = { id: number; code: string; name: string };

type Product = {
    id: number;
    internal_code: string | null;
    primary_reference: string;
    name: string;
    product_type: 'SIMPLE' | 'KIT_UNICO' | 'KIT_COMPONENTES';
    status: 'ACTIVE' | 'INACTIVE';
    brand?: Brand | null;
    category?: Category | null;
    unit?: Unit | null;
};

type Pagination = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

type Props = {
    products: {
        data: Product[];
    } & Pagination;
    filters: {
        search?: string;
    };
    flash: {
        success?: string;
    };
};

export default function ProductsIndex({ products, filters, flash }: Props) {
    const [searchTerm, setSearchTerm] = React.useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/products', { search: searchTerm }, { preserveState: true });
    };

    const toggleStatus = (product: Product) => {
        if (confirm(`¿Estás seguro de que deseas ${product.status === 'ACTIVE' ? 'desactivar' : 'reactivar'} este producto?`)) {
            router.delete(`/products/${product.id}`);
        }
    };

    const renderTypeBadge = (type: string) => {
        switch (type) {
            case 'SIMPLE':
                return <Badge variant="outline" className="flex w-fit items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"><Box className="h-3 w-3" /> Simple</Badge>;
            case 'KIT_UNICO':
                return <Badge variant="outline" className="flex w-fit items-center gap-1 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"><Layers className="h-3 w-3" /> Kit Único</Badge>;
            case 'KIT_COMPONENTES':
                return <Badge variant="outline" className="flex w-fit items-center gap-1 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"><Layers className="h-3 w-3" /> Kit Comp.</Badge>;
            default:
                return <Badge>{type}</Badge>;
        }
    };

    return (
        <>
            <Head title="Repuestos" />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <PackageOpen className="h-6 w-6 text-primary" />
                            Catálogo de Repuestos
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            El registro maestro único de productos de la empresa.
                        </p>
                    </div>
                    <Button asChild className="flex items-center gap-2">
                        <Link href="/products/create">
                            <Plus className="h-4 w-4" />
                            Nuevo Repuesto
                        </Link>
                    </Button>
                </div>

                <div className="flex justify-between items-center bg-card p-4 rounded-xl shadow border">
                    <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2">
                        <Input 
                            placeholder="Buscar por referencia, nombre, código o alias..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" variant="secondary">
                            <Search className="h-4 w-4 mr-2" />
                            Buscar
                        </Button>
                    </form>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Referencia</th>
                                    <th className="px-6 py-3 font-medium">Nombre</th>
                                    <th className="px-6 py-3 font-medium">Clasificación</th>
                                    <th className="px-6 py-3 font-medium">Tipo</th>
                                    <th className="px-6 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {products.data.map((product) => (
                                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-base">{product.primary_reference}</div>
                                            {product.internal_code && (
                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Hash className="h-3 w-3" /> {product.internal_code}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium max-w-[300px] truncate" title={product.name}>
                                            {product.name}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <div><span className="text-muted-foreground">Marca:</span> {product.brand?.name ?? 'S/M'}</div>
                                            <div><span className="text-muted-foreground">Cat:</span> {product.category?.name ?? 'S/C'}</div>
                                            <div><span className="text-muted-foreground">Und:</span> {product.unit?.code ?? 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2">
                                                {renderTypeBadge(product.product_type)}
                                                {product.status !== 'ACTIVE' && (
                                                    <Badge variant="secondary" className="bg-red-100 text-red-700 w-fit dark:bg-red-900/30 dark:text-red-400">INACTIVO</Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/products/${product.id}`}>
                                                        <Settings className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/products/${product.id}/edit`}>
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button 
                                                    variant={product.status === 'ACTIVE' ? "destructive" : "secondary"} 
                                                    size="sm" 
                                                    onClick={() => toggleStatus(product)}
                                                    title={product.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar'}
                                                >
                                                    {product.status === 'ACTIVE' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {products.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            {filters.search 
                                                ? "No se encontraron productos que coincidan con tu búsqueda."
                                                : "Aún no hay repuestos registrados en el catálogo maestro."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {products.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {products.data.length} de {products.total} resultados
                            </div>
                            <div className="flex gap-1">
                                {products.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? "default" : "outline"}
                                        size="sm"
                                        asChild={!!link.url}
                                        disabled={!link.url}
                                        className={!link.url ? "opacity-50" : ""}
                                    >
                                        {link.url ? (
                                            <Link href={link.url} dangerouslySetInnerHTML={{ __html: link.label }} />
                                        ) : (
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [
        { title: 'Catálogo', href: '#' },
        { title: 'Repuestos', href: '/products' },
    ],
};
