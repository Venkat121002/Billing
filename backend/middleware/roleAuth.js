/**
 * Middleware to restrict access based on user role.
 * @param {Array} roles - Array of allowed roles (e.g., ['owner', 'subuser'])
 */
const roleAuth = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ msg: "Authentication required" });
        }

        const userRole = req.user.role;

        if (roles.includes(userRole)) {
            next();
        } else {
            res.status(403).json({ msg: `Access denied. Role '${userRole}' is not authorized for this action.` });
        }
    };
};

module.exports = roleAuth;
