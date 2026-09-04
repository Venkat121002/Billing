const initUser = () => {
    const bcrypt = require('bcryptjs');
    const db = require('../models');
    const PLAN_LIMITS = require('../config/plans');

    return {
        bcrypt,
        db,
        User: db.User,
        Tenant: db.Tenant,
        UserSession: db.UserSession,
        PLAN_LIMITS
    };
};

exports.createUser = async (req, res) => {
    const { bcrypt, User, Tenant, PLAN_LIMITS } = initUser();
    const { name, email, password, role, location, employee_id } = req.body;
    const tenantId = req.user.tenant_id;

    try {
        // 1. Check if user already exists
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // 2. Get Tenant and Subscription Plan
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({ msg: 'Tenant not found' });
        }

        // 3. Count existing users for this tenant
        const userCount = await User.count({ where: { tenant_id: tenantId } });

        // 4. Define Limits using Configuration
        let limit = 1; // Default safe limit
        const plan = tenant.subscription_plan; // 'Trial', 'Standard', 'Premium'

        if (PLAN_LIMITS[plan]) {
            limit = PLAN_LIMITS[plan].userLimit;
        } else {
            console.warn(`Unknown plan '${plan}' for tenant ${tenantId}. Defaulting to limit 1.`);
        }

        // 5. Check Limit
        if (userCount >= limit) {
            return res.status(403).json({
                msg: `User limit reached for ${plan} plan. Upgrade to add more users.`
            });
        }

        // 6. Create User
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({ msg: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await User.create({
            name,
            email,
            password: hashedPassword,
            tenant_id: tenantId,
            role: role || 'User', // Default to 'User' if not specified
            site_id: req.user.site_id, // Assign to same site as admin for now
            location: location || null,
            employee_id: employee_id || null // Ensure empty string becomes null for unique constraint
        });

        const userResponse = user.toJSON ? user.toJSON() : user;
        delete userResponse.password;

        res.json(userResponse);

    } catch (err) {
        console.error("Create User Error:", err);
        res.status(500).json({ msg: err.message });
    }
};

exports.getSubUsers = async (req, res) => {
    try {
        const { User } = initUser();
        if (!req.user.tenant_id) {
            console.error("Security Alert: User has no tenant_id in token!");
            return res.status(403).json({ msg: "Tenant Context Verification Failed. Please re-login." });
        }

        const users = await User.findAll({
            where: { tenant_id: req.user.tenant_id },
            attributes: { exclude: ['password'] } // Exclude password for security
        });
        res.json(users);
    } catch (err) {
        console.error("Get SubUsers Error:", err);
        res.status(500).send('Server SubUsers error');
    }
};

exports.getUserSessions = async (req, res) => {
    try {
        const { UserSession, User } = initUser();
        if (!req.user.tenant_id) {
            return res.status(403).json({ msg: "Tenant Context Missing" });
        }

        const sessions = await UserSession.findAll({
            where: { tenant_id: req.user.tenant_id },
            include: [{ model: User, attributes: ['name', 'email', 'employee_id'] }],
            order: [['login_time', 'DESC']]
        });
        res.json(sessions);
    } catch (err) {
        console.error("Get Sessions Error:", err);
        res.status(500).send('Server error');
    }
};

// Update Sub-User
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, password, location, employee_id } = req.body;
    const tenantId = req.user.tenant_id;
    const { User, bcrypt } = initUser();

    try {
        const user = await User.findOne({ where: { id, tenant_id: tenantId } });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.location = location || user.location;
        user.employee_id = employee_id || user.employee_id;

        if (password) {
            const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!strongPasswordRegex.test(password)) {
                return res.status(400).json({ msg: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.' });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        const userResponse = user.toJSON ? user.toJSON() : user;
        delete userResponse.password;

        res.json(userResponse);

    } catch (err) {
        console.error("Update User Error:", err);
        res.status(500).send("Server Error");
    }
};

// Delete Sub-User
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const { User } = initUser();

    try {
        const user = await User.findOne({ where: { id, tenant_id: tenantId } });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (user.id === req.user.id) {
            return res.status(400).json({ msg: "Cannot delete yourself" });
        }

        await user.destroy();
        res.json({ msg: "User deleted successfully" });

    } catch (err) {
        console.error("Delete User Error:", err);
        res.status(500).send("Server Error");
    }
};
