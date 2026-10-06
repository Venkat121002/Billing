/**
 * The three subscription plans (trial / standard / premium) in either
 * database. MongoDB: the Plan collection. Firestore:
 * SwordNexBillingSoftware/{TENANT_ID}/plans/{key}. Missing plans are created
 * from planDefaults.js on first read, and capabilities added to the catalog
 * later are appended with their default value (existing values never change).
 */
const { db } = require('../config/firebase');
const { Plan } = require('../models/mongodb');
const DEFAULTS = require('./planDefaults');

const KEYS = ['trial', 'standard', 'premium'];
const isMongo = () => (process.env.DB_TYPE || 'mongodb') === 'mongodb';
const plansCol = () => db.collection('SwordNexBillingSoftware').doc(process.env.TENANT_ID).collection('plans');

const missingCapabilities = (plan) => {
    const have = new Set((plan.capabilities || []).map((c) => c.key));
    return (DEFAULTS[plan.key]?.capabilities || []).filter((c) => !have.has(c.key));
};

// Firestore: create the plan from defaults if absent; returns its current data.
async function ensureFirestorePlan(key) {
    const ref = plansCol().doc(key);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            const now = new Date().toISOString();
            const created = { ...DEFAULTS[key], updatedBy: '', createdAt: now, updatedAt: now };
            tx.set(ref, created);
            return created;
        }
        const plan = snap.data();
        const missing = missingCapabilities(plan);
        if (missing.length) {
            plan.capabilities = [...(plan.capabilities || []), ...missing];
            tx.update(ref, { capabilities: plan.capabilities });
        }
        return plan;
    });
}

/** All three plans in display order, creating any that are missing. */
async function listPlans() {
    if (!isMongo()) {
        const plans = await Promise.all(KEYS.map(ensureFirestorePlan));
        return plans.sort((a, b) => a.order - b.order);
    }

    await Promise.all(KEYS.map((key) =>
        Plan.findOneAndUpdate({ key }, { $setOnInsert: DEFAULTS[key] }, { upsert: true, setDefaultsOnInsert: true })
    ));
    const plans = await Plan.find({}).sort({ order: 1 }).lean();
    await Promise.all(plans.map(async (plan) => {
        const missing = missingCapabilities(plan);
        if (!missing.length) return;
        await Plan.updateOne({ _id: plan._id }, { $push: { capabilities: { $each: missing } } });
        plan.capabilities = [...(plan.capabilities || []), ...missing];
    }));
    return plans;
}

/** One plan by key (created from defaults if missing), or null for an unknown key. */
async function getPlan(key) {
    if (!KEYS.includes(key)) return null;
    if (!isMongo()) return ensureFirestorePlan(key);
    const plan = await Plan.findOneAndUpdate(
        { key },
        { $setOnInsert: DEFAULTS[key] },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    const missing = missingCapabilities(plan);
    return missing.length ? { ...plan, capabilities: [...(plan.capabilities || []), ...missing] } : plan;
}

/** Set fields on a plan (it must already exist, see getPlan); returns the updated plan. */
async function updatePlan(key, update) {
    if (!isMongo()) {
        const ref = plansCol().doc(key);
        await ref.update({ ...update, updatedAt: new Date().toISOString() });
        return (await ref.get()).data();
    }
    return Plan.findOneAndUpdate({ key }, { $set: update }, { new: true }).lean();
}

module.exports = { KEYS, listPlans, getPlan, updatePlan };
