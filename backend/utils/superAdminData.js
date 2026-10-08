/**
 * Read-only data access for the super admin console: every business dataset
 * of every store, in MongoDB or Firestore. The DATASETS registry is the single
 * source the console renders from (sidebar, tiles, table columns, search).
 *
 * Scope: one store (ownerId) or every store (ownerId null). Store-owned kinds
 * include the owner's records and all of their staff logins' records.
 */
const { db } = require('../config/firebase');
const models = require('../models/mongodb');
const platformStore = require('./platformStore');
const { listStoreRecords, countStoreRecords } = require('./storeRecords');

const isMongo = () => (process.env.DB_TYPE || 'mongodb') === 'mongodb';
const tenantRoot = () => db.collection('SwordNexBillingSoftware').doc(process.env.TENANT_ID);

const num = (v) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v));
const first = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

// Column types understood by the console: text, date, datetime, money, status, bool, count, store.
const STORE_COL = { field: '_storeName', label: 'Store', type: 'store' };

const DATASETS = [
    // ---------------------------------------------------------------- Platform
    {
        key: 'staff', label: 'Staff logins', group: 'Platform', source: 'staff',
        search: ['firstName', 'lastName', 'email', 'branch', 'employee_id'],
        columns: [STORE_COL, { field: '_name', label: 'Name' }, { field: 'email', label: 'Email' }, { field: 'branch', label: 'Branch' },
            { field: 'status', label: 'Status', type: 'status' }, { field: 'lastLogin', label: 'Last login', type: 'datetime' },
            { field: 'createdAt', label: 'Created', type: 'date' }],
        derive: (r) => ({ _name: `${r.firstName || ''} ${r.lastName || ''}`.trim() })
    },
    {
        key: 'subscriptions', label: 'Subscription payments', group: 'Platform', kind: 'subscriptiondetails',
        search: ['plan', 'billingCycle', 'paymentId', 'orderId'],
        columns: [STORE_COL, { field: 'plan', label: 'Plan', type: 'status' }, { field: 'billingCycle', label: 'Cycle' },
            { field: 'amount', label: 'Amount', type: 'money' }, { field: 'paymentId', label: 'Payment ID' },
            { field: 'startDate', label: 'Starts', type: 'date' }, { field: 'endDate', label: 'Ends', type: 'date' },
            { field: 'createdAt', label: 'Paid on', type: 'datetime' }]
    },
    {
        key: 'duesPayments', label: 'Online dues payments', group: 'Platform', source: 'payments',
        search: ['customerName', 'orderId', 'paymentId', 'payerEmail', 'payerContact'],
        columns: [STORE_COL, { field: 'customerName', label: 'Customer' }, { field: 'amount', label: 'Amount', type: 'money' },
            { field: 'status', label: 'Status', type: 'status' }, { field: 'method', label: 'Method' },
            { field: 'paymentId', label: 'Payment ID' }, { field: 'createdAt', label: 'Created', type: 'datetime' }]
    },

    // ------------------------------------------------------------------- Sales
    {
        key: 'bills', label: 'POS bills', group: 'Sales', kind: 'bills',
        search: ['receiptNo', 'invoiceNo', 'customerName', 'customerPhone', 'customerMobile', 'paymentMethod'],
        columns: [STORE_COL, { field: '_number', label: 'Bill no.' }, { field: '_customer', label: 'Customer' },
            { field: '_phone', label: 'Phone' }, { field: 'items', label: 'Items', type: 'count' },
            { field: '_total', label: 'Total', type: 'money' }, { field: 'paymentMethod', label: 'Payment', type: 'status' },
            { field: 'createdAt', label: 'Date', type: 'datetime' }],
        derive: (r) => ({
            _number: first(r.receiptNo, r.invoiceNo, r.invoiceNumber),
            _customer: first(r.customerName, 'Walk-in'),
            _phone: first(r.customerPhone, r.customerMobile),
            _total: num(first(r.totals?.grandTotal, r.grandTotal, r.total))
        })
    },
    {
        key: 'gstBills', label: 'GST invoices', group: 'Sales', kind: 'gstBills',
        search: ['invoiceNo', 'billNumber', 'invoiceNumber', 'customerName', 'customerGstin', 'customerMobile'],
        columns: [STORE_COL, { field: '_number', label: 'Invoice no.' }, { field: 'customerName', label: 'Customer' },
            { field: 'customerGstin', label: 'GSTIN' }, { field: '_tax', label: 'Tax', type: 'money' },
            { field: '_total', label: 'Total', type: 'money' }, { field: 'createdAt', label: 'Date', type: 'datetime' }],
        derive: (r) => ({
            _number: first(r.invoiceNo, r.billNumber, r.invoiceNumber),
            _tax: num(first(r.totalTax, r.totals?.totalTax, r.totals?.gst)),
            _total: num(first(r.grandTotal, r.totals?.grandTotal, r.total))
        })
    },
    {
        key: 'credit', label: 'Dues & credit', group: 'Sales', kind: 'credit_customers',
        search: ['name', 'customerName', 'phone', 'mobile', 'status'],
        columns: [STORE_COL, { field: '_customer', label: 'Customer' }, { field: '_phone', label: 'Phone' },
            { field: '_total', label: 'Total', type: 'money' }, { field: '_paid', label: 'Paid', type: 'money' },
            { field: 'balance', label: 'Balance', type: 'money' }, { field: 'createdAt', label: 'Date', type: 'datetime' }],
        derive: (r) => ({
            _customer: first(r.name, r.customerName),
            _phone: first(r.phone, r.mobile),
            _total: num(first(r.total, r.totalCredit, r.amount)),
            _paid: num(first(r.credit, r.paidAmount))
        })
    },
    {
        key: 'returns', label: 'Returns', group: 'Sales', kind: 'inventory_returns',
        search: ['type', 'customerName', 'salesInvoiceNo', 'purchaseInvoiceNo', 'reason'],
        columns: [STORE_COL, { field: 'type', label: 'Type', type: 'status' }, { field: '_ref', label: 'Invoice' },
            { field: 'customerName', label: 'Customer' }, { field: 'items', label: 'Items', type: 'count' },
            { field: 'reason', label: 'Reason' }, { field: 'createdAt', label: 'Date', type: 'datetime' }],
        derive: (r) => ({ _ref: first(r.salesInvoiceNo, r.purchaseInvoiceNo) })
    },

    // --------------------------------------------------------------- Inventory
    {
        key: 'products', label: 'Products', group: 'Inventory', kind: 'products',
        search: ['name', 'category', 'barcode', 'imei1', 'brand', 'hsn'],
        columns: [STORE_COL, { field: 'name', label: 'Product' }, { field: 'category', label: 'Category' },
            { field: 'price', label: 'Price', type: 'money' }, { field: 'quantity', label: 'Stock' },
            { field: 'barcode', label: 'Barcode' }, { field: 'createdAt', label: 'Added', type: 'date' }]
    },
    {
        key: 'suppliers', label: 'Suppliers', group: 'Inventory', kind: 'suppliers',
        search: ['name', 'company', 'mobile', 'email', 'gst'],
        columns: [STORE_COL, { field: 'name', label: 'Name' }, { field: 'company', label: 'Company' },
            { field: 'mobile', label: 'Mobile' }, { field: 'gst', label: 'GST' }, { field: 'createdAt', label: 'Added', type: 'date' }]
    },

    // --------------------------------------------------------------- Customers
    {
        key: 'customers', label: 'Customers', group: 'Customers', kind: 'customers',
        search: ['name', 'mobile', 'email', 'gstin'],
        columns: [STORE_COL, { field: 'name', label: 'Name' }, { field: 'mobile', label: 'Mobile' },
            { field: 'email', label: 'Email' }, { field: 'loyaltyPoints', label: 'Points' },
            { field: 'createdAt', label: 'Added', type: 'date' }]
    },
    {
        key: 'clients', label: 'Clients', group: 'Customers', kind: 'clients',
        search: ['companyName', 'name', 'contactPerson', 'email', 'mobile', 'projectName'],
        columns: [STORE_COL, { field: '_name', label: 'Client' }, { field: 'contactPerson', label: 'Contact' },
            { field: 'mobile', label: 'Mobile' }, { field: 'projectName', label: 'Project' },
            { field: 'createdAt', label: 'Added', type: 'date' }],
        derive: (r) => ({ _name: first(r.companyName, r.name) })
    },
    {
        key: 'pets', label: 'Pets', group: 'Customers', kind: 'pets',
        search: ['petName', 'customerName', 'customerPhone', 'species', 'breed'],
        columns: [STORE_COL, { field: 'petName', label: 'Pet' }, { field: 'species', label: 'Species' },
            { field: 'breed', label: 'Breed' }, { field: 'customerName', label: 'Owner' },
            { field: 'createdAt', label: 'Added', type: 'date' }]
    },

    // ----------------------------------------------------------------- Finance
    {
        key: 'cashbook', label: 'Cash book', group: 'Finance', kind: 'transactions',
        search: ['type', 'category', 'description', 'reason', 'paymentMode'],
        columns: [STORE_COL, { field: 'type', label: 'Type', type: 'status' }, { field: 'category', label: 'Category' },
            { field: 'amount', label: 'Amount', type: 'money' }, { field: '_note', label: 'Description' },
            { field: 'createdAt', label: 'Date', type: 'datetime' }],
        derive: (r) => ({ _note: first(r.description, r.reason) })
    },

    // -------------------------------------------------------------- Operations
    {
        key: 'repairTickets', label: 'Repair tickets', group: 'Operations', kind: 'repairtickets',
        search: ['customerName', 'customerPhone', 'deviceBrand', 'deviceModel', 'imei', 'status', 'technician'],
        columns: [STORE_COL, { field: 'customerName', label: 'Customer' }, { field: '_device', label: 'Device' },
            { field: 'status', label: 'Status', type: 'status' }, { field: 'estimatedCost', label: 'Estimate', type: 'money' },
            { field: 'createdAt', label: 'Received', type: 'date' }],
        derive: (r) => ({ _device: [r.deviceBrand, r.deviceModel].filter(Boolean).join(' ') })
    },
    {
        key: 'milestones', label: 'Milestones', group: 'Operations', kind: 'milestones',
        search: ['title', 'clientName', 'status'],
        columns: [STORE_COL, { field: 'title', label: 'Title' }, { field: 'clientName', label: 'Client' },
            { field: 'status', label: 'Status', type: 'status' }, { field: 'amount', label: 'Amount', type: 'money' },
            { field: 'dueDate', label: 'Due', type: 'date' }]
    },
    {
        key: 'trainers', label: 'Trainers', group: 'Operations', kind: 'trainers',
        search: ['name', 'mobile', 'email', 'specialization', 'code'],
        columns: [STORE_COL, { field: 'name', label: 'Name' }, { field: 'specialization', label: 'Specialization' },
            { field: 'mobile', label: 'Mobile' }, { field: 'salary', label: 'Salary', type: 'money' },
            { field: 'createdAt', label: 'Added', type: 'date' }]
    },
    {
        key: 'salesmen', label: 'Salesmen', group: 'Operations', kind: 'salesmen',
        search: ['salesmanId', 'name', 'mobile', 'role', 'status'],
        columns: [STORE_COL, { field: 'salesmanId', label: 'ID' }, { field: 'name', label: 'Name' },
            { field: 'mobile', label: 'Mobile' }, { field: 'status', label: 'Status', type: 'status' },
            { field: 'createdAt', label: 'Added', type: 'date' }]
    }
];

