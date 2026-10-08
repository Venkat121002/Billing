/**
 * Turns a superadmin-configured Plan (see models/mongodb/Plan.js) into actual
 * blocks in the app: Express middleware that 403s a create once a numeric
 * limit is reached, or once a toggle capability is off for the caller's plan.
 * Works with MongoDB or Firestore (plans: planStore.js, counts: storeRecords.js).
 */
const platformStore = require('./platformStore');
const planStore = require('./planStore');
const { countStoreRecords } = require('./storeRecords');
const { CAPABILITY_MAP } = require('./planCapabilities');

const effectiveOwnerId = (user) => (user.role === 'owner' ? user.userId : user.ownerId);

/** Resolve which plan an owner is on and that plan's configured capabilities. */
async function getOwnerPlan(ownerId) {
    const owner = await platformStore.getOwner(ownerId);
    const rawKey = String(owner?.subscription?.plan || 'trial').toLowerCase();
    const planKey = planStore.KEYS.includes(rawKey) ? rawKey : 'trial';
    const plan = await planStore.getPlan(planKey);

    const caps = {};
    for (const c of (plan?.capabilities || [])) caps[c.key] = c;

    return { owner, planKey, planName: plan?.name || planKey, caps };
}

const limitMessage = (capKey, planName, limit) => {
    const def = CAPABILITY_MAP[capKey];
    return `Your ${planName} plan allows up to ${limit} ${def?.unit || 'items'}. Upgrade your plan to add more.`;
};

/**
 * Blocks creating a new record once the store's count of `kind` reaches the
 * plan's configured limit for `capKey`. The count is account-wide — the owner
 * and every staff login together (see storeRecords.countStoreRecords).
 */
function enforceLimit(capKey, kind) {
    return enforceCombinedLimit(capKey, [kind]);
}

/** Like enforceLimit, but sums several kinds against one shared limit. */
function enforceCombinedLimit(capKey, kinds) {
    return async (req, res, next) => {
        try {
            const ownerId = effectiveOwnerId(req.user);
            const { caps, planName } = await getOwnerPlan(ownerId);
            const limit = caps[capKey]?.limit;
            if (limit == null) return next(); // unlimited / not configured

            const current = await countStoreRecords(ownerId, kinds);

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
