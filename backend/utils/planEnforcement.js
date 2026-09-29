/**
 * Turns a superadmin-configured Plan (see models/mongodb/Plan.js) into actual
 * blocks in the app: Express middleware that 403s a create once a numeric
 * limit is reached, or once a toggle capability is off for the caller's plan.
 *
 * Mongo-only by necessity: the Plan/Payment collections have always lived in
 * MongoDB regardless of DB_TYPE (see Plan.js), and in 'firestore' mode Mongo
 * is never even connected (see server.js). So every check here is a no-op
 * (request allowed through) when DB_TYPE !== 'mongodb' — plan enforcement
 * simply isn't wired up for that mode, same as the rest of the Plan feature.
 */
const { Plan } = require('../models/mongodb');
const platformStore = require('./platformStore');
const { CAPABILITY_MAP } = require('./planCapabilities');

const DB_TYPE = process.env.DB_TYPE || 'mongodb';
const PLAN_KEYS = ['trial', 'standard', 'premium'];

const enforcementActive = () => DB_TYPE === 'mongodb';

const effectiveOwnerId = (user) => (user.role === 'owner' ? user.userId : user.ownerId);

/** Resolve which plan an owner is on and that plan's configured capabilities. */
async function getOwnerPlan(ownerId) {
    const owner = await platformStore.getOwner(ownerId);
    const rawKey = String(owner?.subscription?.plan || 'trial').toLowerCase();
    const planKey = PLAN_KEYS.includes(rawKey) ? rawKey : 'trial';
    const plan = await Plan.findOne({ key: planKey }).lean();

    const caps = {};
    for (const c of (plan?.capabilities || [])) caps[c.key] = c;

    return { owner, planKey, planName: plan?.name || planKey, caps };
}

const limitMessage = (capKey, planName, limit) => {
    const def = CAPABILITY_MAP[capKey];
    return `Your ${planName} plan allows up to ${limit} ${def?.unit || 'items'}. Upgrade your plan to add more.`;
};

/**
 * Blocks creating a new document once `Model.countDocuments({tenantId, ownerId})`
 * reaches the plan's configured limit for `capKey`. Counting by {tenantId,
 * ownerId} (no subuserId filter) is deliberate — the limit is account-wide,
 * covering the owner and every staff login together, because staff records
 * are stored with the SAME ownerId as the owner's own (see dbUtils.getCollection).
 */
function enforceLimit(capKey, Model) {
    return enforceCombinedLimit(capKey, [Model]);
}

/** Like enforceLimit, but sums several models against one shared limit. */
function enforceCombinedLimit(capKey, Models) {
    return async (req, res, next) => {
        if (!enforcementActive()) return next();
        try {
            const tenantId = process.env.TENANT_ID;
            const ownerId = effectiveOwnerId(req.user);
            const { caps, planName } = await getOwnerPlan(ownerId);
            const limit = caps[capKey]?.limit;
            if (limit == null) return next(); // unlimited / not configured

            const counts = await Promise.all(Models.map((M) => M.countDocuments({ tenantId, ownerId })));
            const current = counts.reduce((a, b) => a + b, 0);

            if (current >= limit) {
                return res.status(403).json({
                    msg: limitMessage(capKey, planName, limit),
                    code: 'PLAN_LIMIT_REACHED',
                    capability: capKey,
                    limit,
                    current
                });
            }
            next();
        } catch (err) {
            // Fail open: a bug or blip in limit-checking should never be able to
            // take down product/bill creation app-wide.
            console.error(`[planEnforcement] enforceLimit(${capKey}) error:`, err.message);
            next();
        }
    };
}

/** Blocks the request entirely unless the caller's plan has `capKey` enabled. */
function requireCapability(capKey) {
    return async (req, res, next) => {
        if (!enforcementActive()) return next();
        try {
            const ownerId = effectiveOwnerId(req.user);
            const { caps, planName } = await getOwnerPlan(ownerId);
            if (caps[capKey]?.enabled) return next();

            const def = CAPABILITY_MAP[capKey];
            return res.status(403).json({
                msg: `${def?.label || capKey} isn't included in your ${planName} plan. Upgrade to use it.`,
                code: 'PLAN_FEATURE_LOCKED',
                capability: capKey
            });
        } catch (err) {
            console.error(`[planEnforcement] requireCapability(${capKey}) error:`, err.message);
            next();
        }
    };
}

module.exports = { getOwnerPlan, enforceLimit, enforceCombinedLimit, requireCapability, effectiveOwnerId };
