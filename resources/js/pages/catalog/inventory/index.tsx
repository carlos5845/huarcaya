import { Head, Link, router, usePage } from '@inertiajs/react';
import { PackageSearch, Search, Filter, Box } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
    products: any;
    branches: any[];
    filters: {
        branch_id: string | null;
        search: string | null;
    };
};

export default function InventoryIndex({ products, branches, filters }: Props) {
    const { auth } = usePage<any>().props;
    const isSuperAdmin = auth.roles?.includes('Super Admin') || auth.permissions?.includes('view_inventory_general');

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        let url = '/inventory?';
        const search = formData.get('search');
        const branch_id = formData.get('branch_id');
        
        if (search) {
url += `search=${search}&`;
}

        if (branch_id && branch_id !== "ALL") {
url += `branch_id=${branch_id}`;
}

        router.get(url, {}, { preserveState: true });
    };

    return (
        <>
            <Head title="Visor de Inventario Central" />
            
            <div className="flex h-full flex-1 flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <PackageSearch className="h-6 w-6 text-primary" />
                            Visor de Inventario Central
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">Consulta el stock global de todos los productos por sucursal.</p>
                    </div>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow p-4">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                name="search"
                                placeholder="Buscar por código o nombre del producto..."
                                className="pl-8"
                                defaultValue={filters.search || ''}
                            />
                        </div>
                        {isSuperAdmin && (
                            <div className="w-full sm:w-64">
                                <Select name="branch_id" defaultValue={filters.branch_id || (isSuperAdmin ? 'ALL' : (branches[0]?.id.toString() || ''))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isSuperAdmin ? "Todas las sucursales" : "Selecciona una sucursal"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isSuperAdmin && (
                                            <SelectItem value="ALL">Todas las sucursales</SelectItem>
                                        )}
                                        {branches.map((b: any) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <Button type="submit" variant="secondary" className="gap-2">
                            <Filter className="h-4 w-4" />
                            Filtrar
                        </Button>
                    </form>
                </div>

                <div className="rounded-xl border bg-card shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Producto</th>
                                    <th className="px-4 py-3 font-medium">Sucursal / Ubicación</th>
                                    <th className="px-4 py-3 font-medium text-right">Físico</th>
                                    <th className="px-4 py-3 font-medium text-right">Reservado</th>
                                    <th className="px-4 py-3 font-medium text-right">Disponible</th>
                                    <th className="px-4 py-3 font-medium text-right">P. Compra</th>
                                    <th className="px-4 py-3 font-medium text-right">P. Venta</th>
                                    <th className="px-4 py-3 font-medium text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {products.data.map((product: any) => {
                                    const physical = parseFloat(product.physical_quantity) || 0;
                                    const available = parseFloat(product.available_quantity) || 0;
                                    const reserved = physical - available;
                                    
                                    return (
                                        <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-black dark:text-white">
                                                        {product.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-mono mt-0.5">
                                                        {product.primary_reference}
                                                    </span>
                                                    <div className="flex gap-1 mt-1">
                                                        {product.brand && <Badge variant="outline" className="text-[10px] h-4 px-1">{product.brand.name}</Badge>}
                                                        {product.category && <Badge variant="secondary" className="text-[10px] h-4 px-1">{product.category.name}</Badge>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{filters.branch_id && filters.branch_id !== 'ALL' ? branches.find(b => b.id.toString() === filters.branch_id?.toString())?.name : 'Global (Todas)'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">{physical}</td>
                                            <td className="px-4 py-3 text-right font-mono text-orange-600 dark:text-orange-400">{reserved}</td>
                                            <td className="px-4 py-3 text-right font-mono font-medium text-green-600 dark:text-green-400">{available}</td>
                                            <td className="px-4 py-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                                                {product.purchase_price > 0 ? `S/ ${Number(product.purchase_price).toFixed(2)}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-medium whitespace-nowrap">
                                                {product.sale_price > 0 ? `S/ ${Number(product.sale_price).toFixed(2)}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/products/${product.id}?tab=stocks`} className="flex items-center text-xs">
                                                        <Box className="h-3 w-3 mr-1" />
                                                        Ver Prod.
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {products.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                            No se encontraron registros de inventario.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div className="p-4 border-t flex items-center justify-between text-sm">
                            <div className="text-muted-foreground">
                                Mostrando {products.from || 0} a {products.to || 0} de {products.total} registros
                            </div>
                            <div className="flex gap-1">
                                {products.links.map((link: any, i: number) => (
                                    <Button
                                        key={i}
                                        variant={link.active ? "default" : "outline"}
                                        size="sm"
                                        className={link.url ? "" : "opacity-50 cursor-not-allowed"}
                                        onClick={() => link.url && router.get(link.url, { branch_id: filters.branch_id, search: filters.search }, { preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

InventoryIndex.layout = {
    breadcrumbs: [
        {
            title: 'Inventario Central',
            href: '/inventory',
        },
    ],
};
