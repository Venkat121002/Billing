require('dotenv').config({ path: '.env.custom' });
const axios = require('axios');
const { db: firebaseDb, admin } = require('./config/firebase');

async function testForgot() {
    console.log("Starting test...");
    const email = "deviseethala62@gmail.com";
    const tenantId = process.env.TENANT_ID;
    const apiKey = process.env.FB_WEB_API_KEY;

    console.log("Tenant ID:", tenantId);
    console.log("API Key:", apiKey);

    try {
        const tenantAuth = admin.auth().tenantManager().authForTenant(tenantId);
        console.log("Checking user...");
        await tenantAuth.getUserByEmail(email);
        console.log("User exists!");

        const resetUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;
        console.log("Sending request to:", resetUrl);
        const res = await axios.post(resetUrl, {
            requestType: "PASSWORD_RESET",
            email: email,
            tenantId: tenantId
        });
        console.log("Success:", res.data);
    } catch (err) {
        console.error("Error Full:", err);
        console.error("Error Detail:", err.response?.data || err.message);
    }
}

testForgot();
