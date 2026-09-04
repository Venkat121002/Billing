const db = require('./models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

async function testLogin() {
    try {
        console.log('Authenticating DB...');
        await db.sequelize.authenticate();
        console.log('Connected.');

        // 1. Find a user that is NOT a TenantAdmin (a sub-user)
        const subUser = await db.User.findOne({
            where: { role: 'User' },
            include: [{ model: db.Tenant }]
        });

        if (!subUser) {
            console.log('No sub-users found to test.');
            process.exit(0);
        }

        console.log(`Testing login for sub-user: ${subUser.email} / ${subUser.employee_id}`);

        // 2. Simulate the controller logic
        const identifier = subUser.employee_id || subUser.email;
        console.log(`Using identifier: ${identifier}`);

        const potentialUsers = await db.User.findAll({
            where: {
                [Op.or]: [
                    { email: identifier },
                    { employee_id: identifier }
                ]
            },
            include: [{ model: db.Tenant }]
        });

        console.log(`Found ${potentialUsers.length} matches.`);

        if (potentialUsers.length === 0) {
            console.error('Logic FAILED: Could not find user by identifier.');
        } else {
            console.log('Logic SUCCESS: Found user(s) by identifier.');
            // We can't test password match without knowing the raw password, 
            // but finding the user is the key part of the fix.
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testLogin();
