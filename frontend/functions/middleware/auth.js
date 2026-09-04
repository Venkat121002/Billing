const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Use a stable secret across this runtime; prefer env, fallback to hashed constant
const JWT_SECRET = global.JWT_SECRET || (global.JWT_SECRET = (process.env.JWT_SECRET || crypto.createHash('sha256').update('SwordNexBilling-Auth').digest('hex')));

const auth = (req, res, next) => {
    // 1. Try x-auth-token header
    let token = req.header('x-auth-token');

    // 2. Try Authorization: Bearer <token>
    if (!token) {
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        console.warn('⚠️ [Functions] No token received in request headers:', req.headers);
        return res.status(401).json({ error: 'No token provided', msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;

        // Ensure multi-tenancy context is passed if available
        if (decoded.user.tenant_id) req.tenant_id = decoded.user.tenant_id;
        if (decoded.user.site_id) req.site_id = decoded.user.site_id;

        next();
    } catch (err) {
        // Return JSON 401/403
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

module.exports = auth;
