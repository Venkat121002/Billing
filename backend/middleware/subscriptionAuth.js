const { db } = require('../config/firebase');
const { Owner: OwnerModel } = require('../models/mongodb');

// Determine which database to use
const DB_TYPE = process.env.DB_TYPE || 'firestore';

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

        let subStatus, subEndDate;

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            const owner = await OwnerModel.findOne({ userId: ownerId, tenantId });

            if (!owner) {
                return res.status(404).json({ msg: "Owner account not found" });
            }

            subStatus = owner.subscription?.status || 'Inactive';
            subEndDate = owner.subscription?.endDate ? new Date(owner.subscription.endDate) : null;

        } else {
            // === FIRESTORE MODE ===
            const ownerDoc = await db.collection('SwordNexBillingSoftware')
                .doc(tenantId)
                .collection('owner')
                .doc(ownerId)
                .get();

            if (!ownerDoc.exists) {
                return res.status(404).json({ msg: "Owner account not found" });
            }

            const ownerData = ownerDoc.data();
            subStatus = ownerData.subscription?.status || 'Inactive';
            subEndDate = ownerData.subscription?.endDate ? new Date(ownerData.subscription.endDate) : null;
        }

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
