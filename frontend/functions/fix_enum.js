const db = require('./models');

async function fixEnum() {
    try {
        console.log("Attempting to add 'Premium' to enum...");
        await db.sequelize.query("ALTER TYPE \"enum_tenants_subscription_plan\" ADD VALUE 'Premium';");
        console.log("Successfully added 'Premium' to enum.");
    } catch (err) {
        console.error("Error updating enum (might already exist):", err.message);
    } finally {
        process.exit();
    }
}

fixEnum();
