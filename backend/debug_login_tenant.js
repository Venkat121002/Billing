const fetch = require('node-fetch');
require('dotenv').config({ path: './.env.custom' });

const STANDALONE_URL = 'http://127.0.0.1:5003/api/v2';

async function testLogin(baseUrl) {
    console.log(`Testing Login on ${baseUrl}`);
    try {
        // Use the user we created earlier or a known user
        // If "MeTest_" user exists from previous step, we can try to reuse or just create a new one.
        // Let's create a new one to be sure.
        const timestamp = Date.now();
        const email = `login_test_${timestamp}@example.com`;
        const password = "Password123!";

        // 1. Register
        console.log("1. Registering...");
        await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessName: `LoginTest_${timestamp}`,
                firstName: "Login",
                lastName: "Tester",
                email: email,
                password: password,
                mobile: "9876543210",
                plan: "Basic"
            })
        });

        // 2. Login
        console.log("2. Logging in...");
        const res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await res.json();
        console.log(`Login Status: ${res.status}`);

        if (res.status === 200) {
            console.log("User Data from Login Response:");
            console.log(JSON.stringify(data.user, null, 2));

            if (data.user && data.user.Tenant) {
                console.log("✅ SUCCESS: Tenant object is present in login response!");
                console.log("Subscription Status:", data.user.Tenant.subscription_status);
            } else {
                console.log("❌ FAILURE: Tenant object is MISSING in login response!");
            }
        } else {
            console.log("Login Failed:", data);
        }

    } catch (e) {
        console.error('Test error:', e.message);
    }
}

(async () => {
    console.log('--- Testing Login Response ---');
    await testLogin(STANDALONE_URL);
})();
