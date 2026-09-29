const jwt = require('jsonwebtoken');
const { admin } = require('../config/firebase');
const store = require('../utils/platformStore');
const billDelivery = require('../utils/billDelivery');
const { VALID_INDUSTRIES } = require('../utils/industries');

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

// @desc    Platform-wide aggregate stats
// @route   GET /superadmin/stats
exports.getStats = async (req, res) => {
    try {
        const [owners, subUsers, pendingSupportRequests] = await Promise.all([
            store.listOwners(),
            store.listSubUsers(),
            store.countPendingSupportRequests()
        ]);

        const totalTenants = owners.length;
        const activeSubscriptions = owners.filter(o => o.subscription?.status === 'Active').length;

        const planCounts = {};
        let totalRevenue = 0;
        for (const o of owners) {
            const plan = o.subscription?.plan || 'Free';
            planCounts[plan] = (planCounts[plan] || 0) + 1;
            totalRevenue += Number(o.subscription?.amount) || 0;
        }
        const planBreakdown = Object.entries(planCounts)
            .map(([plan, count]) => ({ plan, count }))
            .sort((a, b) => b.count - a.count);

        // listOwners() is already newest-first
        const recentTenants = owners.slice(0, 5).map(o => ({
            _id: o._id,
            userId: o.userId,
            email: o.email,
            companyDetails: { name: o.companyDetails?.name },
            subscription: { plan: o.subscription?.plan, status: o.subscription?.status },
            createdAt: o.createdAt
        }));

        res.json({
            totalTenants,
            totalSubUsers: subUsers.length,
            activeSubscriptions,
            inactiveSubscriptions: totalTenants - activeSubscriptions,
            totalRevenue,
            planBreakdown,
            recentTenants,
            pendingSupportRequests
        });
    } catch (err) {
        console.error('SuperAdmin getStats Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    List all tenants (Owners) with sub-user counts
// @route   GET /superadmin/tenants
exports.getTenants = async (req, res) => {
    try {
        const [owners, subUsers] = await Promise.all([store.listOwners(), store.listSubUsers()]);

        const countMap = {};
        for (const s of subUsers) countMap[s.ownerId] = (countMap[s.ownerId] || 0) + 1;

        res.json(owners.map(o => ({ ...o, subUserCount: countMap[o.userId] || 0 })));
    } catch (err) {
        console.error('SuperAdmin getTenants Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Single tenant detail + its sub-users
// @route   GET /superadmin/tenants/:id
exports.getTenantById = async (req, res) => {
    try {
        const owner = await store.getOwner(req.params.id);
        if (!owner) {
            return res.status(404).json({ msg: 'Tenant not found' });
        }

        const subUsers = await store.listSubUsers(req.params.id);

        res.json({ owner, subUsers });
    } catch (err) {
        console.error('SuperAdmin getTenantById Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    Counts of every business collection for one tenant (drill-down)
// @route   GET /superadmin/tenants/:id/data
exports.getTenantData = async (req, res) => {
    try {
        res.json(await store.tenantData(req.params.id));
    } catch (err) {
        console.error('SuperAdmin getTenantData Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

// @desc    All sub-users across every tenant
// @route   GET /superadmin/subusers
exports.getAllSubUsers = async (req, res) => {
    try {
        const [subUsers, owners] = await Promise.all([store.listSubUsers(), store.listOwners()]);
        const ownerMap = Object.fromEntries(owners.map(o => [o.userId, o]));

        res.json(subUsers.map(s => ({
            ...s,
            ownerBusinessName: ownerMap[s.ownerId]?.companyDetails?.name || '',
            ownerEmail: ownerMap[s.ownerId]?.email || ''
        })));
    } catch (err) {
        console.error('SuperAdmin getAllSubUsers Error:', err.message);
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

        res.json({ msg: `Tenant ${status.toLowerCase()}`, owner });
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

        res.json({ msg: 'Subscription updated', owner });
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
        res.json({ msg: 'Bill delivery updated', owner });
    } catch (err) {
        console.error('SuperAdmin updateTenantBillDelivery Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};
