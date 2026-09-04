const fetch = require('node-fetch');
require('dotenv').config({ path: './.env.custom' });
const { db } = require('./config/firebase');

const STANDALONE_URL = 'http://127.0.0.1:5003/api/v2';
// const EMULATOR_URL = 'http://127.0.0.1:5001/swordnex-softwares/us-central1/api/api/v2';

async function clearSubscription(email) {
    if (!email) return;
    console.log(`Clearing subscription for ${email}...`);
    try {
        // We need to find the user first to get ownerId? 
        // Or we can just find the owner doc directly if we know the ownerId. 
        // But we don't know ownerId easily without login response. 
        // Actually login response gives ownerId.
        // Let's rely on login response data in test.
    } catch (e) {
        console.error("Clear subs error", e);
    }
}

async function registerUser(baseUrl) {
    console.log(`Registering User on ${baseUrl}`);
    try {
        const timestamp = Date.now();
        const res = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessName: `TrialBiz_${timestamp}`,
                firstName: "Trial",
                lastName: "User",
                email: `trial_user_${timestamp}@example.com`,
                password: "Password123!",
                mobile: "1234567890",
                plan: "Basic"
            })
        });
        const data = await res.json();
        console.log(`Register Status: ${res.status}`);
        if (res.status === 200) {
            console.log('User registered.');
            return { token: data.token, ownerId: data.user.ownerId };
        } else {
            console.log('Register failed:', data);
            return null;
        }
    } catch (e) {
        console.error('Register error:', e.message);
        return null;
    }
}

async function resetSubscription(ownerId) {
    if (!ownerId) return;
    console.log(`Resetting subscription for ownerId: ${ownerId}`);
    try {
        await db.collection('SwordNexBillingSoftware').doc(ownerId).update({
            subscription: null,
            trialUsed: false
        });
        console.log("Subscription cleared.");
    } catch (e) {
        console.error("Error clearing subscription:", e.message);
    }
}


async function activateTrial(baseUrl, token) {
    if (!token) {
        console.log('Skipping trial activation due to missing token');
        return;
    }
    console.log(`Activating Trial on ${baseUrl}`);
    try {
        const res = await fetch(`${baseUrl}/billing/activate-trial`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        });

        console.log(`Trial Status: ${res.status}`);
        const text = await res.text();
        console.log(`Trial Body: ${text}`);
    } catch (e) {
        console.error(`Error activating trial:`, e.message);
    }
}

(async () => {
    console.log('--- Testing Standalone ---');
    const userData = await registerUser(STANDALONE_URL);
    if (userData) {
        // Clear subscription to allow trial
        await resetSubscription(userData.ownerId);
        await activateTrial(STANDALONE_URL, userData.token);
    }
})();
