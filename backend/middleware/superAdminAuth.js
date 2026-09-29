const jwt = require('jsonwebtoken');

// Guards /superadmin/* routes. Separate from the tenant auth middleware
// (firestoreAuth.js) — a superadmin token carries no ownerId/tenantId and
// must never be accepted on tenant-scoped routes, or vice versa.
module.exports = function (req, res, next) {
    const token = req.header('x-auth-token') || req.query['x-auth-token'] || req.body?.['x-auth-token'];

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'superadmin') {
            return res.status(403).json({ msg: 'Access denied. Super admin privileges required.' });
        }

        req.superAdmin = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
