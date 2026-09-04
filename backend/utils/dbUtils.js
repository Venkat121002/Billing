const { db } = require('../config/firebase');

/**
 * Gets the correct Firestore collection reference based on user role and production structure.
 * Owner: SwordNexBillingSoftware/{tenantId}/owner/{ownerId}/{subCollection}
 * Sub-user: SwordNexBillingSoftware/{tenantId}/owner/{ownerId}/subuser/{subuserId}/{subuserCollection}
 */
const getCollection = (req, subCollection) => {
    const tenantId = process.env.TENANT_ID;
    const { userId, role, ownerId, subuserId } = req.user;

    if (!tenantId) {
        throw new Error("Server Configuration Error: TENANT_ID not set");
    }

    // Determine the root owner document path
    const effectiveOwnerId = role === 'owner' ? userId : ownerId;

    if (!effectiveOwnerId) {
        throw new Error("Session missing owner identification. Please re-login.");
    }

    // Path: SwordNexBillingSoftware/{tenantId}/owner/{ownerId}
    const ownerDocRef = db.collection('SwordNexBillingSoftware')
        .doc(tenantId)
        .collection('owner')
        .doc(effectiveOwnerId);

    if (role === 'owner') {
        return ownerDocRef.collection(subCollection);
    } else {
        // Sub-user logic: SwordNexBillingSoftware/{tenantId}/owner/{ownerId}/subuser/{subuserId}/{targetCollection}
        const targetSubUserId = subuserId || userId;

        // Map collection names for sub-users as per production requirements
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
        const tenantId = process.env.TENANT_ID;

        // SKIP sub-user fetching for products if role is owner (as per user request)
        // UNLESS explicitly requested via options (e.g. for Staff Records page)
        if (subCollection === 'products' && !options.includeSubuserProducts) {
            return unifiedRecords;
        }

        // 2. Get all sub-users for this owner
        const subusersRef = db.collection('SwordNexBillingSoftware')
            .doc(tenantId)
            .collection('owner')
            .doc(userId)
            .collection('subuser');

        const subusersSnapshot = await subusersRef.get();

        // 3. For each sub-user, fetch their records from their specific collection
        const subuserFetchPromises = subusersSnapshot.docs.map(async (subuserDoc) => {
            const subuserData = subuserDoc.data();
            const subuserId = subuserDoc.id;

            // Re-use logic for sub-user collection mapping
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

module.exports = { getCollection, fetchUnifiedData };
