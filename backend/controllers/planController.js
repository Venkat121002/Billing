const { Plan } = require('../models/mongodb');
const DEFAULTS = require('../utils/planDefaults');
const { CAPABILITY_MAP, CAPABILITY_KEYS } = require('../utils/planCapabilities');

const KEYS = ['trial', 'standard', 'premium'];

/**
 * Make sure all three plan rows exist, creating any that are missing from
 * the defaults. Safe to call on every read — upsert is a no-op once seeded.
 * Rows seeded before a capability was added to the catalog get that
 * capability's default value appended (existing values are never touched).
 */
async function ensurePlans() {
    await Promise.all(KEYS.map((key) =>
        Plan.findOneAndUpdate(
            { key },
            { $setOnInsert: DEFAULTS[key] },
            { upsert: true, setDefaultsOnInsert: true }
        )
    ));
    const plans = await Plan.find({}).sort({ order: 1 }).lean();

    await Promise.all(plans.map(async (plan) => {
        const have = new Set((plan.capabilities || []).map((c) => c.key));
        const missing = (DEFAULTS[plan.key]?.capabilities || []).filter((c) => !have.has(c.key));
        if (!missing.length) return;
        await Plan.updateOne({ _id: plan._id }, { $push: { capabilities: { $each: missing } } });
        plan.capabilities = [...(plan.capabilities || []), ...missing];
    }));
    return plans;
}

// @desc    Public plan list for the pricing page (no login required)
// @route   GET /api/v2/billing/plans
exports.getPublicPlans = async (req, res) => {
    try {
        const plans = await ensurePlans();
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
        res.json(await ensurePlans());
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
        const existing = await Plan.findOneAndUpdate(
            { key },
            { $setOnInsert: DEFAULTS[key] },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ); // make sure the row exists (with defaults) before we $set onto it

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

        const plan = await Plan.findOneAndUpdate({ key }, { $set: update }, { new: true });
        res.json(plan);
    } catch (err) {
        console.error('SuperAdmin updatePlan Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
};

exports.ensurePlans = ensurePlans;
