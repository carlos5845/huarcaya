import Dexie, { type EntityTable } from 'dexie';

export interface LocalProduct {
    id: number;
    uuid: string;
    name: string;
    primary_reference: string | null;
    barcode: string | null;
    sale_price: number;
    cost_price: number;
    product_type: string;
    unit_code: string;
    category_name: string | null;
    brand_name: string | null;
    local_stock: number;
    branch_id: number;
}

export interface LocalCustomer {
    id: number | string;
    uuid: string;
    document_type: string;
    document_number: string;
    legal_name: string;
    phone: string | null;
    email: string | null;
    is_offline?: boolean;
}

export interface LocalPaymentMethod {
    id: number;
    name: string;
    code: string;
    is_cash: boolean;
}

export interface LocalOfflineSale {
    id?: number;
    uuid: string;
    sale_number: string;
    branch_id: number;
    customer_id: number | string;
    customer_name: string;
    total_amount: number;
    operation_date: string;
    payment_type: 'CASH' | 'CREDIT';
    payment_status: 'PAID' | 'UNPAID' | 'PARTIAL';
    action?: 'CONFIRM' | 'DRAFT';
    sync_status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
    lines: Array<{
        product_id: number;
        product_name: string;
        quantity: number;
        unit_price: number;
        line_total: number;
    }>;
    created_at: string;
}

export interface LocalOfflinePurchase {
    id?: number;
    uuid: string;
    temp_purchase_number: string;
    branch_id: number;
    supplier_id: number | string;
    supplier_name: string;
    supplier_document_type?: string;
    supplier_document_series?: string;
    supplier_document_number?: string;
    document_date: string;
    total_amount: number;
    currency_code: string;
    action: 'DRAFT' | 'CONFIRM';
    sync_status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
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
        line_total: number;
    }>;
    created_at: string;
}

export interface SyncQueueItem {
    id?: number;
    uuid: string;
    entity_type: 'SALE' | 'PURCHASE' | 'PAYMENT' | 'CUSTOMER' | string;
    operation_type: 'CREATE' | 'UPDATE';
    payload: any;
    status: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED';
    retry_count: number;
    error_message?: string;
    client_timestamp: string;
}

// Define the Dexie Database
class SimaqLocalDB extends Dexie {
    products!: EntityTable<LocalProduct, 'id'>;
    customers!: EntityTable<LocalCustomer, 'id'>;
    paymentMethods!: EntityTable<LocalPaymentMethod, 'id'>;
    offlineSales!: EntityTable<LocalOfflineSale, 'id'>;
    offlinePurchases!: EntityTable<LocalOfflinePurchase, 'id'>;
    syncQueue!: EntityTable<SyncQueueItem, 'id'>;

    constructor() {
        super('SimaqLocalDB');
        this.version(1).stores({
            products: 'id, uuid, name, primary_reference, barcode, branch_id',
            customers: 'id, uuid, document_number, legal_name',
            paymentMethods: 'id, code',
            offlineSales: '++id, uuid, sale_number, branch_id, sync_status, created_at',
            syncQueue: '++id, uuid, entity_type, operation_type, status, client_timestamp',
        });
        this.version(2).stores({
            offlinePurchases: '++id, uuid, temp_purchase_number, branch_id, sync_status, created_at',
        });
    }
}

export const db = new SimaqLocalDB();

