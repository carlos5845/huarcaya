import { Head, Link, useForm, router } from '@inertiajs/react';
import { ClipboardList, Plus, Trash2, ArrowLeft, Search, Save } from 'lucide-react';
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';

export default function AdjustmentsCreate({ branches }: { branches: any[] }) {
    const { data, setData, post, processing, errors } = useForm({
        branch_id: branches.length === 1 ? branches[0].id : '',
        adjustment_type: 'POSITIVE',
        notes: '',
        lines: [] as any[]
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!searchQuery.trim()) {
return;
}

        setIsSearching(true);

        try {
            const res = await fetch(`/products/search?q=${encodeURIComponent(searchQuery)}`);
            const json = await res.json();
            setSearchResults(Array.isArray(json) ? json : (json.data || []));
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const addProduct = (product: any) => {
        if (data.lines.some(l => l.product_id === product.id)) {
return;
}
        
        setData('lines', [
            ...data.lines,
            {
                product_id: product.id,
                product_name: product.name,
                primary_reference: product.primary_reference,
                quantity: 1,
                unit_cost: 0,
                reason_code: 'OTROS'
            }
        ]);
        setSearchResults([]);
        setSearchQuery('');
    };

    const removeLine = (index: number) => {
        const newLines = [...data.lines];
        newLines.splice(index, 1);
        setData('lines', newLines);
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...data.lines];
        newLines[index][field] = value;
        setData('lines', newLines);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/inventory/adjustments');
    };

    return (
        <>
            <Head title="Nuevo Ajuste" />
            
            <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 px-4 mt-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/inventory/adjustments">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Nuevo Ajuste Manual</h1>
                        <p className="text-muted-foreground">Crea un registro de entrada o salida manual de inventario.</p>
                    </div>
                </div>

                <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Header (Izquierda) */}
                    <div className="md:col-span-1 flex flex-col gap-4">
                        <div className="bg-card rounded-xl border p-4 shadow-sm flex flex-col gap-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Datos del Ajuste</h3>
                            
                            <div>
                                <label className="text-sm font-medium mb-1 block">Sucursal</label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={data.branch_id}
                                    onChange={e => setData('branch_id', e.target.value)}
                                    required
                                >
                                    <option value="">Selecciona sucursal</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                {errors.branch_id && <p className="text-sm text-destructive mt-1">{errors.branch_id}</p>}
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Tipo de Ajuste</label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                                    value={data.adjustment_type}
                                    onChange={e => setData('adjustment_type', e.target.value)}
                                    required
                                >
                                    <option value="POSITIVE">ENTRADA (Aumentar Stock)</option>
                                    <option value="NEGATIVE">SALIDA (Disminuir Stock)</option>
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {data.adjustment_type === 'POSITIVE' 
                                        ? 'Las entradas requieren que ingreses un Costo Unitario.' 
                                        : 'Las salidas usarán el Costo Promedio actual automáticamente.'}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Notas / Comentarios (Opcional)</label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Justificación del ajuste..."
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={processing || data.lines.length === 0} className="w-full">
                            <Save className="h-4 w-4 mr-2" />
                            Guardar Borrador
                        </Button>
                    </div>

                    {/* Líneas (Derecha) */}
                    <div className="md:col-span-2 flex flex-col gap-4">
                        <div className="bg-card rounded-xl border p-4 shadow-sm flex flex-col gap-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Agregar Productos</h3>
                            
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <Input
                                    type="search"
                                    placeholder="Buscar producto por nombre o referencia..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSearch(e);
                                        }
                                    }}
                                />
                                <Button type="button" onClick={handleSearch} disabled={isSearching} variant="secondary">
                                    <Search className="h-4 w-4" />
                                </Button>
                            </form>

                            {searchResults.length > 0 && (
                                <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                                    {searchResults.map(prod => (
                                        <div key={prod.id} className="flex justify-between items-center p-2 hover:bg-muted/50">
                                            <div>
                                                <div className="font-medium">{prod.primary_reference}</div>
                                                <div className="text-sm text-muted-foreground">{prod.name}</div>
                                            </div>
                                            <Button type="button" size="sm" onClick={() => addProduct(prod)}>
                                                Agregar
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-3 py-2">Producto</th>
                                            <th className="px-3 py-2 w-32">Motivo</th>
                                            <th className="px-3 py-2 w-24">Cantidad</th>
                                            {data.adjustment_type === 'POSITIVE' && (
                                                <th className="px-3 py-2 w-32">Costo Unit.</th>
                                            )}
                                            <th className="px-3 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data.lines.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                                                    No hay productos agregados.
                                                </td>
                                            </tr>
                                        ) : (
                                            data.lines.map((line, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium text-xs">{line.primary_reference}</div>
                                                        <div className="truncate w-40 text-xs">{line.product_name}</div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <select
                                                            className="w-full text-xs p-1 border rounded"
                                                            value={line.reason_code}
                                                            onChange={e => updateLine(idx, 'reason_code', e.target.value)}
                                                        >
                                                            <option value="MERMA">Merma / Daño</option>
                                                            <option value="SOBRANTE">Sobrante</option>
                                                            <option value="SALDO_INICIAL">Saldo Inicial</option>
                                                            <option value="OBSOLESCENCIA">Obsolescencia</option>
                                                            <option value="OTROS">Otros</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <Input 
                                                            type="number" 
                                                            min="0.01" 
                                                            step="0.01" 
                                                            className="h-8 text-xs px-2"
                                                            value={line.quantity}
                                                            onChange={e => updateLine(idx, 'quantity', e.target.value)}
                                                        />
                                                    </td>
                                                    {data.adjustment_type === 'POSITIVE' && (
                                                        <td className="px-3 py-2">
                                                            <Input 
                                                                type="number" 
                                                                min="0" 
                                                                step="0.01" 
                                                                className="h-8 text-xs px-2"
                                                                value={line.unit_cost}
                                                                onChange={e => updateLine(idx, 'unit_cost', e.target.value)}
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2 text-right">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)} className="h-8 w-8 text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                {errors.lines && <div className="p-3 text-sm text-destructive bg-destructive/10">{errors.lines}</div>}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

AdjustmentsCreate.layout = {
    breadcrumbs: [
        { title: 'Inventario', href: '/inventory' },
        { title: 'Ajustes', href: '/inventory/adjustments' },
        { title: 'Nuevo', href: '/inventory/adjustments/create' }
    ]
};
