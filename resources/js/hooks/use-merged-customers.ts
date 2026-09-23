import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalCustomer } from '@/lib/db';

export function useMergedCustomers(serverCustomers: any[]) {
    const rawOfflineCustomers = useLiveQuery(async () => {
        try {
            return await db.customers
                .filter(c => !!c.is_offline)
                .toArray();
        } catch {
            return [];
        }
    }, []) || [];

    const serverList = useMemo<any[]>(() => {
        if (!serverCustomers) return [];
        return Array.isArray(serverCustomers) ? serverCustomers : (serverCustomers.data || []);
    }, [serverCustomers]);

    const serverDocumentNumbers = useMemo(() => {
        const set = new Set<string>();
        for (const c of serverList) {
            if (c.document_number) set.add(c.document_number);
        }
        return set;
    }, [serverList]);

    const activeOfflineCustomers = useMemo(() => {
        return rawOfflineCustomers.filter(c => !serverDocumentNumbers.has(c.document_number));
    }, [rawOfflineCustomers, serverDocumentNumbers]);

    const mergedCustomers = useMemo(() => {
        const mappedOffline = activeOfflineCustomers.map(c => ({
            id: c.id,
            uuid: c.uuid,
            document_type: c.document_type,
            document_number: c.document_number,
            legal_name: c.legal_name,
            trade_name: c.legal_name,
            phone: c.phone || '-',
            email: c.email || '-',
            address: '-',
            status: 'ACTIVE',
            is_offline: true,
            sync_status: 'PENDING',
        }));

        return [...mappedOffline, ...serverList];
    }, [activeOfflineCustomers, serverList]);

    return {
        mergedCustomers,
        pendingOfflineCount: activeOfflineCustomers.length,
    };
}
