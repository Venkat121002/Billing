const fetch = require('node-fetch');

// Try both ports? User failed on 5001.
const EMULATOR_URL = 'http://127.0.0.1:5001/swordnex-softwares/us-central1/api/api/v2/auth/login';
const STANDALONE_URL = 'http://127.0.0.1:5003/api/v2/auth/login';

async function registerUser(url) {
    console.log(`Registering User on ${url}`);
    try {
        const timestamp = Date.now();
        const res = await fetch(url.replace('login', 'register'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessName: `DebugBiz_${timestamp}`,
                firstName: "Debug",
                lastName: "User",
                email: `debug_user_${timestamp}@example.com`,
                password: "Password123!",
                mobile: "1234567890",
                plan: "Basic"
            })
        });
        const data = await res.json();
        console.log(`Register Status: ${res.status}`);
        if (res.status === 200) {
            console.log('User registered, creating checking login...');
            return `debug_user_${timestamp}@example.com`;
        } else {
            console.log('Register failed:', data);
            return null;
        }
    } catch (e) {
        console.error('Register error:', e.message);
        return null;
    }
}

async function testLogin(url, label, email) {
    if (!email) {
        console.log('Skipping login test due to registration failure');
        return;
    }
    console.log(`Testing Login on ${label}: ${url}`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: 'Password123!'
            })
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error(`Error connecting to ${label}:`, e.message);
    }
}

(async () => {
    // Test on Standalone mostly since Emulator 5001 is broken for me
    const email = await registerUser(STANDALONE_URL);
    await testLogin(STANDALONE_URL, 'Standalone', email);
})();
