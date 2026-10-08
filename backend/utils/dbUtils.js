const { db } = require('../config/firebase');
const { getModel } = require('../models/mongodb');
const { MongoCollectionReference } = require('./mongoAdapter');

// Determine which database to use
const DB_TYPE = process.env.DB_TYPE || 'mongodb';

/**
 * Gets the correct collection reference based on user role and database type.
 * Supports both Firestore and MongoDB seamlessly.
 *
 * Firestore: SwordNexBillingSoftware/{tenantId}/owner/{ownerId}/{subCollection}
 * MongoDB: Mongoose model with query filters {tenantId, ownerId, subuserId}
 */
const getCollection = (req, subCollection) => {
    const tenantId = process.env.TENANT_ID;
    const { userId, role, ownerId, subuserId } = req.user;

    if (!tenantId) {
        throw new Error("Server Configuration Error: TENANT_ID not set");
    }

    // Determine the effective owner ID
    const effectiveOwnerId = role === 'owner' ? userId : ownerId;

    if (!effectiveOwnerId) {
        throw new Error("Session missing owner identification. Please re-login.");
    }

    // === MONGODB MODE ===
    if (DB_TYPE === 'mongodb') {
        // Map collection names for sub-users
        let targetCollection = subCollection;
        if (role === 'subuser') {
            if (subCollection === 'products') targetCollection = 'subuserproducts';
            if (subCollection === 'customers') targetCollection = 'subusercustomer';
            if (subCollection === 'gstBills') targetCollection = 'subusergstbill';
            if (subCollection === 'credit_customers') targetCollection = 'subusercredit';
            if (subCollection === 'suppliers') targetCollection = 'subusersupplier';
            if (subCollection === 'bills') targetCollection = 'subuserbills';
            if (subCollection === 'transactions') targetCollection = 'subusertransactions';
            if (subCollection === 'cashbook') targetCollection = 'subusertransactions';
        }

        const Model = getModel(targetCollection);
        if (!Model) {
            throw new Error(`MongoDB model not found for collection: ${targetCollection}`);
        }

        // Build base query with tenant and owner scoping
        const baseQuery = {
            tenantId,
            ownerId: effectiveOwnerId
        };

        // Add subuser scoping if applicable
        if (role === 'subuser') {
            baseQuery.subuserId = subuserId || userId;
        }

        return new MongoCollectionReference(Model, baseQuery);
    }

    // === FIRESTORE MODE (Original Logic) ===
    const ownerDocRef = db.collection('SwordNexBillingSoftware')
        .doc(tenantId)
        .collection('owner')
        .doc(effectiveOwnerId);

    if (role === 'owner') {
        return ownerDocRef.collection(subCollection);
    } else {
        // Sub-user logic
        const targetSubUserId = subuserId || userId;

        let targetCollection = subCollection;
        if (subCollection === 'products') targetCollection = 'subuserproducts';
        if (subCollection === 'customers') targetCollection = 'subusercustomer';
        if (subCollection === 'gstBills') targetCollection = 'subusergstbill';
        if (subCollection === 'credit_customers') targetCollection = 'subusercredit';
        if (subCollection === 'suppliers') targetCollection = 'subusersupplier';
        if (subCollection === 'bills') targetCollection = 'subuserbills';
        if (subCollection === 'transactions') targetCollection = 'subusertransactions';
        if (subCollection === 'cashbook') targetCollection = 'subusertransactions';

        return ownerDocRef
            .collection('subuser')
            .doc(targetSubUserId)
            .collection(targetCollection);
    }
};

/**
 * Fetches unified data from all sub-user collections and the owner's collection.
 * Only for 'owner' role.
 */
