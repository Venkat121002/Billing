const { db } = require('./config/firebase');

// The tenant ID found in the previous migration step for 'Dr4quzHlXPbegOtvF0e9AKfD5ls2'
const TARGET_OWNER_ID = 'ixl42rjp3bw254rvzctm';

async function resetSubscription() {
    console.log(`Resetting subscription for Tenant: ${TARGET_OWNER_ID}`);

    try {
        const tenantRef = db.collection('SwordNexBillingSoftware').doc(TARGET_OWNER_ID);
        const doc = await tenantRef.get();

        if (!doc.exists) {
            console.log("Tenant not found!");
            return;
        }

        const data = doc.data();
        console.log("Current Subscription Data:", JSON.stringify(data.subscription || "None", null, 2));

        // Clear subscription
        await tenantRef.update({
            subscription: null,
            trialUsed: false // Reset trial usage too so they can try it
        });

        console.log("Subscription and Trial status cleared successfully.");

    } catch (e) {
        console.error("Reset Error:", e);
    }
}

resetSubscription();
