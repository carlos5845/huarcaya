import { db, type LocalOfflineSale, type LocalOfflinePurchase, type SyncQueueItem } from '@/lib/db';
import { normalizeSearch } from '@/lib/utils';

export interface CatalogDownloadResult {
    productsCount: number;
    customersCount: number;
    paymentMethodsCount: number;
    branch?: { id: number; name: string; code?: string };
}

export interface SyncBatchResult {
    syncedCount: number;
    failedCount: number;
    results: Array<{
        uuid: string;
        status: 'SUCCESS' | 'CONFLICT' | 'FAILED';
        server_id?: number;
        sale_number?: string;
        message?: string;
    }>;
}

/**
 * Helper to extract the XSRF token from document cookies.
 */
function getCsrfToken(): string {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(new RegExp('(^|;\\s*)XSRF-TOKEN=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : '';
}

/**
 * Downloads full catalog and branch inventory to store in IndexedDB.
 */
export async function downloadCatalog(branchId?: number): Promise<CatalogDownloadResult> {
    const url = branchId ? `/api/v1/sync/catalog?branch_id=${branchId}` : '/api/v1/sync/catalog';
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error(`Error descargando catálogo (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();

    // Store in IndexedDB
    await db.transaction('rw', [db.products, db.customers, db.paymentMethods], async () => {
        if (data.products && Array.isArray(data.products)) {
            await db.products.clear();
            await db.products.bulkPut(data.products.map((p: any) => ({
                ...p,
                branch_id: data.branch?.id ?? 0,
            })));
        }

        if (data.customers && Array.isArray(data.customers)) {
            await db.customers.clear();
            await db.customers.bulkPut(data.customers);
        }

        if (data.payment_methods && Array.isArray(data.payment_methods)) {
            await db.paymentMethods.clear();
            await db.paymentMethods.bulkPut(data.payment_methods);
        }
    });

    return {
        productsCount: data.products?.length ?? 0,
        customersCount: data.customers?.length ?? 0,
        paymentMethodsCount: data.payment_methods?.length ?? 0,
        branch: data.branch,
    };
}

/**
 * Enqueue an offline sale into Dexie and prepare it for background synchronization.
 */
export async function enqueueOfflineSale(payload: {
    customer_id: number | string;
    customer_name: string;
    sale_type: string;
    payment_type: 'CASH' | 'CREDIT';
    payment_method_id: number | null;
    operation_date: string;
    due_date?: string | null;
    initial_payment_amount?: number;
    notes?: string;
    tax_mode: string;
    currency_code: string;
    exchange_rate: number;
    action?: 'CONFIRM' | 'DRAFT';
    branch_id: number;
    lines: Array<{
        product_id: number;
        product_name: string;
        internal_code?: string;
        quantity: number;
        unit_price: number;
    }>;
}): Promise<{ saleUuid: string; tempSaleNumber: string }> {
    const saleUuid = crypto.randomUUID();
    const syncOpUuid = crypto.randomUUID();
    const tempSaleNumber = `OFFLINE-${Date.now().toString().slice(-6)}`;
    const totalAmount = payload.lines.reduce((acc, line) => acc + (line.quantity * line.unit_price), 0);
    const action = payload.action || 'CONFIRM';

    const offlineSale: LocalOfflineSale = {
        uuid: saleUuid,
        sale_number: tempSaleNumber,
        branch_id: payload.branch_id,
        customer_id: payload.customer_id,
        customer_name: payload.customer_name,
        total_amount: totalAmount,
        operation_date: payload.operation_date,
        payment_type: payload.payment_type,
        payment_status: payload.payment_type === 'CASH' ? 'PAID' : 'UNPAID',
        action: action,
        sync_status: 'PENDING',
        lines: payload.lines.map(l => ({
            product_id: l.product_id,
            product_name: l.product_name,
            quantity: l.quantity,
            unit_price: l.unit_price,
            line_total: l.quantity * l.unit_price,
        })),
        created_at: new Date().toISOString(),
    };

    const syncItem: SyncQueueItem = {
        uuid: syncOpUuid,
        entity_type: 'SALE',
        operation_type: 'CREATE',
        payload: {
            ...payload,
            action,
            uuid: saleUuid,
            temp_sale_number: tempSaleNumber,
        },
        status: 'PENDING',
        retry_count: 0,
        client_timestamp: new Date().toISOString(),
    };

    // Save transactionally in Dexie and deduct local stock if confirmed
    await db.transaction('rw', [db.offlineSales, db.syncQueue, db.products], async () => {
        await db.offlineSales.add(offlineSale);
        await db.syncQueue.add(syncItem);

        // Deduct local stock in Dexie to avoid local over-selling
        if (action === 'CONFIRM') {
            for (const line of payload.lines) {
                const product = await db.products.get(line.product_id);
                if (product) {
                    const newStock = Math.max(0, (product.local_stock || 0) - line.quantity);
                    await db.products.update(line.product_id, { local_stock: newStock });
                }
            }
        }
    });

    return { saleUuid, tempSaleNumber };
}

/**
 * Enqueue an offline purchase into Dexie and prepare it for background synchronization.
 */
export async function enqueueOfflinePurchase(payload: {
    supplier_id: number | string;
    supplier_name?: string;
    supplier_document_type?: string;
    supplier_document_series?: string;
    supplier_document_number?: string;
    document_date: string;
    notes?: string;
    tax_mode: string;
    currency_code: string;
    exchange_rate: number;
    action?: 'DRAFT' | 'CONFIRM';
    branch_id: number;
    document_file?: {
        name: string;
        type: string;
        size: number;
        base64: string;
    } | null;
    lines: Array<{
        product_id: number;
        product_name: string;
        internal_code?: string;
        quantity: number;
        unit_cost: number;
    }>;
}): Promise<{ purchaseUuid: string; tempPurchaseNumber: string }> {
    const purchaseUuid = crypto.randomUUID();
    const syncOpUuid = crypto.randomUUID();
    const tempPurchaseNumber = `COMPRA-OFFLINE-${Date.now().toString().slice(-6)}`;
    const totalAmount = payload.lines.reduce((acc, line) => acc + (line.quantity * line.unit_cost), 0);
    const action = payload.action || 'CONFIRM';

    const offlinePurchase: LocalOfflinePurchase = {
        uuid: purchaseUuid,
        temp_purchase_number: tempPurchaseNumber,
        branch_id: payload.branch_id,
        supplier_id: payload.supplier_id,
        supplier_name: payload.supplier_name || 'Proveedor Contingencia',
        supplier_document_type: payload.supplier_document_type,
        supplier_document_series: payload.supplier_document_series,
        supplier_document_number: payload.supplier_document_number,
        document_date: payload.document_date,
        total_amount: totalAmount,
        currency_code: payload.currency_code || 'PEN',
        action: action,
        sync_status: 'PENDING',
        document_file: payload.document_file || null,
        lines: payload.lines.map(l => ({
            product_id: l.product_id,
            product_name: l.product_name,
            internal_code: l.internal_code,
            quantity: l.quantity,
            unit_cost: l.unit_cost,
            line_total: l.quantity * l.unit_cost,
        })),
        created_at: new Date().toISOString(),
    };

    const syncItem: SyncQueueItem = {
        uuid: syncOpUuid,
        entity_type: 'PURCHASE',
        operation_type: 'CREATE',
        payload: {
            ...payload,
            action,
            uuid: purchaseUuid,
            temp_purchase_number: tempPurchaseNumber,
            document_file: payload.document_file || null,
        },
        status: 'PENDING',
        retry_count: 0,
        client_timestamp: new Date().toISOString(),
    };

    // Save transactionally in Dexie and increment local stock if confirmed
    await db.transaction('rw', [db.offlinePurchases, db.syncQueue, db.products], async () => {
        await db.offlinePurchases.add(offlinePurchase);
        await db.syncQueue.add(syncItem);

        if (action === 'CONFIRM') {
            for (const line of payload.lines) {
                const product = await db.products.get(line.product_id);
                if (product) {
                    const newStock = (product.local_stock || 0) + line.quantity;
                    await db.products.update(line.product_id, { local_stock: newStock });
                }
            }
        }
    });

    return { purchaseUuid, tempPurchaseNumber };
}

/**
 * Discard an offline sale from Dexie and sync queue, restoring deducted local stock.
 */
export async function discardOfflineSale(saleUuid: string): Promise<boolean> {
    const sale = await db.offlineSales.where('uuid').equals(saleUuid).first();
    if (!sale) return false;

    await db.transaction('rw', [db.offlineSales, db.syncQueue, db.products], async () => {
        // Restore stock in local products if it was confirmed (deducted)
        if (sale.action !== 'DRAFT') {
            for (const line of sale.lines) {
                const product = await db.products.get(line.product_id);
                if (product) {
                    await db.products.update(line.product_id, {
                        local_stock: (product.local_stock || 0) + line.quantity,
                    });
                }
            }
        }
        // Remove from offlineSales
        await db.offlineSales.where('uuid').equals(saleUuid).delete();
        // Remove from syncQueue
        const queueItems = await db.syncQueue.toArray();
        const itemToDelete = queueItems.find(q => q.payload?.uuid === saleUuid);
        if (itemToDelete?.id) {
            await db.syncQueue.delete(itemToDelete.id);
        }
    });

    return true;
}

/**
 * Discard an offline purchase from Dexie and sync queue, reverting added local stock.
 */
export async function discardOfflinePurchase(purchaseUuid: string): Promise<boolean> {
    const purchase = await db.offlinePurchases.where('uuid').equals(purchaseUuid).first();
    if (!purchase) return false;

    await db.transaction('rw', [db.offlinePurchases, db.syncQueue, db.products], async () => {
        // Revert stock if it was confirmed
        if (purchase.action === 'CONFIRM') {
            for (const line of purchase.lines) {
                const product = await db.products.get(line.product_id);
                if (product) {
                    await db.products.update(line.product_id, {
                        local_stock: Math.max(0, (product.local_stock || 0) - line.quantity),
                    });
                }
            }
        }
        // Remove from offlinePurchases
        await db.offlinePurchases.where('uuid').equals(purchaseUuid).delete();
        // Remove from syncQueue
        const queueItems = await db.syncQueue.toArray();
        const itemToDelete = queueItems.find(q => q.payload?.uuid === purchaseUuid);
        if (itemToDelete?.id) {
            await db.syncQueue.delete(itemToDelete.id);
        }
    });

    return true;
}


/**
 * Synchronize all pending operations to the server batch endpoint.
 */
export async function syncPendingOperations(branchId?: number): Promise<SyncBatchResult> {
    const pendingOps = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .toArray();

    if (pendingOps.length === 0) {
        return { syncedCount: 0, failedCount: 0, results: [] };
    }

    // Mark as SYNCING locally
    const ids = pendingOps.map(op => op.id!).filter(Boolean);
    await db.syncQueue.where('id').anyOf(ids).modify({ status: 'SYNCING' });

    // Prepare payload formatted for Laravel SyncController
    const operationsPayload = pendingOps.map(op => ({
        uuid: op.uuid,
        entity_type: op.entity_type === 'SALE' ? 'Sale' : op.entity_type === 'PURCHASE' ? 'Purchase' : op.entity_type === 'CUSTOMER' ? 'Customer' : op.entity_type,
        operation_type: op.operation_type,
        payload: op.payload,
        client_timestamp: op.client_timestamp,
    }));

    try {
        const response = await fetch('/api/v1/sync/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': getCsrfToken(),
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                branch_id: branchId,
                operations: operationsPayload,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error en sincronización (${response.status}): ${response.statusText}`);
        }

        const data = await response.json();
        const results = data.results || [];

        let syncedCount = 0;
        let failedCount = 0;

        await db.transaction('rw', [db.syncQueue, db.offlineSales, db.offlinePurchases], async () => {
            for (const res of results) {
                const queueItem = pendingOps.find(op => op.uuid === res.uuid);
                if (!queueItem) continue;

                if (res.status === 'SUCCESS') {
                    syncedCount++;
                    await db.syncQueue.where('uuid').equals(res.uuid).modify({
                        status: 'SYNCED',
                    });

                    // Also mark offlineSale
                    const saleUuid = queueItem.payload?.uuid;
                    if (saleUuid) {
                        await db.offlineSales.where('uuid').equals(saleUuid).modify({
                            sync_status: 'SYNCED',
                            sale_number: res.sale_number || queueItem.payload.temp_sale_number,
                        });
                    }

                    // Also mark offlinePurchase
                    const purchaseUuid = queueItem.payload?.uuid;
                    if (purchaseUuid) {
                        await db.offlinePurchases.where('uuid').equals(purchaseUuid).modify({
                            sync_status: 'SYNCED',
                            temp_purchase_number: res.sale_number || queueItem.payload.temp_purchase_number,
                        });
                    }
                } else {
                    failedCount++;
                    await db.syncQueue.where('uuid').equals(res.uuid).modify({
                        status: 'FAILED',
                        error_message: res.message,
                        retry_count: queueItem.retry_count + 1,
                    });
                }
            }
        });

        // Fire custom window event so reactive UI components know sync finished
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('simaq:sync-finished', { detail: { syncedCount, failedCount } }));
        }

        return { syncedCount, failedCount, results };
    } catch (err: any) {
        // Rollback SYNCING status to PENDING
        await db.syncQueue.where('id').anyOf(ids).modify({
            status: 'PENDING',
            error_message: err.message,
        });
        throw err;
    }
}

