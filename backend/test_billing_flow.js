const fetch = require('node-fetch'); // Ensure node-fetch is available, or use native fetch if Node 18+

const API_BASE = 'http://127.0.0.1:5003/api';
// Note: In some Firebase setups, the function name 'api' is part of the path, and if the app mounts at '/', then '/api/...' is needed.
// If app.use('/api', ...) is in server.js, then we need /api/api... 
// server.js has: app.use('/api/v2/auth', ...)
// So it expects /api/v2/auth at the root of the Express app.
// If the function is mounted at .../api, then the request comes in as /v2/auth if Firebase strips the prefix?
// Standard Firebase Functions behavior: req.url is the path AFTER the function name.
// So if URL is .../api/api/v2/auth, req.url is /api/v2/auth. This matches app.use('/api/v2/auth').
// If URL is .../api/v2/auth, req.url is /v2/auth. This would NOT match /api/v2/auth.
// So likely we need .../api/api/v2/auth.
// Let's stick with my first hunch but cleaning it up.


async function testBilling() {
    console.log('🚀 Starting Billing Flow Test...');

    const timestamp = Date.now();
    const userData = {
        businessName: `TestBiz_${timestamp}`,
        firstName: "Test",
        lastName: "User",
        email: `billing_test_${timestamp}@example.com`,
        password: "Password123!",
        mobile: "9876543210",
        plan: "Basic" // Start with Basic
    };

    let token = null;

    // 1. Register
    try {
        console.log(`\n1. Registering user: ${userData.email}`);
        const regRes = await fetch(`${API_BASE}/v2/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const regData = await regRes.json();

        if (regRes.status === 200) {
            console.log('✅ Registration Successful');
            token = regData.token;
        } else {
            console.error('❌ Registration Failed:', regData);
            // Try login if user exists
            if (regData.msg === "User already exists in this Tenant") {
                console.log('User exists, attempting login...');
                // proceed to login
            } else {
                return;
            }
        }
    } catch (e) {
        console.error('❌ Registration Error:', e.message);
        return;
    }

    // 2. Login (if token not yet obtained)
    if (!token) {
        try {
            console.log(`\n2. Logging in...`);
            const loginRes = await fetch(`${API_BASE}/v2/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userData.email, password: userData.password })
            });
            const loginData = await loginRes.json();

            if (loginRes.status === 200) {
                console.log('✅ Login Successful');
                token = loginData.token;
                console.log('Token extracted length:', token.length);
            } else {
                console.error('❌ Login Failed:', loginData);
                return;
            }
        } catch (e) {
            console.error('❌ Login Error:', e.message);
            return;
        }
    }

    if (!token) {
        console.error('❌ No token available, aborting tests.');
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'x-auth-token': token
    };

    // 3. Test Create Order
    try {
        console.log(`\n3. Testing Create Order (Standard Yearly)...`);
        const orderRes = await fetch(`${API_BASE}/v2/billing/create-order`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ plan: 'standard', billingCycle: 'yearly' })
        });
        const orderData = await orderRes.json();

        if (orderRes.status === 200 && orderData.orderId) {
            console.log('✅ Create Order Successful');
            console.log('Order ID:', orderData.orderId);
            console.log('Amount:', orderData.amount);
        } else {
            console.error('❌ Create Order Failed:', orderData);
        }
    } catch (e) {
        console.error('❌ Create Order Exception:', e.message);
    }

    // 4. Test Activate Trial
    try {
        console.log(`\n4. Testing Activate Trial...`);
        const trialRes = await fetch(`${API_BASE}/v2/billing/activate-trial`, {
            method: 'POST',
            headers: headers
        });
        const trialData = await trialRes.json();

        if (trialRes.status === 200) {
            console.log('✅ Trial Activation Successful:', trialData.msg);
        } else if (trialRes.status === 400 && trialData.msg === "Active subscription exists") {
            // Might happen if I messed up logic or previous test set something
            console.log('⚠️ Trial not activated (Active sub exists):', trialData.msg);
        } else {
            console.error('❌ Trial Activation Failed:', trialData);
        }

        // 4b. Verify Double Activation fails
        console.log(`\n4b. Verifying Trial Re-activation fails...`);
        const trialRes2 = await fetch(`${API_BASE}/v2/billing/activate-trial`, {
            method: 'POST',
            headers: headers
        });
        const trialData2 = await trialRes2.json();

        if (trialRes2.status === 400) {
            console.log('✅ Re-activation blocked correctly:', trialData2.msg);
        } else {
            console.error('❌ Re-activation should have failed but got:', trialRes2.status, trialData2);
        }

    } catch (e) {
        console.error('❌ Activate Trial Exception:', e.message);
    }
}

testBilling();
