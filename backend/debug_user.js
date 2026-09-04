const { Sequelize } = require('sequelize');
const db = require('./models');

async function checkUser() {
    try {
        const user = await db.User.findOne({
            where: { email: 'trialuser@example.com' },
            include: [{ model: db.Tenant }]
        });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User Details:');
        console.log(JSON.stringify(user.toJSON(), null, 2));

        const tenant = user.Tenant;
        if (tenant) {
            console.log('\nTenant Details:');
            console.log('Plan:', tenant.subscription_plan);
            console.log('Status:', tenant.subscription_status);
            console.log('Expiry:', tenant.subscription_expiry);

            const now = new Date();
            const expiry = new Date(tenant.subscription_expiry);
            console.log('Current Time:', now);
            console.log('Is Expired?:', now > expiry);
        } else {
            console.log('No Tenant found for user');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkUser();