const fetchUnifiedData = async (req, subCollection, options = {}) => {
    const { userId, role } = req.user;
    const tenantId = process.env.TENANT_ID;

    // 1. Get owner's own records
    const ownerRef = getCollection(req, subCollection);
    const ownerSnapshot = await ownerRef.get();
    let unifiedRecords = ownerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'Owner',
        createdBy: userId
    }));

    if (role === 'owner') {
        // SKIP sub-user fetching for products if role is owner (unless requested)
        if (subCollection === 'products' && !options.includeSubuserProducts) {
            return unifiedRecords;
        }

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            const SubUserModel = getModel('subuser');
            const subusers = await SubUserModel.find({ tenantId, ownerId: userId }).exec();

            const subuserFetchPromises = subusers.map(async (subuser) => {
                const subuserId = subuser.userId || subuser._id.toString();
                let targetCollection = subCollection;
                if (subCollection === 'products') targetCollection = 'subuserproducts';
                if (subCollection === 'customers') targetCollection = 'subusercustomer';
                if (subCollection === 'gstBills') targetCollection = 'subusergstbill';
                if (subCollection === 'credit_customers') targetCollection = 'subusercredit';
                if (subCollection === 'suppliers') targetCollection = 'subusersupplier';
                if (subCollection === 'bills') targetCollection = 'subuserbills';
                if (subCollection === 'transactions') targetCollection = 'subusertransactions';
                if (subCollection === 'cashbook') targetCollection = 'subusertransactions';

                const Model = getModel(targetCollection);
                if (!Model) return [];

                const records = await Model.find({ tenantId, ownerId: userId, subuserId }).exec();
                return records.map(doc => {
                    const data = doc.toObject();
                    const docId = doc._id.toString();
                    delete data._id;
                    delete data.__v;
                    return {
                        id: docId,
                        ...data,
                        source: `${subuser.firstName} ${subuser.lastName}`.trim() || 'Subuser',
                        createdBy: subuserId
                    };
                });
            });

            const subuserRecordsArrays = await Promise.all(subuserFetchPromises);
            subuserRecordsArrays.forEach(records => {
                unifiedRecords = [...unifiedRecords, ...records];
            });

            return unifiedRecords;
        }

        // === FIRESTORE MODE ===
        const subusersRef = db.collection('SwordNexBillingSoftware')
            .doc(tenantId)
            .collection('owner')
            .doc(userId)
            .collection('subuser');

        const subusersSnapshot = await subusersRef.get();

        const subuserFetchPromises = subusersSnapshot.docs.map(async (subuserDoc) => {
            const subuserData = subuserDoc.data();
            const subuserId = subuserDoc.id;

            let targetCollection = subCollection;
            if (subCollection === 'products') targetCollection = 'subuserproducts';
            if (subCollection === 'customers') targetCollection = 'subusercustomer';
            if (subCollection === 'gstBills') targetCollection = 'subusergstbill';
            if (subCollection === 'credit_customers') targetCollection = 'subusercredit';
            if (subCollection === 'suppliers') targetCollection = 'subusersupplier';
            if (subCollection === 'bills') targetCollection = 'subuserbills';
            if (subCollection === 'transactions') targetCollection = 'subusertransactions';
            if (subCollection === 'cashbook') targetCollection = 'subusertransactions';

            const subuserColRef = db.collection('SwordNexBillingSoftware')
                .doc(tenantId)
                .collection('owner')
                .doc(userId)
                .collection('subuser')
                .doc(subuserId)
                .collection(targetCollection);

            const snapshot = await subuserColRef.get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                source: `${subuserData.firstName} ${subuserData.lastName}`,
                createdBy: subuserId
            }));
        });

        const subuserRecordsArrays = await Promise.all(subuserFetchPromises);
        subuserRecordsArrays.forEach(records => {
            unifiedRecords = [...unifiedRecords, ...records];
        });
    }

    return unifiedRecords;
};

/**
 * Mongo filter for one store's records (owner + all of its sub-users), for code
 * that queries models directly instead of through getCollection(). Both fields
 * are required: TENANT_ID is the same for every store on the platform, so a
 * filter on tenantId alone (or `$or: [{ownerId}, {tenantId}]`) matches every store.
 */
const storeFilter = (ownerId, tenantId = process.env.TENANT_ID) => {
    if (!ownerId || !tenantId) {
        throw new Error("Store scope missing (ownerId / tenantId).");
    }
    return { tenantId, ownerId };
};

module.exports = { getCollection, fetchUnifiedData, storeFilter };
