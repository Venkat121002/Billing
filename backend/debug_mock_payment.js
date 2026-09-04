const fetch = require('node-fetch');
require('dotenv').config({ path: './.env.custom' });

const STANDALONE_URL = 'http://127.0.0.1:5003/api/v2';

async function testMockFlow(baseUrl) {
    console.log(`Testing Mock Payment Flow on ${baseUrl}`);

    // 1. Login to get token (using our generic test user logic)
    // We'll just register a new one to be quick
    const timestamp = Date.now();
    const email = `mock_test_${timestamp}@example.com`;
    let token = null;

    try {
        console.log("1. Registering user...");
        const regRes = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessName: `MockCorp_${timestamp}`,
                firstName: "Mock",
                lastName: "Tester",
                email: email,
                password: "Password123!",
                mobile: "0000000000",
                plan: "Basic"
            })
        });
        const regData = await regRes.json();
        token = regData.token;
        if (!token) throw new Error("Registration failed");
        console.log("   User registered.");

        // 2. Create Order
        console.log("2. Creating Subscription Order...");
        const orderRes = await fetch(`${baseUrl}/billing/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({
                plan: "standard",
                billingCycle: "yearly"
            })
        });
        const orderData = await orderRes.json();
        console.log("   Order Response:", JSON.stringify(orderData, null, 2));

        if (orderData.isMock) {
            console.log("✅ SUCCESS: Backend returned Mock Order.");
        } else {
            console.log("❌ FAILURE: Backend did NOT return Mock Order. Secret might be valid?");
            return;
        }

        // 3. Verify Mock Payment
        console.log("3. Verifying Mock Payment...");
        const verifyRes = await fetch(`${baseUrl}/billing/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({
                paymentId: `pay_mock_${timestamp}`,
                orderId: orderData.orderId,
                signature: 'mock_signature_ignored',
                plan: "standard",
                billingCycle: "yearly",
                amount: orderData.amount / 100
            })
        });
        const verifyData = await verifyRes.json();
        console.log("   Verify Response:", verifyData);

        if (verifyRes.status === 200) {
            console.log("✅ SUCCESS: Mock Payment Verified.");
        } else {
            console.log("❌ FAILURE: Mock Payment Verification Failed.");
        }

    } catch (e) {
        console.error('Test error:', e.message);
    }
}

(async () => {
    await testMockFlow(STANDALONE_URL);
})();
