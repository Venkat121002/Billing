const jwt = require('jsonwebtoken');
const { admin } = require('../config/firebase');
const store = require('../utils/platformStore');
const billDelivery = require('../utils/billDelivery');
const { VALID_INDUSTRIES } = require('../utils/industries');
const saData = require('../utils/superAdminData');
const { listStoreRecords, countStoreRecords } = require('../utils/storeRecords');

const DB_TYPE = process.env.DB_TYPE || 'mongodb';

// @desc    Super admin login (single hardcoded account via env vars)
// @route   POST /superadmin/login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ msg: 'Email and password are required' });
    }

    const adminEmail = process.env.SUPERADMIN_EMAIL;
    const adminPassword = process.env.SUPERADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.error('SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD are not set in the environment');
        return res.status(500).json({ msg: 'Super admin login is not configured' });
    }

    if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ msg: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { role: 'superadmin', email: adminEmail },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
    );

    res.json({ token, email: adminEmail });
};

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfTodayIST = () => new Date(`${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}T00:00:00.000+05:30`).toISOString();
const monthKey = (iso) => String(iso || '').slice(0, 7);
const billTotal = (b) => Number(b.totals?.grandTotal ?? b.grandTotal ?? b.total ?? 0) || 0;

// Summary row for one store, shared by the store list and the picker.
async function storeSummary(owner) {
    const oid = saData.ownerId(owner);
    const [staff, bills, products] = await Promise.all([
        store.listSubUsers(oid),
        countStoreRecords(oid, ['bills', 'gstBills']),
        countStoreRecords(oid, ['products'])
    ]);
    const sub = owner.subscription || {};
    return {
        id: oid,
        name: saData.storeName(owner),
        email: owner.email || '',
        mobile: owner.mobile || '',
        industry: owner.companyDetails?.industry || '',
        plan: sub.plan || 'none',
        status: sub.status || 'Inactive',
        endDate: sub.endDate || null,
        staff: staff.length,
        bills,
        products,
        lastLogin: owner.lastLogin || null,
        createdAt: owner.createdAt || null
    };
}

