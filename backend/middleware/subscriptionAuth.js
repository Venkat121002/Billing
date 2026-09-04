const { db } = require('../config/firebase');

/**
 * Middleware to ensure the owner's subscription is active.
 * Applies to both owners and sub-users.
 */
const subscriptionAuth = async (req, res, next) => {
    try {
        const tenantId = process.env.TENANT_ID;
        const ownerId = req.user.ownerId || req.user.userId;

        if (!tenantId || !ownerId) {
            return res.status(401).json({ msg: "Missing tenant or owner context" });
        }

        const ownerDoc = await db.collection('SwordNexBillingSoftware')
            .doc(tenantId)
            .collection('owner')
            .doc(ownerId)
            .get();

        if (!ownerDoc.exists) {
            return res.status(404).json({ msg: "Owner account not found" });
        }

        const ownerData = ownerDoc.data();
        const subStatus = ownerData.subscription?.status || 'Inactive';
        const subEndDate = ownerData.subscription?.endDate ? new Date(ownerData.subscription.endDate) : null;
        const now = new Date();

        if (subStatus !== 'Active' || (subEndDate && subEndDate < now)) {
            return res.status(403).json({
                msg: "Subscription is inactive or expired. Please contact the administrator.",
                subscriptionStatus: subStatus
            });
        }

        next();
    } catch (err) {
        console.error("Subscription Auth Error:", err.message);
        res.status(500).json({ msg: "Server error during subscription validation" });
    }
};

module.exports = subscriptionAuth;
