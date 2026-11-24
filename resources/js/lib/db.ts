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

export interface LocalSupplier {
    id: number | string;
    uuid: string;
    document_type: string;
    document_number: string;
    legal_name: string;
    trade_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    contact_name?: string | null;
    is_offline?: boolean;
}

export interface LocalBrand {
    id: number;
    uuid: string;
    code: string | null;
    name: string;
}

export interface LocalCategory {
    id: number;
    uuid: string;
    parent_id: number | null;
    code: string | null;
    name: string;
}

export interface LocalUnit {
    id: number;
    uuid: string;
    code: string;
    name: string;
    symbol: string | null;
    allows_decimals: boolean;
}

export interface LocalBranch {
    id: number;
    uuid: string;
    name: string;
    code: string | null;
    address: string | null;
    phone: string | null;
    type: string | null;
    invoice_series: string | null;
    boleta_series: string | null;
    ticket_series: string | null;
}

export interface LocalCompany {
    id: number;
    name: string;
    business_name: string | null;
    trade_name: string | null;
    document_type: string | null;
    document_number: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    ubigeo: string | null;
}

export interface LocalReceivable {
    id: number;
    uuid: string;
    branch_id: number;
    customer_id: number;
    customer_name: string;
    customer_document: string | null;
    sale_id: number | null;
    issue_date: string | null;
    due_date: string | null;
    currency_code: string;
    original_amount: number;
    balance_amount: number;
    status: string;
}

export interface LocalRecentSale {
    id: number;
    uuid: string;
    branch_id: number;
    customer_id: number | null;
    sale_number: string;
    sale_type: string;
    payment_type: string;
    payment_status: string;
    operation_date: string | null;
    currency_code: string;
    total_amount: number;
    status: string;
    customer_name: string;
    customer_document: string | null;
}

export interface LocalRecentPurchase {
    id: number;
    uuid: string;
    branch_id: number;
    supplier_id: number | null;
    supplier_name: string;
    purchase_number: string;
    supplier_document_type: string | null;
    supplier_document_series: string | null;
    supplier_document_number: string | null;
    document_date: string | null;
    currency_code: string;
    total_amount: number;
    status: string;
}

export interface LocalRecentQuotation {
    id: number;
    uuid: string;
    branch_id: number;
    customer_id: number | null;
    quotation_number: string;
    operation_date: string | null;
    valid_until_date: string | null;
    currency_code: string;
    total_amount: number;
    status: string;
    customer_name: string;
}

export interface LocalRecentTransfer {
    id: number;
    uuid: string;
    source_branch_id: number;
    destination_branch_id: number;
    transfer_number: string;
    request_date: string | null;
    status: string;
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
    suppliers!: EntityTable<LocalSupplier, 'id'>;
    brands!: EntityTable<LocalBrand, 'id'>;
    categories!: EntityTable<LocalCategory, 'id'>;
    units!: EntityTable<LocalUnit, 'id'>;
    branches!: EntityTable<LocalBranch, 'id'>;
    company!: EntityTable<LocalCompany, 'id'>;
    paymentMethods!: EntityTable<LocalPaymentMethod, 'id'>;
    receivables!: EntityTable<LocalReceivable, 'id'>;
    recentSales!: EntityTable<LocalRecentSale, 'id'>;
    recentPurchases!: EntityTable<LocalRecentPurchase, 'id'>;
    recentQuotations!: EntityTable<LocalRecentQuotation, 'id'>;
    recentTransfers!: EntityTable<LocalRecentTransfer, 'id'>;
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
        this.version(3).stores({
            suppliers: 'id, uuid, document_number, legal_name',
            brands: 'id, uuid, code, name',
            categories: 'id, uuid, parent_id, code, name',
            units: 'id, uuid, code, name',
            branches: 'id, uuid, code, name',
            company: 'id',
            receivables: 'id, uuid, branch_id, customer_id, status, due_date',
            recentSales: 'id, uuid, branch_id, customer_id, sale_number, status, operation_date',
            recentPurchases: 'id, uuid, branch_id, supplier_id, purchase_number, status, document_date',
            recentQuotations: 'id, uuid, branch_id, customer_id, quotation_number, status, operation_date',
            recentTransfers: 'id, uuid, source_branch_id, destination_branch_id, transfer_number, status',
        });
    }
}

export const db = new SimaqLocalDB();

