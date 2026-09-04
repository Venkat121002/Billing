const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header, query, or body
    const token = req.header('x-auth-token') || req.query['x-auth-token'] || req.body['x-auth-token'];

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
