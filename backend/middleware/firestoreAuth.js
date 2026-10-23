const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { SubUser: SubUserModel, Owner: OwnerModel } = require('../models/mongodb');

const DB_TYPE = process.env.DB_TYPE || 'mongodb';
const OWNER_CACHE_MS = 60 * 1000;

const ownersCol = () => db.collection('owner');

// A token stays cryptographically valid until it expires (up to 30 days with
// "remember me"), so on every request we also check the account behind it:
//   - a staff login must still exist under the same owner (checked every
//     request, so deleting a staff member cuts their access immediately);
//   - a token issued before the account's last password change is rejected
//     (owners: looked up at most once a minute per server instance).
async function loadSubUser({ userId, subuserId, ownerId }) {
    const id = subuserId || userId;
    const tenantId = process.env.TENANT_ID;
    if (!id || !ownerId || !tenantId) return null;

    if (DB_TYPE === 'mongodb') {
        return SubUserModel.findOne({ userId: id, ownerId, tenantId }).select('passwordChangedAt').lean();
    }
    const doc = await ownersCol().doc(ownerId).collection('subuser').doc(id).get();
    return doc.exists ? doc.data() : null;
}

const ownerCache = new Map(); // userId -> { passwordChangedAt, expires }

async function ownerPasswordChangedAt(userId) {
    const hit = ownerCache.get(userId);
    if (hit && Date.now() < hit.expires) return hit.passwordChangedAt;

    let owner = null;
    if (DB_TYPE === 'mongodb') {
        owner = await OwnerModel.findOne({ userId, tenantId: process.env.TENANT_ID }).select('passwordChangedAt').lean();
    } else {
        const doc = await ownersCol().doc(userId).get();
        owner = doc.exists ? doc.data() : null;
    }
    const passwordChangedAt = owner?.passwordChangedAt || null;
    ownerCache.set(userId, { passwordChangedAt, expires: Date.now() + OWNER_CACHE_MS });
    return passwordChangedAt;
}

/** Drop a cached owner entry right after their password changes (this instance). */
function forgetAccount(userId) {
    ownerCache.delete(userId);
}

// True when the token was issued before the password was last changed.
const issuedBeforePasswordChange = (decoded, passwordChangedAt) =>
    !!passwordChangedAt && decoded.iat * 1000 < new Date(passwordChangedAt).getTime() - 1000;

async function auth(req, res, next) {
    // Header only: tokens in the URL or body end up in logs and browser history.
    const authHeader = req.header('Authorization') || req.header('authorization');
    const bearerToken = authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.substring(7).trim()
        : null;
    const rawToken = req.header('x-auth-token') || bearerToken;
    const token = rawToken && rawToken !== 'null' && rawToken !== 'undefined'
        ? rawToken
        : null;

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

    try {
        if (decoded.user.role === 'subuser') {
            const staff = await loadSubUser(decoded.user);
            if (!staff) {
                return res.status(401).json({ msg: 'This staff account has been removed. Please contact the store owner.' });
            }
            if (issuedBeforePasswordChange(decoded, staff.passwordChangedAt)) {
                return res.status(401).json({ msg: 'Your password was changed. Please sign in again.' });
            }
        } else if (decoded.user.userId) {
            if (issuedBeforePasswordChange(decoded, await ownerPasswordChangedAt(decoded.user.userId))) {
                return res.status(401).json({ msg: 'Your password was changed. Please sign in again.' });
            }
        }
    } catch (err) {
        console.error('Auth account check failed:', err.message);
        return res.status(500).json({ msg: 'Server error during authentication' });
    }

    return next();
}

module.exports = auth;
module.exports.forgetAccount = forgetAccount;
