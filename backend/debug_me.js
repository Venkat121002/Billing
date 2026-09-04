const fetch = require('node-fetch');
require('dotenv').config({ path: './.env.custom' });

const STANDALONE_URL = 'http://127.0.0.1:5003/api/v2';

async function registerUser(baseUrl) {
    console.log(`Registering User on ${baseUrl}`);
    const timestamp = Date.now();
    try {
        const res = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessName: `MeTest_${timestamp}`,
                firstName: "Me",
                lastName: "Tester",
                email: `me_test_${timestamp}@example.com`,
                password: "Password123!",
                mobile: "1234567890",
                plan: "Basic"
            })
        });
        const data = await res.json();
        if (res.status === 200) {
            return data.token;
        } else {
            console.log('Register failed:', data);
            return null;
        }
    } catch (e) {
        console.error('Register error:', e.message);
        return null;
    }
}

async function getMe(baseUrl, token) {
    console.log(`Calling GET /auth/me on ${baseUrl}`);
    try {
        const res = await fetch(`${baseUrl}/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log(`Body:`, JSON.stringify(data, null, 2));

        if (data.Tenant) {
            console.log("✅ Tenant object found!");
        } else {
            console.log("❌ Tenant object MISSING!");
        }

    } catch (e) {
        console.error(`Error calling /me:`, e.message);
    }
}

(async () => {
    console.log('--- Testing /auth/me ---');
    const token = await registerUser(STANDALONE_URL);
    if (token) {
        await getMe(STANDALONE_URL, token);
    }
})();
