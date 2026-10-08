/**
 * Data access for online payments (Cashfree) against customer dues ("credit" records).
 * Works with MongoDB or Firestore, chosen by DB_TYPE, and returns plain objects.
 *
 * Firestore layout (under SwordNexBillingSoftware/{TENANT_ID}):
 *   owner/{ownerId}/credit_customers/{id}                      owner's dues
 *   owner/{ownerId}/subuser/{subId}/subusercredit/{id}         sub-user's dues
 *   payments/{orderId}                                         one doc per Cashfree order
 *
 * Every credit returned carries `_id`, `ownerId`, `tenantId` and (Firestore) `_path`.
 */
const { db, admin } = require('../config/firebase');
const { Credit, Payment } = require('../models/mongodb');

const isMongo = () => (process.env.DB_TYPE || 'mongodb') === 'mongodb';
const root = () => db.collection('SwordNexBillingSoftware').doc(process.env.TENANT_ID);
const paymentsCol = () => root().collection('payments');

// path: SwordNexBillingSoftware/{tenant}/owner/{ownerId}/...
const fsCredit = (doc) => {
    const seg = doc.ref.path.split('/');
    return { _id: doc.id, ...doc.data(), tenantId: seg[1], ownerId: seg[3], _path: doc.ref.path };
};

// ---------- credit records ----------

// The signed-in user's own credit record (owner: any of theirs; sub-user: only their own).
exports.findStaffCredit = async (user, id) => {
    const ownerId = user.role === 'owner' ? user.userId : user.ownerId;
    const tenantId = process.env.TENANT_ID;

    if (isMongo()) {
        const query = { _id: id, tenantId, ownerId };
        if (user.role === 'subuser') query.subuserId = user.subuserId || user.userId;
        return Credit.findOne(query).lean();
    }

    const ownerRef = root().collection('owner').doc(ownerId);
    const ref = user.role === 'subuser'
        ? ownerRef.collection('subuser').doc(user.subuserId || user.userId).collection('subusercredit').doc(String(id))
        : ownerRef.collection('credit_customers').doc(String(id));
    const doc = await ref.get();
    return doc.exists ? fsCredit(doc) : null;
};

// Public pay-link lookup. The token is the only credential.
exports.findCreditByToken = async (token) => {
    if (!token || token.length < 20) return null;
    if (isMongo()) return Credit.findOne({ payToken: token }).lean();

    const prefix = `${root().path}/`;
    for (const group of ['credit_customers', 'subusercredit']) {
        const snap = await db.collectionGroup(group).where('payToken', '==', token).limit(5).get();
        const hit = snap.docs.find((d) => d.ref.path.startsWith(prefix));
        if (hit) return fsCredit(hit);
    }
    return null;
};

exports.setPayToken = async (credit, token) => {
    if (isMongo()) await Credit.updateOne({ _id: credit._id }, { $set: { payToken: token } });
    else await db.doc(credit._path).update({ payToken: token });
};

exports.getCreditForPayment = async (payment) => {
    if (isMongo()) return Credit.findById(payment.creditId).lean();
    if (!payment.creditPath) return null;
    const doc = await db.doc(payment.creditPath).get();
    return doc.exists ? fsCredit(doc) : null;
};

// Read-modify-write the credit's ledger atomically. `compute(credit)` returns the fields to set.
exports.updateCreditLedger = async (payment, compute) => {
    if (isMongo()) {
        for (let attempt = 0; attempt < 5; attempt++) {
            const credit = await Credit.findById(payment.creditId).lean();
            if (!credit) return null;
            if ((credit.appliedPaymentOrders || []).includes(payment.orderId)) {
                const entry = (credit.history || []).find((item) => item.orderId === payment.orderId);
                return {
                    credit,
                    alreadyApplied: true,
                    update: {
                        balance: credit.balance,
                        appliedAmount: Number(entry?.appliedAmount || 0),
                        unappliedAmount: Number(entry?.unappliedAmount || 0)
                    }
                };
            }

            const update = compute(credit);
            const versionFilter = credit.__v == null
                ? { __v: { $exists: false } }
                : { __v: credit.__v };
            const updated = await Credit.findOneAndUpdate(
                {
                    _id: credit._id,
                    ...versionFilter,
                    appliedPaymentOrders: { $ne: payment.orderId }
                },
                {
                    $set: update,
                    $addToSet: { appliedPaymentOrders: payment.orderId },
                    $inc: { __v: 1 }
                },
                { new: true }
            ).lean();
            if (updated) return { credit: updated, update };
        }
        throw new Error(`Could not safely update credit ledger for Cashfree order ${payment.orderId}`);
    }
    if (!payment.creditPath) return null;
    const ref = db.doc(payment.creditPath);
    return db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists) return null;
        const credit = fsCredit(snap);
        if ((credit.appliedPaymentOrders || []).includes(payment.orderId)) {
            const entry = (credit.history || []).find((item) => item.orderId === payment.orderId);
            return {
                credit,
                alreadyApplied: true,
                update: {
                    balance: credit.balance,
                    appliedAmount: Number(entry?.appliedAmount || 0),
                    unappliedAmount: Number(entry?.unappliedAmount || 0)
                }
            };
        }
        const update = compute(credit);
        t.update(ref, {
            ...update,
            appliedPaymentOrders: admin.firestore.FieldValue.arrayUnion(payment.orderId)
        });
        return { credit: { ...credit, ...update }, update };
    });
};

// ---------- payments ----------

exports.createPayment = async (data) => {
    if (isMongo()) return (await Payment.create(data)).toObject();
    const record = Object.fromEntries(
        Object.entries({ status: 'created', currency: 'INR', kind: 'credit', createdAt: new Date().toISOString(), ...data })
            .filter(([, value]) => value !== undefined)
    );
    await paymentsCol().doc(data.orderId).create(record);
    return { _id: data.orderId, ...record };
};

exports.findPayment = async (orderId) => {
    if (isMongo()) return Payment.findOne({ orderId }).lean();
    const doc = await paymentsCol().doc(String(orderId)).get();
    return doc.exists ? { _id: doc.id, ...doc.data() } : null;
};

// Flip created/failed -> paid. Returns the paid payment only for the ONE caller that flipped it.
exports.markPaid = async (orderId, fields) => {
    const set = { ...fields, status: 'paid', paidAt: new Date().toISOString() };
    if (isMongo()) {
        return Payment.findOneAndUpdate({ orderId, status: { $ne: 'paid' } }, { $set: set }, { new: true }).lean();
    }
    const ref = paymentsCol().doc(String(orderId));
    return db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists || snap.data().status === 'paid') return null;
        t.update(ref, set);
        return { _id: snap.id, ...snap.data(), ...set };
    });
};

exports.markFailed = async (orderId, reason) => {
    if (isMongo()) {
        await Payment.updateOne({ orderId, status: 'created' }, { $set: { status: 'failed', failureReason: reason || '' } });
        return;
    }
    const ref = paymentsCol().doc(String(orderId));
    await db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (snap.exists && snap.data().status === 'created') {
            t.update(ref, { status: 'failed', failureReason: reason || '' });
        }
    });
};

exports.markReceiptSent = async (orderId) => {
    const at = new Date().toISOString();
    if (isMongo()) await Payment.updateOne({ orderId }, { $set: { receiptSentAt: at } });
    else await paymentsCol().doc(String(orderId)).update({ receiptSentAt: at });
};