/**
 * Searches products in local IndexedDB by name, reference code, barcode, brand, or category.
 * Uses accent-insensitive, case-insensitive, and tokenized multi-word search.
 */
export async function searchLocalProducts(query: string, branchId?: number): Promise<any[]> {
    if (!query || query.trim().length < 2) {
        return [];
    }

    const clean = normalizeSearch(query).trim();
    if (!clean) return [];

    const tokens = clean.split(/\s+/).filter(t => t.length > 0);

    return await db.products
        .filter(p => {
            const name = normalizeSearch(p.name);
            const ref = normalizeSearch(p.primary_reference);
            const barcode = normalizeSearch(p.barcode);
            const brand = normalizeSearch(p.brand_name);
            const category = normalizeSearch(p.category_name);

            // Strip special chars for reference codes (e.g. "FIL-001" -> "fil001")
            const cleanRef = ref.replace(/[^a-z0-9]/g, '');

            const haystack = `${name} ${ref} ${cleanRef} ${barcode} ${brand} ${category}`;

            const matchesAllTokens = tokens.every(token => {
                const cleanToken = token.replace(/[^a-z0-9]/g, '');
                return haystack.includes(token) || (cleanToken.length > 1 && haystack.includes(cleanToken));
            });

            if (!matchesAllTokens) return false;
            if (branchId && p.branch_id && p.branch_id > 0 && p.branch_id !== branchId) return false;

            return true;
        })
        .limit(20)
        .toArray();
}
