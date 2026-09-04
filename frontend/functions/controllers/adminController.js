const initAdmin = () => {
    // const db = require('../models');
    return {
        db,
        User: db.User,
        Tenant: db.Tenant
    };
};

exports.getAllTenants = async (req, res) => {
    try {
        const { Tenant, User } = initAdmin();
        const tenants = await Tenant.findAll({
            include: [{
                model: User,
                where: { role: 'TenantAdmin' },
                required: false
            }],
            order: [['createdAt', 'DESC']]
        });

        // Format data to match what the frontend expects (or close to it)
        const formattedTenants = await Promise.all(tenants.map(async tenant => {
            const users = tenant.Users || tenant.users || [];
            const adminUser = users.length > 0 ? users[0] : {};

            let parsedAddress = { city: 'N/A', state: 'N/A', country: 'N/A' };
            try {
                if (tenant.address) {
                    parsedAddress = JSON.parse(tenant.address);
                }
            } catch (e) {
                // If not JSON, maybe plain string or invalid
            }

            const userCount = await User.count({ where: { tenant_id: tenant.id } });

            return {
                id: tenant.id,
                businessName: tenant.name,
                email: tenant.email,
                businessType: 'N/A',
                businessCategory: 'N/A',
                numberOfEmployees: userCount,
                address: parsedAddress,
                gstin: tenant.gstin || 'N/A',
                createdAt: tenant.createdAt,
                subscription_plan: tenant.subscription_plan,
                subscription_status: tenant.subscription_status,
                logoUrl: null // Add if available
            };
        }));

        res.json(formattedTenants);
    } catch (err) {
        console.error("Get All Tenants Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const { User, Tenant } = initAdmin();
        const users = await User.findAll({
            include: [{ model: Tenant }],
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (err) {
        console.error("Get All Users Error:", err);
        res.status(500).send("Server Error");
    }
};
