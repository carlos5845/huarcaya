import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalOfflineSale } from '@/lib/db';
import { discardOfflineSale } from '@/services/sync-service';
import { toast } from 'sonner';

export interface MergedSaleItem {
    id: number | string;
    uuid?: string;
    is_offline?: boolean;
    created_at: string;
    customer_name_snapshot: string;
    customer?: { id?: number | string; legal_name: string };
    sale_type: string;
    payment_type: 'CASH' | 'CREDIT';
    external_document_series?: string;
    external_document_number?: string;
    subtotal_amount: number | string;
    tax_amount: number | string;
    currency_code: string;
    total_amount: number;
    status: string;
    sync_status?: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
    lines?: Array<{
        product_name_snapshot?: string;
        product?: { name: string };
        quantity: number;
        unit_price?: number;
        line_total?: number;
    }>;
    raw_offline_data?: LocalOfflineSale;
}

export function useMergedSales(serverSales: any, branchId?: number | string) {
    const rawOfflineSales = useLiveQuery(async () => {
        try {
            return await db.offlineSales
                .filter(s => s.sync_status !== 'SYNCED')
                .reverse()
                .sortBy('created_at');
        } catch {
            return [];
        }
    }, []) || [];

    const serverList = useMemo<any[]>(() => {
        if (!serverSales) return [];
        return Array.isArray(serverSales) ? serverSales : (serverSales.data || []);
    }, [serverSales]);

    const serverUuids = useMemo(() => {
        const set = new Set<string>();
        for (const s of serverList) {
            if (s.uuid) set.add(s.uuid);
            if (s.external_document_number) set.add(s.external_document_number);
        }
        return set;
    }, [serverList]);

    const activeOfflineSales = useMemo(() => {
        return rawOfflineSales.filter(s => {
            if (serverUuids.has(s.uuid) || serverUuids.has(s.sale_number)) {
                return false;
            }
            if (branchId && branchId !== 'ALL' && s.branch_id && Number(s.branch_id) !== Number(branchId)) {
                return false;
            }
            return true;
        });
    }, [rawOfflineSales, serverUuids, branchId]);

    const mergedSales = useMemo<MergedSaleItem[]>(() => {
        const mappedOffline: MergedSaleItem[] = activeOfflineSales.map(s => {
            const subtotal = s.total_amount > 0 ? (s.total_amount / 1.18) : 0;
            const tax = s.total_amount - subtotal;

            return {
                id: `offline-${s.uuid}`,
                uuid: s.uuid,
                is_offline: true,
                created_at: s.created_at,
                customer_name_snapshot: s.customer_name,
                customer: { legal_name: s.customer_name },
                sale_type: 'VENTA',
                payment_type: s.payment_type,
                external_document_series: 'OFFLINE',
                external_document_number: s.sale_number,
                subtotal_amount: subtotal.toFixed(2),
                tax_amount: tax.toFixed(2),
                currency_code: 'PEN',
                total_amount: s.total_amount,
                status: s.action === 'DRAFT' ? 'DRAFT_LOCAL' : 'PENDING_SYNC',
                sync_status: s.sync_status,
                lines: s.lines.map(l => ({
                    product_name_snapshot: l.product_name,
                    quantity: l.quantity,
                    unit_price: l.unit_price,
                    line_total: l.line_total,
                })),
                raw_offline_data: s,
            };
        });

        return [...mappedOffline, ...serverList];
    }, [activeOfflineSales, serverList]);

    const pendingCount = activeOfflineSales.length;
    const pendingTotal = activeOfflineSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);

    const handleDiscard = async (saleUuid: string) => {
        try {
            await discardOfflineSale(saleUuid);
            toast.success('Venta offline descartada y stock local restablecido');
        } catch (err: any) {
            toast.error(`Error al descartar la venta offline: ${err.message}`);
        }
    };

    return {
        mergedSales,
        pendingOfflineCount: pendingCount,
        pendingOfflineTotal: pendingTotal,
        discardOfflineSale: handleDiscard,
    };
}
