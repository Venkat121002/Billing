const planStore = require('../utils/planStore');
const { CAPABILITY_MAP, CAPABILITY_KEYS } = require('../utils/planCapabilities');

const KEYS = planStore.KEYS;

// @desc    Public plan list for the pricing page (no login required)
// @route   GET /api/v2/billing/plans
exports.getPublicPlans = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        const plans = await planStore.listPlans();
        res.json(plans.map(({ key, order, name, tagline, badge, monthly, yearly, capabilities }) => ({
            key, order, name, tagline, badge, monthly, yearly, capabilities
        })));
    } catch (err) {
        console.error('Get Plans Error:', err.message);
        res.status(500).json({ msg: 'Could not load plans' });
    }
};

// @desc    Full plan list for the superadmin Plans page
// @route   GET /superadmin/plans
exports.getAdminPlans = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.json(await planStore.listPlans());
    } catch (err) {
        console.error('SuperAdmin getPlans Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

/**
 * Validate a posted capabilities array against the fixed catalog: unknown
 * keys are dropped, and each value is coerced to the correct type for its
 * capability ('limit' -> number|null, 'toggle' -> boolean). Any catalog key
 * missing from the input keeps its current value (via `existing`), so a
 * partial payload can never silently zero out a capability.
 */
const sanitizeCapabilities = (list, existing = []) => {
    if (!Array.isArray(list)) return undefined;
    const existingByKey = Object.fromEntries(existing.map((c) => [c.key, c]));
    const incomingByKey = Object.fromEntries(
        list.filter((row) => row && CAPABILITY_MAP[row.key]).map((row) => [row.key, row])
    );

    return CAPABILITY_KEYS.map((key) => {
        const def = CAPABILITY_MAP[key];
        const row = incomingByKey[key] || existingByKey[key] || {};
        if (def.type === 'limit') {
            const n = row.limit === null || row.limit === undefined || row.limit === '' ? null : Number(row.limit);
            return { key, limit: n !== null && Number.isFinite(n) && n >= 0 ? Math.round(n) : null };
        }
        return { key, enabled: !!row.enabled };
    });
};

// @desc    Update one plan's price, text and capabilities
// @route   PUT /superadmin/plans/:key
exports.updatePlan = async (req, res) => {
    try {
        const { key } = req.params;
        if (!KEYS.includes(key)) {
            return res.status(400).json({ msg: 'Unknown plan key' });
        }
        // Make sure the plan exists (with defaults) before setting onto it.
        const existing = await planStore.getPlan(key);

        const body = req.body || {};
        const update = { updatedBy: req.superAdmin?.email || '' };

        if (body.name !== undefined) {
            const name = String(body.name).trim().slice(0, 40);
            if (!name) return res.status(400).json({ msg: 'Plan name is required' });
            update.name = name;
        }
        if (body.tagline !== undefined) update.tagline = String(body.tagline).trim().slice(0, 120);
        if (body.badge !== undefined) update.badge = String(body.badge).trim().slice(0, 24);

        // The Free/trial plan never has a price, regardless of what's posted.
        if (key !== 'trial') {
            if (body.monthly !== undefined) {
                const monthly = Number(body.monthly);
                if (!Number.isFinite(monthly) || monthly < 0) return res.status(400).json({ msg: 'Monthly price must be 0 or more' });
                update.monthly = monthly;
            }
            if (body.yearly !== undefined) {
                const yearly = Number(body.yearly);
                if (!Number.isFinite(yearly) || yearly < 0) return res.status(400).json({ msg: 'Yearly price must be 0 or more' });
                update.yearly = yearly;
            }
        }

        const capabilities = sanitizeCapabilities(body.capabilities, existing.capabilities);
        if (capabilities !== undefined) update.capabilities = capabilities;

        const plan = await planStore.updatePlan(key, update);
        res.json(plan);
    } catch (err) {
        console.error('SuperAdmin updatePlan Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};
