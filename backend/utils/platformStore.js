/**
 * Data access for the platform-level (cross-tenant) features: the Super Admin
 * panel and the support-request inbox. Works against MongoDB or Firestore,
 * chosen by DB_TYPE, and returns plain objects shaped the same in both modes
 * (every record carries `_id`, which is what the frontend keys on).
 *
 * Firestore layout (all under SwordNexBillingSoftware/{TENANT_ID}):
 *   owner/{ownerId}                       tenant account (Owner)
 *   owner/{ownerId}/subuser/{subuserId}   sub-users
 *   owner/{ownerId}/{collection}          business records
 *   supportRequests/{id}                  support inbox
 */
const mongoose = require('mongoose');
const { db } = require('../config/firebase');
const models = require('../models/mongodb');

const DB_TYPE = process.env.DB_TYPE || 'mongodb';
const isMongo = () => DB_TYPE === 'mongodb';

// Label shown on the tenant drill-down page -> [Mongo model, Firestore sub-collection]
const TENANT_DATA = {
    bills: [models.Bill, 'bills'],
    products: [models.Product, 'products'],
    customers: [models.Customer, 'customers'],
    clients: [models.Client, 'clients'],
    gstBills: [models.GstBill, 'gstBills'],
    credits: [models.Credit, 'credit_customers'],
    suppliers: [models.Supplier, 'suppliers'],
    trainers: [models.Trainer, 'trainers'],
    repairTickets: [models.RepairTicket, 'repairtickets'],
    pets: [models.Pet, 'pets'],
    milestones: [models.Milestone, 'milestones'],
    salesmen: [models.Salesman, 'salesmen'],
    inventoryReturns: [models.InventoryReturn, 'inventory_returns'],
    transactions: [models.Transaction, 'transactions']
};

// ---------- Firestore helpers ----------
const root = () => db.collection('SwordNexBillingSoftware').doc(process.env.TENANT_ID);
const ownersCol = () => root().collection('owner');
const requestsCol = () => root().collection('supportRequests');

const shape = (doc) => ({ _id: doc.id, ...doc.data() });
const byCreatedDesc = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

// Sub-user docs are keyed by uid and carry no userId field of their own.
const shapeSubUser = (doc) => ({ _id: doc.id, userId: doc.id, ...doc.data() });

const fsSubUserDocs = async (ownerId) => {
    if (ownerId) {
        return (await ownersCol().doc(ownerId).collection('subuser').get()).docs;
    }
    const prefix = `${root().path}/`;
    const snap = await db.collectionGroup('subuser').get();
    return snap.docs.filter((d) => d.ref.path.startsWith(prefix));
};

// ---------- Owners ----------
exports.listOwners = async () => {
    if (isMongo()) return models.Owner.find({}).sort({ createdAt: -1 }).lean();
    const snap = await ownersCol().get();
    return snap.docs.map(shape).sort(byCreatedDesc);
};

exports.getOwner = async (ownerId) => {
    if (isMongo()) return models.Owner.findOne({ userId: ownerId }).lean();
    const doc = await ownersCol().doc(ownerId).get();
    return doc.exists ? shape(doc) : null;
};

// `patch` may use dotted paths ('subscription.status'), valid for both backends.
exports.updateOwner = async (ownerId, patch) => {
    if (isMongo()) {
        return models.Owner.findOneAndUpdate({ userId: ownerId }, { $set: patch }, { new: true }).lean();
    }
    const ref = ownersCol().doc(ownerId);
    if (!(await ref.get()).exists) return null;
    await ref.update(patch);
    return shape(await ref.get());
};

exports.deleteOwner = async (ownerId) => {
    if (isMongo()) return models.Owner.findOneAndDelete({ userId: ownerId }).lean();
    const ref = ownersCol().doc(ownerId);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.delete();
    return shape(doc);
};

// ---------- Sub-users ----------
exports.listSubUsers = async (ownerId) => {
    if (isMongo()) {
        return models.SubUser.find(ownerId ? { ownerId } : {}).sort({ createdAt: -1 }).lean();
    }
    return (await fsSubUserDocs(ownerId)).map(shapeSubUser).sort(byCreatedDesc);
};

exports.getSubUser = async (ownerId, userId) => {
    if (isMongo()) return models.SubUser.findOne({ userId }).lean();
    const doc = await ownersCol().doc(ownerId).collection('subuser').doc(userId).get();
    return doc.exists ? shapeSubUser(doc) : null;
};

