const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const SuperAdmin = db.SuperAdmin;

// Register SuperAdmin
exports.register = async (req, res) => {
    const { name, email, password, secretKey } = req.body;

    try {
        // Validate secret key (for security)
        // const SUPER_ADMIN_SECRET = process.env.SUPER_ADMIN_SECRET || 'SWORDNEX_SUPER_2024';
        // if (secretKey !== SUPER_ADMIN_SECRET) {
        //     return res.status(403).json({ msg: 'Invalid secret key. Unauthorized registration.' });
        // }

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ msg: 'Please provide all required fields' });
        }

        // Check if SuperAdmin already exists
        const existingAdmin = await SuperAdmin.findOne({ where: { email } });
        if (existingAdmin) {
            return res.status(400).json({ msg: 'SuperAdmin with this email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create SuperAdmin
        const superAdmin = await SuperAdmin.create({
            name,
            email,
            password: hashedPassword
        });

        // Generate JWT
        const payload = {
            superAdmin: {
                id: superAdmin.id,
                email: superAdmin.email,
                role: 'SuperAdmin'
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    superAdmin: {
                        id: superAdmin.id,
                        name: superAdmin.name,
                        email: superAdmin.email,
                        role: 'SuperAdmin'
                    }
                });
            }
        );
    } catch (err) {
        console.error('SuperAdmin registration error:', err);
        res.status(500).json({ msg: 'Server error during registration' });
    }
};

// Login SuperAdmin
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ msg: 'Please provide email and password' });
        }

        // Find SuperAdmin
        const superAdmin = await SuperAdmin.findOne({ where: { email } });
        if (!superAdmin) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if active
        if (!superAdmin.isActive) {
            return res.status(403).json({ msg: 'Account is deactivated' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, superAdmin.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Generate JWT
        const payload = {
            superAdmin: {
                id: superAdmin.id,
                email: superAdmin.email,
                role: 'SuperAdmin'
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    superAdmin: {
                        id: superAdmin.id,
                        name: superAdmin.name,
                        email: superAdmin.email,
                        role: 'SuperAdmin'
                    }
                });
            }
        );
    } catch (err) {
        console.error('SuperAdmin login error:', err);
        res.status(500).json({ msg: 'Server error during login' });
    }
};

// Get all tenant admins
exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await db.User.findAll({
            where: { role: 'TenantAdmin' },
            include: [{
                model: db.Tenant,
                attributes: ['businessName', 'businessType', 'subscription_plan', 'subscription_status', 'createdAt']
            }],
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });

        res.json(admins);
    } catch (err) {
        console.error('Error fetching admins:', err);
        res.status(500).json({ msg: 'Server error fetching admins' });
    }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
    try {
        const totalAdmins = await db.User.count({ where: { role: 'TenantAdmin' } });
        const totalTenants = await db.Tenant.count();
        const activeTenants = await db.Tenant.count({ where: { subscription_status: 'active' } });
        const pendingTenants = await db.Tenant.count({ where: { subscription_status: 'pending' } });

        res.json({
            totalAdmins,
            totalTenants,
            activeTenants,
            pendingTenants
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ msg: 'Server error fetching statistics' });
    }
};
