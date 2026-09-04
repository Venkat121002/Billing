require('dotenv').config();
const db = require('./models');
const User = db.User;
const Tenant = db.Tenant;

async function checkUserStatus() {
    try {
        const email = 'khajanajbudeen.deen@gmail.com';
        console.log(`Checking status for ${email}...`);

        const user = await User.findOne({
            where: { email },
            include: [{ model: Tenant }]
        });

        if (!user) {
            console.log('User not found in SQL database.');
            return;
        }

        console.log(`User Found: ID: ${user.id}, Tenant ID: ${user.tenant_id}`);

        if (user.Tenant) {
            console.log('Tenant Details:');
            console.log(`  ID: ${user.Tenant.id}`);
            console.log(`  Name: ${user.Tenant.name}`);
            console.log(`  Plan: ${user.Tenant.subscription_plan}`);
            console.log(`  Status: ${user.Tenant.subscription_status}`);
            console.log(`  Expiry: ${user.Tenant.subscription_expiry}`);
        } else {
            console.log('No Tenant associated with this user.');
        }

    } catch (error) {
        console.error('Error checking user status:', error);
    } finally {
        // Close DB connection if needed, though script exit handles it usually
        process.exit();
    }
}
checkUserStatus();