const DATASET_MAP = Object.fromEntries(DATASETS.map((d) => [d.key, d]));

// ------------------------------------------------------------------ secrets
// Never sent to the browser, even to the super admin.
const SECRET_KEYS = new Set(['password', 'payToken', 'signature', 'verificationToken', 'resetToken', 'otp', 'otpHash']);

function sanitize(value) {
    if (Array.isArray(value)) return value.map(sanitize);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (SECRET_KEYS.has(k) || /password|secret/i.test(k) || k === '__v') continue;
            out[k] = sanitize(v);
        }
        return out;
    }
    return value;
}

// ------------------------------------------------------------------ owners
const ownerId = (o) => o.userId || String(o._id);
const storeName = (o) => o?.companyDetails?.name || o?.email || 'Unnamed store';

async function ownersInScope(scopeOwnerId) {
    if (scopeOwnerId) {
        const owner = await platformStore.getOwner(scopeOwnerId);
        return owner ? [owner] : [];
    }
    return platformStore.listOwners();
}

// ------------------------------------------------------------------ loaders
async function loadPayments(oid) {
    if (isMongo()) return (await models.Payment.find({ ownerId: oid }).lean()).map((p) => ({ ...p, _id: String(p._id) }));
    const snap = await tenantRoot().collection('payments').where('ownerId', '==', oid).get();
    return snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
}

