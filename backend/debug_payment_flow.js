const fetch = require('node-fetch');

// Emulator URL from logs (Note: function is 'api', express mounts '/api/v2')
const API_URL = 'http://127.0.0.1:5001/swordnex-softwares/us-central1/api/api/v2';

async function testPaymentFlow() {
    console.log(`Testing Payment Flow on ${API_URL}`);

    const timestamp = Date.now();
    const email = `pay_test_${timestamp}@example.com`;

    try {
        console.log("1. Registering user...");
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessName: `PayCorp_${timestamp}`,
                firstName: "Pay",
                lastName: "Tester",
                email: email,
                password: "Password123!",
                mobile: "0000000000"
            })
        });

        let regData;
        try {
            regData = await regRes.json();
        } catch (e) {
            console.error("Failed to parse registration response:", await regRes.text());
            return;
        }

        if (!regData.token) {
            console.error("❌ Registration failed:", JSON.stringify(regData, null, 2));
            return;
        }
        console.log("   User registered. Owner ID:", regData.user.ownerId);

        console.log("2. Creating Subscription Order (Standard Yearly)...");
        const orderRes = await fetch(`${API_URL}/billing/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': regData.token
            },
            body: JSON.stringify({
                plan: 'standard',
                billingCycle: 'yearly'
            })
        });

        console.log(`   Response Status: ${orderRes.status}`);
        const orderText = await orderRes.text();
        console.log(`   Response Body: ${orderText}`);

        if (orderRes.status === 200) {
            console.log("✅ SUCCESS: Order created.");
        } else {
            console.log("❌ FAILURE: Order creation failed.");
        }

    } catch (e) {
        console.error('Test error:', e.message);
    }
}

(async () => {
    await testPaymentFlow();
})();
