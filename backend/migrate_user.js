const { db } = require('./config/firebase'); // Uses existing config
const admin = require('firebase-admin');

// Target User UID from your logs
const TARGET_UID = 'Dr4quzHlXPbegOtvF0e9AKfD5ls2';

async function migrateUser() {
    console.log(`Searching for user ${TARGET_UID} in tenants...`);

    try {
        const tenantsSnapshot = await db.collection('SwordNexBillingSoftware').get();
        if (tenantsSnapshot.empty) {
            console.log("No tenants found.");
            return;
        }

        let found = false;

        for (const tenantDoc of tenantsSnapshot.docs) {
            const ownerId = tenantDoc.id;
            const ownerDocRef = tenantDoc.ref.collection('owners').doc(TARGET_UID);
            const ownerDoc = await ownerDocRef.get();

            if (ownerDoc.exists) {
                console.log(`Found user in tenant: ${ownerId}`);
                const data = ownerDoc.data();

                // Create Record in 'users' collection
                await db.collection('users').doc(TARGET_UID).set({
                    ownerId: ownerId,
                    role: data.role || 'user',
                    email: data.email,
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    createdAt: new Date().toISOString(), // Approximate
                    migratedAt: new Date().toISOString()
                });

                console.log(`Successfully migrated user ${data.email} to 'users' collection.`);
                found = true;
                break;
            }
        }

        if (!found) {
            console.log("User not found in any 'owners' subcollection directly by ID.");
            // Fallback: Scan all owners? (Expensive but okay for debug)
            // Not doing unless needed.
        }

    } catch (e) {
        console.error("Migration Error:", e);
    }
}

migrateUser();
