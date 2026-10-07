const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header (x-auth-token or Authorization Bearer), query, or body
    const authHeader = req.header('Authorization') || req.header('authorization');
    const bearerToken = authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.substring(7).trim() : null;
    const rawToken = req.header('x-auth-token') || bearerToken || req.query['x-auth-token'] || req.body?.['x-auth-token'];
    const token = (rawToken && rawToken !== 'null' && rawToken !== 'undefined') ? rawToken : null;

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }


    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded.user;
        req.ownerId = decoded.user.ownerId;
        req.subuserId = decoded.user.subuserId;
        req.role = decoded.user.role;

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