// @desc    Platform overview: KPIs, 12-month trends, plans, expiring plans, latest sign-ups/payments
// @route   GET /superadmin/overview
exports.getOverview = async (req, res) => {
    try {
        const [owners, subUsers, pendingSupport] = await Promise.all([
            store.listOwners(), store.listSubUsers(), store.countPendingSupportRequests()
        ]);
        const now = new Date();
        const thisMonth = monthKey(now.toISOString());
        const today = startOfTodayIST();

        const perStore = await Promise.all(owners.map(async (o) => {
            const oid = saData.ownerId(o);
            const [payments, billsToday] = await Promise.all([
                listStoreRecords(oid, 'subscriptiondetails'),
                listStoreRecords(oid, 'bills', { since: today })
            ]);
            return { owner: o, payments, billsToday };
        }));

        const months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        const trend = months.map((m) => ({ month: m, revenue: 0, signups: 0 }));
        const byMonth = Object.fromEntries(trend.map((t) => [t.month, t]));

        let revenueTotal = 0, revenueThisMonth = 0, paymentCount = 0, billsTodayCount = 0, salesToday = 0;
        const recentPayments = [];
        for (const { owner, payments, billsToday } of perStore) {
            if (byMonth[monthKey(owner.createdAt)]) byMonth[monthKey(owner.createdAt)].signups += 1;
            billsTodayCount += billsToday.length;
            salesToday += billsToday.reduce((s, b) => s + billTotal(b), 0);
            for (const p of payments) {
                const amount = Number(p.amount) || 0;
                revenueTotal += amount;
                paymentCount += 1;
                if (monthKey(p.createdAt) === thisMonth) revenueThisMonth += amount;
                if (byMonth[monthKey(p.createdAt)]) byMonth[monthKey(p.createdAt)].revenue += amount;
                recentPayments.push({
                    id: p._id, storeId: saData.ownerId(owner), storeName: saData.storeName(owner),
                    plan: p.plan, billingCycle: p.billingCycle, amount, paidAt: p.createdAt
                });
            }
        }
        recentPayments.sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)));

        const byPlan = {};
        const expiringSoon = [];
        for (const o of owners) {
            const plan = String(o.subscription?.plan || 'none').toLowerCase();
            byPlan[plan] = (byPlan[plan] || 0) + 1;
            const end = o.subscription?.endDate ? new Date(o.subscription.endDate) : null;
            if (end && end - now < 14 * DAY_MS) {
                expiringSoon.push({
                    id: saData.ownerId(o), name: saData.storeName(o), email: o.email, plan,
                    expiresAt: o.subscription.endDate, expired: end < now
                });
            }
        }
        expiringSoon.sort((a, b) => String(a.expiresAt).localeCompare(String(b.expiresAt)));

        res.json({
            stores: {
                total: owners.length,
                active: owners.filter((o) => o.subscription?.status === 'Active').length,
                newThisMonth: owners.filter((o) => monthKey(o.createdAt) === thisMonth).length,
                byPlan
            },
            staff: subUsers.length,
            revenue: { total: revenueTotal, thisMonth: revenueThisMonth, payments: paymentCount },
            today: { bills: billsTodayCount, sales: salesToday },
            pendingSupport,
            trend,
            expiringSoon,
            recentStores: owners.slice(0, 6).map((o) => ({
                id: saData.ownerId(o), name: saData.storeName(o), email: o.email,
                plan: o.subscription?.plan || 'none', industry: o.companyDetails?.industry || '', createdAt: o.createdAt
            })),
            recentPayments: recentPayments.slice(0, 6)
        });
    } catch (err) {
        console.error('SuperAdmin getOverview Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Every store with plan, staff and usage counts
// @route   GET /superadmin/stores
exports.getStores = async (req, res) => {
    try {
        const owners = await store.listOwners();
        res.json(await Promise.all(owners.map(storeSummary)));
    } catch (err) {
        console.error('SuperAdmin getStores Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    One store: full profile (no secrets), business stats, bill delivery
// @route   GET /superadmin/stores/:id
exports.getStore = async (req, res) => {
    try {
        const owner = await store.getOwner(req.params.id);
        if (!owner) return res.status(404).json({ msg: 'Store not found' });
        const oid = saData.ownerId(owner);
        const today = startOfTodayIST();

        const [summary, bills, gstBills, customers, credit, settings] = await Promise.all([
            storeSummary(owner),
            listStoreRecords(oid, 'bills'),
            listStoreRecords(oid, 'gstBills'),
            countStoreRecords(oid, ['customers']),
            listStoreRecords(oid, 'credit_customers'),
            store.getPlatformSettings()
        ]);
        const allBills = [...bills, ...gstBills];
        const lastBillAt = allBills.reduce((latest, b) => (String(b.createdAt || '') > String(latest || '') ? b.createdAt : latest), null);

        res.json({
            ...summary,
            owner: saData.sanitize(owner),
            billDeliveryMode: owner.billDeliveryMode || 'default',
            platformBillDeliveryMode: settings.billDeliveryMode,
            billTextEnabled: billDelivery.isTextEnabled(),
            stats: {
                customers,
                sales: allBills.reduce((s, b) => s + billTotal(b), 0),
                billsToday: bills.filter((b) => String(b.createdAt || '') >= today).length,
                lastBillAt,
                dues: credit.reduce((s, c) => s + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0),
                openDues: credit.filter((c) => Number(c.balance) > 0).length
            }
        });
    } catch (err) {
        console.error('SuperAdmin getStore Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Dataset registry with record counts (all stores, or ?storeId=)
// @route   GET /superadmin/datasets
exports.getDatasets = async (req, res) => {
    try {
        res.json(await saData.listDatasets(req.query.storeId || null));
    } catch (err) {
        console.error('SuperAdmin getDatasets Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    One page of a dataset. ?storeId=&search=&from=&to=&page=&limit= (export=1 allows up to 5000 rows)
// @route   GET /superadmin/data/:dataset
exports.getData = async (req, res) => {
    try {
        const { storeId, search, from, to } = req.query;
        const max = req.query.export === '1' ? 5000 : 200;
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), max);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const validDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : undefined);

        const result = await saData.queryDataset(req.params.dataset, {
            ownerId: storeId || null, search, from: validDate(from), to: validDate(to), page, limit
        });
        if (!result) return res.status(404).json({ msg: 'Unknown dataset' });
        res.json(result);
    } catch (err) {
        console.error('SuperAdmin getData Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Suspend / reactivate a tenant's subscription access
// @route   PATCH /superadmin/tenants/:id/status
exports.updateTenantStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Active', 'Suspended'].includes(status)) {
            return res.status(400).json({ msg: "status must be 'Active' or 'Suspended'" });
        }

        const owner = await store.updateOwner(req.params.id, { 'subscription.status': status });

        if (!owner) {
            return res.status(404).json({ msg: 'Tenant not found' });
        }

        res.json({ msg: `Tenant ${status.toLowerCase()}`, owner: saData.sanitize(owner) });
    } catch (err) {
        console.error('SuperAdmin updateTenantStatus Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Change a tenant's subscription plan / amount / end date
// @route   PATCH /superadmin/tenants/:id/subscription
exports.updateTenantSubscription = async (req, res) => {
    try {
        const { plan, amount, endDate, billingCycle } = req.body;

        const update = {};
        if (plan !== undefined) update['subscription.plan'] = plan;
        if (amount !== undefined) update['subscription.amount'] = amount;
        if (endDate !== undefined) update['subscription.endDate'] = endDate;
        if (billingCycle !== undefined) update['subscription.billingCycle'] = billingCycle;

        const owner = await store.updateOwner(req.params.id, update);

        if (!owner) {
            return res.status(404).json({ msg: 'Tenant not found' });
        }

        res.json({ msg: 'Subscription updated', owner: saData.sanitize(owner) });
    } catch (err) {
        console.error('SuperAdmin updateTenantSubscription Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Delete a tenant account (Owner + its SubUsers). Business records
//          (bills/products/etc.) are intentionally left in place.
// @route   DELETE /superadmin/tenants/:id
exports.deleteTenant = async (req, res) => {
    try {
        const ownerId = req.params.id;
        const subUsers = await store.listSubUsers(ownerId);

        const owner = await store.deleteOwner(ownerId);
        if (!owner) {
            return res.status(404).json({ msg: 'Tenant not found' });
        }

        await store.deleteSubUsers(ownerId);

        // Firestore mode keeps credentials in Firebase Auth; remove them too so the
        // email can register again. Best effort: the account records are already gone.
        if (DB_TYPE !== 'mongodb') {
            const uids = [ownerId, ...subUsers.map(s => s.userId)];
            await Promise.all(uids.map(uid =>
                admin.auth().deleteUser(uid).catch(e => console.error('Auth delete failed for', uid, e.message))
            ));
        }

        res.json({ msg: 'Tenant account deleted' });
    } catch (err) {
        console.error('SuperAdmin deleteTenant Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

const SUPPORT_STATUSES = ['Pending', 'Resolved', 'Dismissed'];

// @desc    Support inbox — messages and industry-change requests from tenants
// @route   GET /superadmin/support-requests?status=Pending|Resolved|Dismissed
exports.getSupportRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = SUPPORT_STATUSES.includes(status) ? { status } : {};

        res.json(await store.listSupportRequests(filter, 200));
    } catch (err) {
        console.error('SuperAdmin getSupportRequests Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Apply an industry change for the tenant behind a request and mark
//          the request resolved
// @route   POST /superadmin/support-requests/:id/switch-industry
exports.switchIndustryFromRequest = async (req, res) => {
    try {
        const { industry } = req.body || {};
        if (!VALID_INDUSTRIES.includes(industry)) {
            return res.status(400).json({ msg: 'Unknown industry.' });
        }

        const request = await store.getSupportRequest(req.params.id);
        if (!request) {
            return res.status(404).json({ msg: 'Request not found' });
        }
        if (request.status !== 'Pending') {
            return res.status(409).json({ msg: `This request is already ${request.status.toLowerCase()}.` });
        }

        const owner = await store.getOwner(request.ownerId);
        if (!owner) {
            return res.status(404).json({ msg: 'Tenant not found' });
        }

        const previousIndustry = owner.companyDetails?.industry || '';

        await store.updateOwner(request.ownerId, { 'companyDetails.industry': industry });

        const now = new Date().toISOString();
        const updated = await store.updateSupportRequest(req.params.id, {
            status: 'Resolved',
            resolution: `Industry switched from ${previousIndustry || 'unset'} to ${industry}`,
            resolvedBy: req.superAdmin.email,
            resolvedAt: now,
            updatedAt: now
        });

        res.json({ msg: 'Industry switched', request: updated });
    } catch (err) {
        console.error('SuperAdmin switchIndustryFromRequest Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Close a request without switching anything (handled / not going ahead)
// @route   PATCH /superadmin/support-requests/:id/status
exports.updateSupportRequestStatus = async (req, res) => {
    try {
        const { status, note } = req.body || {};
        if (!['Resolved', 'Dismissed'].includes(status)) {
            return res.status(400).json({ msg: "status must be 'Resolved' or 'Dismissed'" });
        }

        const request = await store.getSupportRequest(req.params.id);
        if (!request) {
            return res.status(404).json({ msg: 'Request not found' });
        }
        if (request.status !== 'Pending') {
            return res.status(409).json({ msg: `This request is already ${request.status.toLowerCase()}.` });
        }

        const now = new Date().toISOString();
        const updated = await store.updateSupportRequest(req.params.id, {
            status,
            resolution: String(note || '').trim().slice(0, 500),
            resolvedBy: req.superAdmin.email,
            resolvedAt: now,
            updatedAt: now
        });

        res.json({ msg: `Request ${status.toLowerCase()}`, request: updated });
    } catch (err) {
        console.error('SuperAdmin updateSupportRequestStatus Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Platform settings (global WhatsApp bill delivery mode)
// @route   GET /superadmin/settings
exports.getPlatformSettings = async (req, res) => {
    try {
        const settings = await store.getPlatformSettings();
        res.json({ ...settings, billTextEnabled: billDelivery.isTextEnabled() });
    } catch (err) {
        console.error('SuperAdmin getPlatformSettings Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Update platform settings
// @route   PUT /superadmin/settings   body: { billDeliveryMode: 'pdf' | 'text' }
exports.updatePlatformSettings = async (req, res) => {
    try {
        const { billDeliveryMode } = req.body;
        if (!billDelivery.MODES.includes(billDeliveryMode)) {
            return res.status(400).json({ msg: "billDeliveryMode must be 'pdf' or 'text'" });
        }
        const settings = await store.updatePlatformSettings({ billDeliveryMode });
        res.json({ ...settings, billTextEnabled: billDelivery.isTextEnabled() });
    } catch (err) {
        console.error('SuperAdmin updatePlatformSettings Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Override how one store's bills are sent ('default' clears the override)
// @route   PATCH /superadmin/tenants/:id/bill-delivery   body: { mode: 'default' | 'pdf' | 'text' }
exports.updateTenantBillDelivery = async (req, res) => {
    try {
        const { mode } = req.body;
        if (mode !== 'default' && !billDelivery.MODES.includes(mode)) {
            return res.status(400).json({ msg: "mode must be 'default', 'pdf' or 'text'" });
        }
        const owner = await store.updateOwner(req.params.id, { billDeliveryMode: mode === 'default' ? null : mode });
        if (!owner) return res.status(404).json({ msg: 'Tenant not found' });
        res.json({ msg: 'Bill delivery updated', owner: saData.sanitize(owner) });
    } catch (err) {
        console.error('SuperAdmin updateTenantBillDelivery Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};
