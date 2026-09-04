const app = require('./app');
const db = require('./models');
const bcrypt = require('bcryptjs');

async function createFixedUser() {
    const email = "demo@swordnex.com";
    const password = "Password123!";
    const tenantName = "Demo Business";
    const firebaseTenantId = "demo-tenant-id";

    try {
        // 1. Check if user exists
        let user = await db.User.findOne({ where: { email } });
        if (user) {
            console.log(`User ${email} already exists.`);
            // Reset password just in case
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();
            console.log(`Password reset to: ${password}`);
            return;
        }

        // 2. Create Tenant
        const tenant = await db.Tenant.create({
            name: tenantName,
            firebase_tenant_id: firebaseTenantId,
            email: email,
            subscription_plan: 'Trial',
            subscription_status: 'pending',
            subscription_expiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        });

        // 3. Create User
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await db.User.create({
            name: "Demo User",
            email,
            password: hashedPassword,
            tenant_id: tenant.id,
            role: 'TenantAdmin'
        });

        console.log("✅ Demo User Created Successfully!");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (error) {
        console.error("❌ Error creating user:", error);
    } finally {
        process.exit();
    }
}

createFixedUser();
