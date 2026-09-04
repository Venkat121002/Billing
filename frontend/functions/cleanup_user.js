require('dotenv').config();
const db = require('./models');
const User = db.User;
const Tenant = db.Tenant;
const Invoice = db.Invoice;
const Site = db.Site;
const Subscription = db.Subscription;

async function deleteCleanUser() {
    const email = 'najbudeendeen@gmail.com';
    console.log(`Attempting to clean up user: ${email}...`);

    const t = await db.sequelize.transaction();

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log('User not found. checking for orphan tenant...');
            const tenant = await Tenant.findOne({ where: { email } });
            if (tenant) {
                console.log(`Found orphan tenant ${tenant.id}. Deleting...`);
                await Invoice.destroy({ where: { tenant_id: tenant.id }, transaction: t });
                await Site.destroy({ where: { tenant_id: tenant.id }, transaction: t });
                if (Subscription) await Subscription.destroy({ where: { tenant_id: tenant.id }, transaction: t }); // Check if model exists
                await tenant.destroy({ transaction: t });
                await t.commit();
                console.log("Orphan tenant deleted.");
            } else {
                console.log("Nothing to clean.");
                await t.rollback();
            }
            return;
        }

        const tenantId = user.tenant_id;
        console.log(`User found. Tenant ID: ${tenantId}. Deleting everything...`);

        // Check if tenant exists
        const tenant = await Tenant.findByPk(tenantId);

        // Delete related data
        await Invoice.destroy({ where: { tenant_id: tenantId }, transaction: t });
        await Site.destroy({ where: { tenant_id: tenantId }, transaction: t });
        if (Subscription) await Subscription.destroy({ where: { tenant_id: tenantId }, transaction: t });

        // Delete User
        await User.destroy({ where: { tenant_id: tenantId }, transaction: t });

        // Delete Tenant
        if (tenant) {
            await tenant.destroy({ transaction: t });
        }

        await t.commit();
        console.log("Cleanup successful! User can now sign up again.");

    } catch (error) {
        await t.rollback();
        console.error("Cleanup failed:", error);
    } finally {
        setTimeout(() => process.exit(), 1000);
    }
}

deleteCleanUser();
