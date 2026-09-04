const admin = require('firebase-admin');

// Point to Emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.GCLOUD_PROJECT = 'swordnex-softwares';

// Initialize Admin (if not already done in config/firebase, but here we do it explicitly to be sure)
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'swordnex-softwares'
    });
}

const db = admin.firestore();

async function runDebug() {
    console.log("Attempting Collection Group Query on 'owners' for userId...");
    try {
        const query = db.collectionGroup('owners').where('userId', '==', 'test_uid_123');
        const snapshot = await query.get();
        console.log(`Query Successful! Found ${snapshot.size} documents.`);
    } catch (error) {
        console.error("Query FAILED!");
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);
        console.error("Full Error:", JSON.stringify(error, null, 2));
    }
}

runDebug();
