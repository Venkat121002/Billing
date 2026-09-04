const db = require('./models');
const bcrypt = require('bcryptjs');

async function createTestUser() {
    try {
        await db.sequelize.sync({ alter: true });

        const email = 'testuser@example.com';
        const password = 'Password123!';
        const employeeId = 'EMP001';

        let user = await db.User.findOne({ where: { email } });
        if (user) {
            console.log('Test user already exists. Updating...');
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            user.employee_id = employeeId;
            await user.save();
        } else {
            console.log('Creating new test user...');
            const tenant = await db.Tenant.create({
                name: 'Test Business',
                email: 'business@example.com',
                subscription_plan: 'Trial',
                subscription_status: 'Active',
                subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = await db.User.create({
                name: 'Test User',
                email: email,
                password: hashedPassword,
                employee_id: employeeId,
                tenant_id: tenant.id,
                role: 'TenantAdmin'
            });
        }

        console.log('✅ Test User created/updated successfully!');
        console.log('📧 Email:', email);
        console.log('🆔 Employee ID:', employeeId);
        console.log('🔑 Password:', password);

    } catch (error) {
        console.error('❌ Error creating test user:', error);
    } finally {
        process.exit();
    }
}

createTestUser();
