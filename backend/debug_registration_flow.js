const fetch = require('node-fetch');
require('dotenv').config({ path: './.env.custom' });

const STANDALONE_URL = 'http://127.0.0.1:5003/api/v2';

async function testRegistrationFlow(baseUrl) {
    console.log(`Testing Registration Flow on ${baseUrl}`);

    const timestamp = Date.now();
    const email = `reg_test_${timestamp}@example.com`;

    try {
        console.log("1. Registering user...");
        const regRes = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessName: `RegCorp_${timestamp}`,
                firstName: "Reg",
                lastName: "Tester",
                email: email,
                password: "Password123!",
                mobile: "0000000000"
            })
        });
        const regData = await regRes.json();

        if (!regData.token) {
            console.error("❌ Registration failed:", JSON.stringify(regData));
            return;
        }
        console.log("   User registered. Owner ID:", regData.user.ownerId);

        // 2. Fetch User Details to check Subscription
        console.log("2. Fetching /auth/me to check default subscription...");
        const meRes = await fetch(`${baseUrl}/auth/me`, {
            method: 'GET',
            headers: {
                'x-auth-token': regData.token
            }
        });
        const meData = await meRes.json();

        const subStatus = meData.Tenant?.subscription_status;
        const subPlan = meData.Tenant?.subscription_plan;

        console.log(`   Subscription Status: ${subStatus}`);
        console.log(`   Subscription Plan: ${subPlan}`);

        if (subStatus === 'Inactive' && (!subPlan || subPlan === 'null' || subPlan === null)) {
            console.log("✅ SUCCESS: Default subscription is Inactive/Null as expected.");
        } else {
            console.log("❌ FAILURE: Default subscription is NOT Inactive/Null.");
        }

    } catch (e) {
        console.error('Test error:', e.message);
    }
}

(async () => {
    await testRegistrationFlow(STANDALONE_URL);
})();