exports.deleteSubUsers = async (ownerId) => {
    if (isMongo()) {
        await models.SubUser.deleteMany({ ownerId });
        return;
    }
    await Promise.all((await fsSubUserDocs(ownerId)).map((d) => d.ref.delete()));
};

// ---------- Tenant drill-down ----------
exports.tenantData = async (ownerId) => {
    const entries = Object.entries(TENANT_DATA);

    const results = await Promise.all(entries.map(async ([, [Model, collection]]) => {
        if (isMongo()) {
            const [count, recent] = await Promise.all([
                Model.countDocuments({ ownerId }),
                Model.find({ ownerId }).sort({ createdAt: -1 }).limit(10).lean()
            ]);
            return { count, recent };
        }
        const ref = ownersCol().doc(ownerId).collection(collection);
        const [count, recentSnap] = await Promise.all([
            ref.count().get(),
            ref.orderBy('createdAt', 'desc').limit(10).get()
        ]);
        return { count: count.data().count, recent: recentSnap.docs.map(shape) };
    }));

    return Object.fromEntries(entries.map(([key], i) => [key, results[i]]));
};

// ---------- Support requests ----------
const requestMatches = (r, { status, ownerId, requestedBy, type }) =>
    (!status || r.status === status) &&
    (!ownerId || r.ownerId === ownerId) &&
    (!requestedBy || r.requestedBy === requestedBy) &&
    (!type || r.type === type);

exports.listSupportRequests = async (filter = {}, limit = 200) => {
    if (isMongo()) {
        const query = {};
        for (const k of ['status', 'ownerId', 'requestedBy', 'type']) if (filter[k]) query[k] = filter[k];
        return models.SupportRequest.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    }
    // Equality filter on one field server-side, the rest + ordering in memory:
    // avoids needing composite indexes, and per-tenant volumes are small.
    let q = requestsCol();
    if (filter.status) q = q.where('status', '==', filter.status);
    else if (filter.ownerId) q = q.where('ownerId', '==', filter.ownerId);
    const snap = await q.get();
    return snap.docs.map(shape).filter((r) => requestMatches(r, filter)).sort(byCreatedDesc).slice(0, limit);
};

exports.countPendingSupportRequests = async () => {
    if (isMongo()) return models.SupportRequest.countDocuments({ status: 'Pending' });
    return (await requestsCol().where('status', '==', 'Pending').count().get()).data().count;
};

exports.getSupportRequest = async (id) => {
    if (isMongo()) {
        if (!mongoose.isValidObjectId(id)) return null;
        return models.SupportRequest.findById(id).lean();
    }
    const doc = await requestsCol().doc(String(id)).get();
    return doc.exists ? shape(doc) : null;
};

exports.createSupportRequest = async (data) => {
    if (isMongo()) return (await models.SupportRequest.create(data)).toObject();
    const now = new Date().toISOString();
    const record = { ...data, createdAt: now, updatedAt: now };
    const ref = await requestsCol().add(record);
    return { _id: ref.id, ...record };
};

exports.updateSupportRequest = async (id, patch) => {
    if (isMongo()) {
        return models.SupportRequest.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    }
    const ref = requestsCol().doc(String(id));
    await ref.update(patch);
    return shape(await ref.get());
};

// ---------- Platform settings (single 'global' record) ----------
const PLATFORM_DEFAULTS = { billDeliveryMode: 'pdf' };
const settingsDoc = () => root().collection('platform').doc('settings');

exports.getPlatformSettings = async () => {
    if (isMongo()) {
        const doc = await models.PlatformSetting.findOne({ key: 'global' }).lean();
        return { ...PLATFORM_DEFAULTS, ...(doc ? { billDeliveryMode: doc.billDeliveryMode } : {}) };
    }
    const doc = await settingsDoc().get();
    return { ...PLATFORM_DEFAULTS, ...(doc.exists ? doc.data() : {}) };
};

exports.updatePlatformSettings = async (patch) => {
    if (isMongo()) {
        await models.PlatformSetting.findOneAndUpdate({ key: 'global' }, { $set: patch }, { upsert: true });
    } else {
        await settingsDoc().set(patch, { merge: true });
    }
    return exports.getPlatformSettings();
};
