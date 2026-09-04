const admin = require('firebase-admin');
const db = require('./models');
require('dotenv').config();

// Initialize Firebase Admin
try {
    admin.initializeApp();
} catch (e) {
    // If already initialized
}

async function cleanGhostUser(email) {
    try {
        console.log(`Checking status for ${email}...`);

        // 1. Check SQL Database
        const sqlUser = await db.User.findOne({ where: { email } });

        if (sqlUser) {
            console.log(`User exists in SQL Database (ID: ${sqlUser.id}). This is NOT a ghost user in the traditional sense.`);
            console.log("However, if you want to reuse this email for a new signup test, we must delete it.");

            // Delete SQL Records
            await db.Invoice.destroy({ where: { tenant_id: sqlUser.tenant_id } });
            await db.Site.destroy({ where: { tenant_id: sqlUser.tenant_id } });
            await db.Subscription.destroy({ where: { tenant_id: sqlUser.tenant_id } });
            await db.User.destroy({ where: { id: sqlUser.id } });
            await db.Tenant.destroy({ where: { id: sqlUser.tenant_id } });

            console.log("Deleted User and Tenant from SQL.");

            // Delete Firebase User from Default Project
            try {
                const firebaseUser = await admin.auth().getUserByEmail(email);
                await admin.auth().deleteUser(firebaseUser.uid);
                console.log("Deleted User from Firebase (Default Project).");
            } catch (e) {
                if (e.code !== 'auth/user-not-found') {
                    console.log("Error checking default project users:", e.message);
                }
            }

            // Delete Firebase User from Tenant
            const tenantId = "SwordNexBilling-4pzp8";
            try {
                const tenantAuth = admin.auth().tenantManager().authForTenant(tenantId);
                const tenantUser = await tenantAuth.getUserByEmail(email);
                await tenantAuth.deleteUser(tenantUser.uid);
                console.log(`Deleted User from Firebase Tenant (${tenantId}).`);
            } catch (e) {
                if (e.code !== 'auth/user-not-found') {
                    console.log(`Error checking tenant ${tenantId} users:`, e.message);
                }
            }

            console.log("Cleanup complete. You can sign up again.");

        } else {
            console.log("User NOT found in SQL Database.");

            // 2. Check Firebase (DEFAULT PROJECT)
            try {
                console.log("Checking Default Project Users...");
                const firebaseUser = await admin.auth().getUserByEmail(email);
                console.log(`[Default Project] User found (UID: ${firebaseUser.uid}). Deleting...`);
                await admin.auth().deleteUser(firebaseUser.uid);
                console.log("[Default Project] User deleted.");
            } catch (fbError) {
                if (fbError.code === 'auth/user-not-found') {
                    console.log("[Default Project] User not found.");
                } else {
                    console.error("[Default Project] Error:", fbError);
                }
            }

            // 3. Check Firebase (SPECIFIC TENANT)
            const tenantId = "SwordNexBilling-4pzp8"; // From your frontend config
            try {
                console.log(`Checking Tenant '${tenantId}' Users...`);
                const tenantAuth = admin.auth().tenantManager().authForTenant(tenantId);
                const tenantUser = await tenantAuth.getUserByEmail(email);

                console.log(`[Tenant ${tenantId}] User found (UID: ${tenantUser.uid}). Deleting...`);
                await tenantAuth.deleteUser(tenantUser.uid);
                console.log(`[Tenant ${tenantId}] User deleted.`);

            } catch (tenantError) {
                if (tenantError.code === 'auth/user-not-found') {
                    console.log(`[Tenant ${tenantId}] User not found.`);
                } else if (tenantError.code === 'auth/tenant-not-found') {
                    console.log(`[Tenant ${tenantId}] Tenant not found. Configuration might be wrong or you are on Spark plan.`);
                } else {
                    console.error(`[Tenant ${tenantId}] Error:`, tenantError);
                }
            }
        }
    } catch (error) {
        console.error("Critical Error:", error);
    } finally {
        process.exit();
    }
}

const emailToCheck = 'najbudeendeen@gmail.com';
cleanGhostUser(emailToCheck);
