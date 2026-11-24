import { useEffect, useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { db } from '@/lib/db';
import {
    syncPendingOperations,
    downloadCatalog,
    reconcileSyncQueue,
    retryQueueOperation,
    discardQueueOperation,
    checkServerConnectivity,
    isSyncActive,
    warmupOfflinePages,
} from '@/services/sync-service';

export interface FailedSyncOperation {
    id: number;
    uuid: string;
    entity_type: string;
    doc_number: string;
    error_message: string;
    client_timestamp: string;
}

export function useNetworkStatus(activeBranchId?: number) {
    const page = usePage();
    const inertiaVersion = page?.version ?? null;
    const [isMounted, setIsMounted] = useState<boolean>(false);
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [failedCount, setFailedCount] = useState<number>(0);
    const [failedOperations, setFailedOperations] = useState<FailedSyncOperation[]>([]);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

    const refreshPendingCount = useCallback(async () => {
        try {
            if (!isSyncActive()) {
                await reconcileSyncQueue();
            }

            const allQueue = await db.syncQueue.filter(q => q.status !== 'SYNCED').toArray();
            const pending = allQueue.filter(q => q.status === 'PENDING' || q.status === 'SYNCING').length;
            const failed = allQueue.filter(q => q.status === 'FAILED');

            setPendingCount(pending);
            setFailedCount(failed.length);
            setFailedOperations(
                failed.map(item => ({
                    id: item.id!,
                    uuid: item.uuid,
                    entity_type: item.entity_type,
                    doc_number:
                        item.payload?.temp_sale_number ||
                        item.payload?.temp_purchase_number ||
                        item.payload?.uuid?.slice(0, 8) ||
                        item.uuid.slice(0, 8),
                    error_message: item.error_message || 'Error no especificado por el servidor',
                    client_timestamp: item.client_timestamp,
                }))
            );
        } catch {
            // DB might not be initialized or accessible yet
        }
    }, []);

    const triggerSync = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.onLine || isSyncing) return;

        setIsSyncing(true);
        setLastSyncResult(null);

        try {
            const result = await syncPendingOperations(activeBranchId);
            await refreshPendingCount();

            if (result.syncedCount > 0 && result.failedCount === 0) {
                setLastSyncResult(`Se sincronizaron ${result.syncedCount} operaciones con éxito.`);
            } else if (result.syncedCount > 0 && result.failedCount > 0) {
                setLastSyncResult(`Sincronizadas: ${result.syncedCount}. Con error: ${result.failedCount}.`);
            } else if (result.failedCount > 0) {
                setLastSyncResult(`Fallaron ${result.failedCount} operaciones. Revisa el detalle.`);
            }
        } catch (err: any) {
            setLastSyncResult(`Error: ${err.message || 'Fallo de sincronización'}`);
        } finally {
            setIsSyncing(false);
        }
    }, [activeBranchId, isSyncing, refreshPendingCount]);

    const retrySingle = useCallback(async (id: number) => {
        try {
            await retryQueueOperation(id);
            await refreshPendingCount();
            await triggerSync();
        } catch (err: any) {
            setLastSyncResult(`Error reintentando: ${err.message}`);
        }
    }, [refreshPendingCount, triggerSync]);

    const discardSingle = useCallback(async (id: number) => {
        try {
            await discardQueueOperation(id);
            await refreshPendingCount();
            if (typeof navigator !== 'undefined' && navigator.onLine) {
                await downloadCatalog(activeBranchId).catch(() => {});
            }
        } catch (err: any) {
            setLastSyncResult(`Error descartando: ${err.message}`);
        }
    }, [activeBranchId, refreshPendingCount]);

    const refreshCatalog = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.onLine) return;
        try {
            return await downloadCatalog(activeBranchId);
        } catch (err) {
            console.error('Error actualizando catálogo local:', err);
        }
    }, [activeBranchId]);

    useEffect(() => {
        setIsMounted(true);
        if (typeof navigator !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        refreshPendingCount();

        // Initial real-connectivity check & catalog/sync boot
        const runOnlineBootstrap = async () => {
            const reachable = await checkServerConnectivity();
            setIsOnline(reachable);
            if (!reachable) return;

            const pending = await db.syncQueue
                .filter(q => q.status === 'PENDING' || q.status === 'FAILED')
                .count();

            if (pending > 0) {
                // triggerSync() automatically refreshes the catalog after syncing
                await triggerSync();
            } else {
                downloadCatalog(activeBranchId).catch(err => {
                    console.error('Error actualizando catálogo offline:', err);
                });
            }

            // Pre-cache key offline pages in background so Sales/Purchases/all modules open seamlessly without internet
            warmupOfflinePages(inertiaVersion).catch(() => {});
        };

        runOnlineBootstrap();

        const handleOnline = async () => {
            // Brief delay to allow DNS/routing to stabilize after WiFi reconnects
            await new Promise(resolve => setTimeout(resolve, 800));
            const reachable = await checkServerConnectivity();
            setIsOnline(reachable);
            if (!reachable) return;

            const pending = await db.syncQueue
                .filter(q => q.status === 'PENDING' || q.status === 'FAILED')
                .count();

            if (pending > 0) {
                await triggerSync();
            } else {
                downloadCatalog(activeBranchId).catch(() => {});
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        const handleSyncFinished = () => {
            refreshPendingCount();
        };

        const handleConnectivityChange = (e: Event) => {
            const detail = (e as CustomEvent<{ online: boolean }>).detail;
            if (typeof detail?.online === 'boolean') {
                setIsOnline(detail.online);
            }
        };

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                const reachable = await checkServerConnectivity();
                setIsOnline(reachable);
                if (reachable && !isSyncActive()) {
                    const pending = await db.syncQueue.filter(q => q.status === 'PENDING').count();
                    if (pending > 0) {
                        triggerSync();
                    }
                }
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('simaq:sync-finished', handleSyncFinished);
        window.addEventListener('simaq:connectivity-change', handleConnectivityChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Polling pending operations count every 5s
        const countInterval = setInterval(refreshPendingCount, 5000);

        // Lightweight real-connectivity heartbeat every 15s (only when tab is visible)
        // Automatically switches badge between online/offline even when WiFi router has no internet,
        // and auto-triggers sync when connection returns.
        const retryInterval = setInterval(async () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            if (isSyncActive()) return;

            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                setIsOnline(false);
                return;
            }

            const reachable = await checkServerConnectivity();
            setIsOnline(reachable);
            if (reachable) {
                const pending = await db.syncQueue.filter(q => q.status === 'PENDING').count();
                if (pending > 0) {
                    triggerSync();
                }
            }
        }, 15000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('simaq:sync-finished', handleSyncFinished);
            window.removeEventListener('simaq:connectivity-change', handleConnectivityChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(countInterval);
            clearInterval(retryInterval);
        };
    }, [activeBranchId, refreshPendingCount, triggerSync]);

    return {
        isMounted,
        isOnline: isMounted ? isOnline : true,
        pendingCount: isMounted ? pendingCount : 0,
        failedCount: isMounted ? failedCount : 0,
        totalPendingCount: isMounted ? (pendingCount + failedCount) : 0,
        failedOperations: isMounted ? failedOperations : [],
        isSyncing,
        lastSyncResult,
        triggerSync,
        retrySingle,
        discardSingle,
        refreshCatalog,
        refreshPendingCount,
    };
}
