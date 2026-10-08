const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { SubUser: SubUserModel } = require('../models/mongodb');

const DB_TYPE = process.env.DB_TYPE || 'mongodb';

// A sub-user's token stays cryptographically valid until it expires (up to 30
// days with "remember me"), so check on every request that the staff account
// still exists under the same owner. Deleting a staff member then cuts off
// their access immediately.
async function subUserStillExists({ userId, subuserId, ownerId }) {
    const id = subuserId || userId;
    const tenantId = process.env.TENANT_ID;
    if (!id || !ownerId || !tenantId) return false;

    if (DB_TYPE === 'mongodb') {
        return !!(await SubUserModel.exists({ userId: id, ownerId, tenantId }));
    }
    const doc = await db.collection('SwordNexBillingSoftware').doc(tenantId)
        .collection('owner').doc(ownerId)
        .collection('subuser').doc(id)
        .get();
    return doc.exists;
}

module.exports = async function (req, res, next) {
    // Get token from header (x-auth-token or Authorization Bearer), query, or body
    const authHeader = req.header('Authorization') || req.header('authorization');
    const bearerToken = authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.substring(7).trim() : null;
    const rawToken = req.header('x-auth-token') || bearerToken || req.query['x-auth-token'] || req.body?.['x-auth-token'];
    const token = (rawToken && rawToken !== 'null' && rawToken !== 'undefined') ? rawToken : null;

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }


    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ msg: 'Token is not valid' });
    }
    if (!decoded.user) {
        return res.status(401).json({ msg: 'Token is not valid' });
    }

    req.user = decoded.user;
    req.ownerId = decoded.user.ownerId;
    req.subuserId = decoded.user.subuserId;
    req.role = decoded.user.role;

    if (decoded.user.role === 'subuser') {
        try {
            if (!(await subUserStillExists(decoded.user))) {
                return res.status(401).json({ msg: 'This staff account has been removed. Please contact the store owner.' });
            }
        } catch (err) {
            console.error('Auth sub-user check failed:', err.message);
            return res.status(500).json({ msg: 'Server error during authentication' });
        }
    }

    next();
};
