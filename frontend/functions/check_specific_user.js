require('dotenv').config();
const db = require('./models');
const User = db.User;
const Tenant = db.Tenant;

async function checkUserStatus() {
    try {
        const email = 'najbudeendeen@gmail.com';
        console.log(`Checking status for ${email}...`);

        const user = await User.findOne({
            where: { email },
            include: [{ model: Tenant }]
        });

        if (!user) {
            console.log('User not found in SQL database.');
            // Also check if Tenant exists with this email (orphan tenant)
            const tenant = await Tenant.findOne({ where: { email } });
            if (tenant) {
                console.log('Orphan Tenant found with this email:', tenant.toJSON());
            } else {
                console.log('No Tenant found with this email either.');
            }
            return;
        }

        console.log(`User Found: ID: ${user.id}, Tenant ID: ${user.tenant_id}`);

        if (user.Tenant) {
            console.log('Tenant Details:');
            console.log(`  ID: ${user.Tenant.id}`);
            console.log(`  Name: ${user.Tenant.name}`);
            console.log(`  Plan: ${user.Tenant.subscription_plan}`);
            console.log(`  Status: ${user.Tenant.subscription_status}`);
        } else {
            console.log('No Tenant associated with this user.');
        }

    } catch (error) {
        console.error('Error checking user status:', error);
    } finally {
        // Exit process
        setTimeout(() => process.exit(), 1000);
    }
}

checkUserStatus();
