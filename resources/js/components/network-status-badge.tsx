import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Database, CheckCircle2, AlertCircle, ArrowUpRight, Cloud, CloudOff, RotateCcw, Trash2 } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export function NetworkStatusBadge({ branchId }: { branchId?: number }) {
    const {
        isOnline,
        pendingCount,
        failedCount,
        totalPendingCount,
        failedOperations,
        isSyncing,
        lastSyncResult,
        triggerSync,
        retrySingle,
        discardSingle,
        refreshCatalog,
    } = useNetworkStatus(branchId);

    const [isDownloadingCatalog, setIsDownloadingCatalog] = useState(false);
    const [catalogMsg, setCatalogMsg] = useState<string | null>(null);

    const handleDownloadCatalog = async () => {
        setIsDownloadingCatalog(true);
        setCatalogMsg(null);
        try {
            const res = await refreshCatalog();
            if (res) {
                setCatalogMsg(`Catálogo actualizado: ${res.productsCount} productos, ${res.customersCount} clientes.`);
            }
        } catch (err: any) {
            setCatalogMsg(`Error: ${err.message}`);
        } finally {
            setIsDownloadingCatalog(false);
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${
                        !isOnline
                            ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                            : isSyncing
                            ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                            : failedCount > 0
                            ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
                            : pendingCount > 0
                            ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    }`}
                    title={isOnline ? 'Conexión a internet activa' : 'Sin conexión a internet (Modo Offline activo)'}
                >
                    {isSyncing ? (
                        <>
                            <RefreshCw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                            <span className="font-medium tracking-tight">Sincronizando operaciones...</span>
                        </>
                    ) : !isOnline ? (
                        <>
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                            </span>
                            <WifiOff className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span className="font-semibold tracking-tight">Sin conexión a internet</span>
                            {totalPendingCount > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-tight">
                                    {totalPendingCount} pend.
                                </span>
                            )}
                        </>
                    ) : (
                        <>
                            <span className="relative flex h-2 w-2 shrink-0">
                                {failedCount > 0 ? (
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                                ) : (
                                    <>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </>
                                )}
                            </span>
                            {failedCount > 0 ? (
                                <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            ) : (
                                <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                            <span className="font-semibold tracking-tight">Con conexión a internet</span>
                            {pendingCount > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-tight">
                                    {pendingCount} pend.
                                </span>
                            )}
                            {failedCount > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-tight">
                                    {failedCount} con error
                                </span>
                            )}
                        </>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-96 p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                        {isOnline ? (
                            <>
                                <Cloud className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Con conexión a internet</span>
                            </>
                        ) : (
                            <>
                                <CloudOff className="h-4 w-4 text-rose-600 shrink-0" />
                                <span className="text-rose-700 dark:text-rose-400 font-bold">Sin conexión a internet</span>
                            </>
                        )}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted font-medium text-muted-foreground uppercase">
                        PWA Offline
                    </span>
                </div>

                <div className="text-xs space-y-2 text-muted-foreground">
                    <p className="text-[11px] leading-relaxed">
                        {!isOnline
                            ? 'El sistema está operando en modo local. Puedes continuar emitiendo ventas y compras; se guardarán en tu dispositivo y se sincronizarán en cuanto vuelva la red.'
                            : 'El sistema está conectado directamente al servidor central. Todos los comprobantes y movimientos se guardan en tiempo real.'}
                    </p>

                    <div className="flex justify-between items-center py-1.5 bg-muted/50 px-2.5 rounded-lg border border-border/50">
                        <span className="font-medium text-foreground">Operaciones locales pendientes:</span>
                        <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${pendingCount > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                            {pendingCount}
                        </span>
                    </div>

                    {failedCount > 0 && (
                        <div className="flex justify-between items-center py-1.5 bg-rose-50 dark:bg-rose-950/40 px-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60">
                            <span className="font-medium text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                Con error de sincronización:
                            </span>
                            <span className="font-bold text-sm px-2 py-0.5 rounded-full bg-rose-600 text-white">
                                {failedCount}
                            </span>
                        </div>
                    )}

                    {failedOperations.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                Detalle de errores pendientes:
                            </span>
                            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                                {failedOperations.map(op => (
                                    <div key={op.id} className="p-2 rounded-md bg-muted/60 border border-border/80 text-xs flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-foreground text-[11px]">
                                                {op.entity_type === 'SALE' ? 'Venta' : op.entity_type === 'PURCHASE' ? 'Compra' : op.entity_type}: {op.doc_number}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => retrySingle(op.id)}
                                                    disabled={isSyncing || !isOnline}
                                                    title="Reintentar esta operación"
                                                    className="p-1 rounded hover:bg-background text-primary hover:text-primary transition-colors disabled:opacity-50"
                                                >
                                                    <RotateCcw className="h-3 w-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(`¿Descartar ${op.entity_type === 'SALE' ? 'la venta' : 'la operación'} ${op.doc_number}? Se eliminará del registro local de contingencia.`)) {
                                                            discardSingle(op.id);
                                                        }
                                                    }}
                                                    disabled={isSyncing}
                                                    title="Descartar del almacenamiento local"
                                                    className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 hover:text-rose-700 transition-colors disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-mono leading-tight break-words bg-rose-50 dark:bg-rose-950/40 p-1 rounded">
                                            {op.error_message}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {lastSyncResult && (
                        <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs flex items-start gap-2 border border-blue-200 dark:border-blue-800/60">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                            <span>{lastSyncResult}</span>
                        </div>
                    )}

                    {catalogMsg && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2 border border-emerald-200 dark:border-emerald-800/60">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                            <span>{catalogMsg}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 pt-1 border-t">
                    <Button
                        size="sm"
                        variant={totalPendingCount > 0 ? (failedCount > 0 ? 'default' : 'default') : 'outline'}
                        className={`w-full justify-start gap-2 text-xs h-8 ${failedCount > 0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                        disabled={!isOnline || isSyncing || totalPendingCount === 0}
                        onClick={triggerSync}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing
                            ? 'Sincronizando operaciones...'
                            : failedCount > 0
                            ? `Reintentar sincronización (${totalPendingCount} pendientes)`
                            : `Sincronizar ahora (${pendingCount} pendientes)`}
                    </Button>

                    <Button
                        size="sm"
                        variant="secondary"
                        className="w-full justify-start gap-2 text-xs h-8"
                        disabled={!isOnline || isDownloadingCatalog}
                        onClick={handleDownloadCatalog}
                    >
                        <Database className={`h-3.5 w-3.5 ${isDownloadingCatalog ? 'animate-spin' : ''}`} />
                        {isDownloadingCatalog ? 'Descargando catálogo...' : 'Actualizar catálogo local'}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
