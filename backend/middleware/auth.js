const jwt = require('jsonwebtoken');

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
        console.warn('⚠️ No token received in request headers:', req.headers);
        return res.status(401).json({ error: 'No token provided', msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        // Multi-tenancy context
        if (decoded.user.tenant_id) req.tenant_id = decoded.user.tenant_id;
        if (decoded.user.site_id) req.site_id = decoded.user.site_id;

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

module.exports = auth;
