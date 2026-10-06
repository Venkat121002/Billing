/**
 * Read one store's business records (the owner's own plus every staff
 * login's) in either database, for the reports, scheduled jobs and plan
 * limits that work across the whole store rather than per request.
 *
 * MongoDB: one collection per kind, filtered by { tenantId, ownerId }
 *          (staff records carry the owner's ownerId too).
 * Firestore: SwordNexBillingSoftware/{TENANT_ID}/owner/{ownerId}/{kind}
 *          plus owner/{ownerId}/subuser/{subuserId}/{staff collection}.
 *
 * Records come back as plain objects with `_id` (and, in Firestore, `_path`,
 * the document path, which updateStoreRecord and paymentStore use).
 */
const { db } = require('../config/firebase');
const { getModel } = require('../models/mongodb');
const { storeFilter } = require('./dbUtils');

const isMongo = () => (process.env.DB_TYPE || 'mongodb') === 'mongodb';

// Where a staff login's copy of each kind lives (same mapping as dbUtils.getCollection).
const STAFF_COLLECTION = {
    products: 'subuserproducts',
    customers: 'subusercustomer',
    gstBills: 'subusergstbill',
    credit_customers: 'subusercredit',
    bills: 'subuserbills',
    transactions: 'subusertransactions'
};

const ownerRef = (ownerId) => db.collection('SwordNexBillingSoftware')
    .doc(process.env.TENANT_ID).collection('owner').doc(ownerId);

// The owner's collection plus each staff login's collection for `kind`.
async function firestoreCollections(ownerId, kind) {
    const owner = ownerRef(ownerId);
    const staff = await owner.collection('subuser').get();
    const staffKind = STAFF_COLLECTION[kind] || kind;
    return [
        owner.collection(kind),
        ...staff.docs.map((s) => s.ref.collection(staffKind))
    ];
}

/**
 * All of one store's records of `kind`, optionally limited to
 * since <= createdAt <= until (ISO strings, as the app stores them).
 */
async function listStoreRecords(ownerId, kind, { since, until } = {}) {
    const filter = storeFilter(ownerId);

    if (isMongo()) {
        const Model = getModel(kind);
        const query = { ...filter };
        if (since || until) {
            query.createdAt = {};
            if (since) query.createdAt.$gte = since;
            if (until) query.createdAt.$lte = until;
        }
        const docs = await Model.find(query).lean();
        return docs.map((d) => ({ ...d, _id: String(d._id) }));
    }

    const cols = await firestoreCollections(ownerId, kind);
    const snaps = await Promise.all(cols.map((col) => {
        let q = col;
        if (since) q = q.where('createdAt', '>=', since);
        if (until) q = q.where('createdAt', '<=', until);
        return q.get();
    }));
    return snaps.flatMap((snap) => snap.docs.map((doc) => ({
        ...doc.data(),
        _id: doc.id,
        _path: doc.ref.path,
        ownerId,
        tenantId: filter.tenantId
    })));
}

/** How many records of each kind the store has, summed (plan limits). */
async function countStoreRecords(ownerId, kinds) {
    const filter = storeFilter(ownerId);
    const counts = await Promise.all(kinds.map(async (kind) => {
        if (isMongo()) return getModel(kind).countDocuments(filter);
        const cols = await firestoreCollections(ownerId, kind);
        const snaps = await Promise.all(cols.map((col) => col.count().get()));
        return snaps.reduce((sum, s) => sum + s.data().count, 0);
    }));
    return counts.reduce((a, b) => a + b, 0);
}

/** Set fields on a record returned by listStoreRecords. */
async function updateStoreRecord(kind, record, patch) {
    if (isMongo()) {
        await getModel(kind).updateOne({ _id: record._id }, { $set: patch });
        return;
    }
    await db.doc(record._path).update(patch);
}

module.exports = { listStoreRecords, countStoreRecords, updateStoreRecord };