async function loadForOwner(ds, owner) {
    const oid = ownerId(owner);
    switch (ds.source) {
        case 'staff': return platformStore.listSubUsers(oid);
        case 'payments': return loadPayments(oid);
        default: return listStoreRecords(oid, ds.kind);
    }
}

async function countForOwner(ds, owner) {
    if (ds.kind) return countStoreRecords(ownerId(owner), [ds.kind]);
    return (await loadForOwner(ds, owner)).length;
}

const dateOf = (row, field) => String(row[field] || row.createdAt || row.date || '');

/**
 * One page of a dataset, filtered and sorted newest first.
 * search: case-insensitive match on the dataset's search fields.
 * from/to: 'YYYY-MM-DD' bounds on the record's date (inclusive).
 */
async function queryDataset(key, { ownerId: scopeOwnerId, search, from, to, page = 1, limit = 25 }) {
    const ds = DATASET_MAP[key];
    if (!ds) return null;

    const owners = await ownersInScope(scopeOwnerId);
    const perOwner = await Promise.all(owners.map(async (owner) => {
        const rows = await loadForOwner(ds, owner);
        return rows.map((r) => ({ ...r, ...(ds.derive ? ds.derive(r) : {}), _storeId: ownerId(owner), _storeName: storeName(owner) }));
    }));
    let rows = perOwner.flat();

    const q = String(search || '').trim().toLowerCase();
    if (q) {
        rows = rows.filter((r) => [...ds.search, '_storeName'].some((f) => String(r[f] ?? '').toLowerCase().includes(q)));
    }
    if (from) rows = rows.filter((r) => dateOf(r, ds.dateField).slice(0, 10) >= from);
    if (to) rows = rows.filter((r) => dateOf(r, ds.dateField).slice(0, 10) <= to);

    rows.sort((a, b) => dateOf(b, ds.dateField).localeCompare(dateOf(a, ds.dateField)));

    const start = (Math.max(1, page) - 1) * limit;
    return { total: rows.length, rows: sanitize(rows.slice(start, start + limit)) };
}

/** The registry (without functions) plus a record count per dataset for the scope. */
async function listDatasets(scopeOwnerId) {
    const owners = await ownersInScope(scopeOwnerId);
    return Promise.all(DATASETS.map(async (ds) => {
        const counts = await Promise.all(owners.map((o) => countForOwner(ds, o).catch(() => 0)));
        const { derive, kind, source, ...meta } = ds;
        return { ...meta, count: counts.reduce((a, b) => a + b, 0) };
    }));
}

module.exports = { DATASETS, queryDataset, listDatasets, sanitize, ownerId, storeName };
