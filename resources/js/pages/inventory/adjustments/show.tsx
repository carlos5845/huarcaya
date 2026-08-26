import { Head, Link, router } from '@inertiajs/react';
import { ClipboardList, ArrowLeft, ArrowDownRight, ArrowUpRight, CheckCircle, FileText } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

export default function AdjustmentsShow({ adjustment }: { adjustment: any }) {
    
    const handleConfirm = () => {
        if (!confirm('¿Estás seguro de confirmar este ajuste? Esto afectará el Kardex y no se puede deshacer.')) {
return;
}
        
        router.post(`/inventory/adjustments/${adjustment.id}/confirm`, {}, {
            preserveScroll: true,
        });
    };

    const isPositive = adjustment.adjustment_type === 'POSITIVE';

    return (
        <>
            <Head title={`Ajuste ${adjustment.adjustment_number}`} />
            
            <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 px-4 mt-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/inventory/adjustments">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                                {adjustment.adjustment_number}
                                {adjustment.status === 'CONFIRMED' ? (
                                    <Badge variant="default" className="bg-blue-600 text-sm">Confirmado</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-sm">Borrador</Badge>
                                )}
                            </h1>
                            <p className="text-muted-foreground flex gap-4 mt-1 text-sm">
                                <span>Sucursal: <strong>{adjustment.branch.name}</strong></span>
                                <span>Fecha: <strong>{new Date(adjustment.operation_date).toLocaleString()}</strong></span>
                            </p>
                        </div>
                    </div>
                    {adjustment.status === 'DRAFT' && (
                        <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirmar Ajuste
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 flex flex-col gap-6">
                        <div className="bg-card rounded-xl border p-4 shadow-sm flex flex-col gap-4">
                            <h3 className="font-semibold border-b pb-2">Información del Ajuste</h3>
                            
                            <div className="flex flex-col gap-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground block mb-1">Tipo de Ajuste</span>
                                    {isPositive ? (
                                        <Badge className="bg-emerald-500"><ArrowDownRight className="mr-1 h-3 w-3" /> ENTRADA (Suma)</Badge>
                                    ) : (
                                        <Badge className="bg-orange-500"><ArrowUpRight className="mr-1 h-3 w-3" /> SALIDA (Resta)</Badge>
                                    )}
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Creado por</span>
                                    <span className="font-medium">{adjustment.creator?.name || 'Sistema'}</span>
                                </div>
                                {adjustment.status === 'CONFIRMED' && (
                                    <>
                                        <div>
                                            <span className="text-muted-foreground block">Confirmado por</span>
                                            <span className="font-medium">{adjustment.confirmedBy?.name || 'Sistema'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Fecha de Confirmación</span>
                                            <span className="font-medium">{adjustment.confirmed_at ? new Date(adjustment.confirmed_at).toLocaleString() : '-'}</span>
                                        </div>
                                    </>
                                )}
                                {adjustment.notes && (
                                    <div className="mt-2 bg-muted/50 p-3 rounded-md">
                                        <span className="text-muted-foreground block text-xs font-semibold mb-1 uppercase tracking-wider flex items-center gap-1">
                                            <FileText className="h-3 w-3" /> Notas
                                        </span>
                                        <p className="text-sm">{adjustment.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-4">
                        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-4 border-b bg-muted/20">
                                <h3 className="font-semibold">Productos Ajustados ({adjustment.lines.length})</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3">Código</th>
                                            <th className="px-4 py-3">Producto</th>
                                            <th className="px-4 py-3">Motivo</th>
                                            <th className="px-4 py-3 text-right">Cantidad</th>
                                            <th className="px-4 py-3 text-right">Costo Unit.</th>
                                            <th className="px-4 py-3 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {adjustment.lines.map((line: any) => (
                                            <tr key={line.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-xs">{line.product.primary_reference}</td>
                                                <td className="px-4 py-3 text-xs">{line.product.name}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    <Badge variant="outline">{line.reason_code}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium">
                                                    {isPositive ? '+' : '-'}{Number(line.quantity).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    S/ {Number(line.unit_cost).toFixed(2)}
                                                    {!isPositive && adjustment.status === 'DRAFT' && (
                                                        <span className="block text-[10px] text-muted-foreground">(Se calculará al confirmar)</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold">
                                                    S/ {Number(line.line_total_cost).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {isPositive && (
                                        <tfoot className="bg-muted/50 border-t font-semibold">
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 text-right">Costo Total del Ajuste:</td>
                                                <td className="px-4 py-3 text-right">
                                                    S/ {adjustment.lines.reduce((acc: number, line: any) => acc + Number(line.line_total_cost), 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

AdjustmentsShow.layout = {
    breadcrumbs: [
        { title: 'Inventario', href: '/inventory' },
        { title: 'Ajustes', href: '/inventory/adjustments' },
        { title: 'Detalle de Ajuste', href: '#' }
    ]
};
