import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/db';
import { syncPendingOperations, downloadCatalog } from '@/services/sync-service';

export function useNetworkStatus(activeBranchId?: number) {
    const [isMounted, setIsMounted] = useState<boolean>(false);
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

    const refreshPendingCount = useCallback(async () => {
        try {
            const count = await db.syncQueue
                .where('status')
                .equals('PENDING')
                .count();
            setPendingCount(count);
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

            if (result.syncedCount > 0) {
                setLastSyncResult(`Se sincronizaron ${result.syncedCount} operaciones.`);
            } else if (result.failedCount > 0) {
                setLastSyncResult(`Fallaron ${result.failedCount} operaciones.`);
            }
        } catch (err: any) {
            setLastSyncResult(`Error: ${err.message || 'Fallo de sincronización'}`);
        } finally {
            setIsSyncing(false);
        }
    }, [activeBranchId, isSyncing, refreshPendingCount]);

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

        // Auto-seed local catalog if empty in IndexedDB
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            db.products.count().then(count => {
                if (count === 0) {
                    downloadCatalog(activeBranchId).catch(err => {
                        console.error('Error precargando catálogo offline:', err);
                    });
                }
            }).catch(() => {});
        }

        const handleOnline = () => {
            setIsOnline(true);
            triggerSync();
            downloadCatalog(activeBranchId).catch(() => {});
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        const handleSyncFinished = () => {
            refreshPendingCount();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('simaq:sync-finished', handleSyncFinished);

        // Polling pending operations count periodically
        const interval = setInterval(refreshPendingCount, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('simaq:sync-finished', handleSyncFinished);
            clearInterval(interval);
        };
    }, [refreshPendingCount, triggerSync]);

    return {
        isMounted,
        isOnline: isMounted ? isOnline : true,
        pendingCount: isMounted ? pendingCount : 0,
        isSyncing,
        lastSyncResult,
        triggerSync,
        refreshCatalog,
        refreshPendingCount,
    };
}
