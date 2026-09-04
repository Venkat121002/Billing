const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5001/swordnex-softwares/us-central1/billingApi/api/v2';
// Note: The path depends on how the function routes. 
// index.js exports 'billingApi'. 
// Cloud Function URL is .../billingApi
// server.js mounts at /api/v2/...
// So URL is .../billingApi/api/v2/... 
// If function is handled at /billingApi, then req.path starts after it.

const AUTH_URL = `${BASE_URL}/auth`;
const PRODUCT_URL = `${BASE_URL}/products`;

async function testV2() {
    try {
        const uniqueSuffix = Date.now();
        const email = `owner${uniqueSuffix}@example.com`;
        const password = 'password123';

        console.log(`\n--- 1. Registering Owner (${email}) ---`);
        const registerRes = await axios.post(`${AUTH_URL}/register`, {
            name: "V2 Owner",
            email: email,
            password: password,
            companyName: "V2 Tech",
            industryType: "Software"
        });
        console.log("Register Success:", registerRes.data.user);
        const { token } = registerRes.data;

        const config = {
            headers: { 'x-auth-token': token }
        };

        console.log("\n--- 2. Creating Product ---");
        const productRes = await axios.post(`${PRODUCT_URL}`, {
            name: "Cloud Subscription",
            price: 99.99,
            sku: "CLOUD-001"
        }, config);
        console.log("Product Created:", productRes.data);

        console.log("\n--- 3. Fetching Products ---");
        const getProductRes = await axios.get(`${PRODUCT_URL}`, config);
        console.log("Products Fetched:", getProductRes.data.length);

        if (getProductRes.data.length > 0 && getProductRes.data[0].name === "Cloud Subscription") {
            console.log("✅ Product Verification Passed");
        } else {
            console.error("❌ Product Verification Failed");
        }

    } catch (error) {
        console.error("Test Failed:", error.response ? error.response.data : error.message);
    }
}

testV2();
