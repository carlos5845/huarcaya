import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalOfflinePurchase } from '@/lib/db';
import { discardOfflinePurchase } from '@/services/sync-service';
import { toast } from 'sonner';

export interface MergedPurchaseItem {
    id: number | string;
    uuid?: string;
    is_offline?: boolean;
    document_date: string;
    created_at: string;
    purchase_number: string;
    supplier_name?: string;
    supplier?: { id?: number | string; legal_name: string; trade_name?: string };
    supplier_document_type?: string;
    supplier_document_series?: string;
    supplier_document_number?: string;
    subtotal_amount: number | string;
    tax_amount: number | string;
    total_amount: number;
    currency_code: string;
    status: string;
    sync_status?: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
    lines?: Array<{
        product_name?: string;
        internal_code?: string;
        quantity: number;
        unit_cost?: number;
        line_total?: number;
    }>;
    raw_offline_data?: LocalOfflinePurchase;
    document_file?: LocalOfflinePurchase['document_file'];
    document_file_path?: string | null;
}

export function useMergedPurchases(serverPurchases: any, branchId?: number | string) {
    const rawOfflinePurchases = useLiveQuery(async () => {
        try {
            return await db.offlinePurchases
                .filter(p => p.sync_status !== 'SYNCED')
                .reverse()
                .sortBy('created_at');
        } catch {
            return [];
        }
    }, []) || [];

    const serverList = useMemo<any[]>(() => {
        if (!serverPurchases) return [];
        return Array.isArray(serverPurchases) ? serverPurchases : (serverPurchases.data || []);
    }, [serverPurchases]);

    const serverUuids = useMemo(() => {
        const set = new Set<string>();
        for (const p of serverList) {
            if (p.uuid) set.add(p.uuid);
            if (p.purchase_number) set.add(p.purchase_number);
        }
        return set;
    }, [serverList]);

    const activeOfflinePurchases = useMemo(() => {
        return rawOfflinePurchases.filter(p => {
            if (serverUuids.has(p.uuid) || serverUuids.has(p.temp_purchase_number)) {
                return false;
            }
            if (branchId && branchId !== 'ALL' && p.branch_id && Number(p.branch_id) !== Number(branchId)) {
                return false;
            }
            return true;
        });
    }, [rawOfflinePurchases, serverUuids, branchId]);

    const mergedPurchases = useMemo<MergedPurchaseItem[]>(() => {
        const mappedOffline: MergedPurchaseItem[] = activeOfflinePurchases.map(p => {
            const subtotal = p.total_amount > 0 ? (p.total_amount / 1.18) : 0;
            const tax = p.total_amount - subtotal;

            return {
                id: `offline-${p.uuid}`,
                uuid: p.uuid,
                is_offline: true,
                document_date: p.document_date,
                created_at: p.created_at,
                purchase_number: p.temp_purchase_number,
                supplier_name: p.supplier_name,
                supplier: { legal_name: p.supplier_name, trade_name: p.supplier_name },
                supplier_document_type: p.supplier_document_type || 'GUIA',
                supplier_document_series: p.supplier_document_series || 'OFFLINE',
                supplier_document_number: p.supplier_document_number || p.temp_purchase_number,
                subtotal_amount: subtotal.toFixed(2),
                tax_amount: tax.toFixed(2),
                total_amount: p.total_amount,
                currency_code: p.currency_code || 'PEN',
                status: p.action === 'DRAFT' ? 'DRAFT_LOCAL' : 'PENDING_SYNC',
                sync_status: p.sync_status,
                document_file: p.document_file,
                document_file_path: p.document_file ? 'offline' : null,
                lines: p.lines,
                raw_offline_data: p,
            };
        });

        return [...mappedOffline, ...serverList];
    }, [activeOfflinePurchases, serverList]);

    const pendingCount = activeOfflinePurchases.length;
    const pendingTotal = activeOfflinePurchases.reduce((acc, p) => acc + (p.total_amount || 0), 0);

    const handleDiscard = async (purchaseUuid: string) => {
        try {
            await discardOfflinePurchase(purchaseUuid);
            toast.success('Compra offline descartada y stock local restablecido');
        } catch (err: any) {
            toast.error(`Error al descartar la compra offline: ${err.message}`);
        }
    };

    return {
        mergedPurchases,
        pendingOfflineCount: pendingCount,
        pendingOfflineTotal: pendingTotal,
        discardOfflinePurchase: handleDiscard,
    };
}
