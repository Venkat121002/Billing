const axios = require('axios');

// Configuration
const API_URL = 'http://127.0.0.1:5001/swordnex-softwares/us-central1/api/api/v2';

async function testCustomerAPI() {
    try {
        console.log("1. Registering a new test user...");
        const timestamp = Date.now();
        const registerData = {
            businessName: `TestBiz_${timestamp}`,
            firstName: "Test",
            lastName: "User",
            email: `test_${timestamp}@example.com`,
            password: "Password123!",
            mobile: "1234567890",
            plan: "Basic",
            industry: "Retail"
        };

        const regRes = await axios.post(`${API_URL}/auth/register`, registerData);
        console.log("   Registration Status:", regRes.status);

        console.log("2. Logging in...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: registerData.email,
            password: registerData.password
        });
        const token = loginRes.data.token;
        console.log("   Token received.");

        const config = {
            headers: { 'x-auth-token': token }
        };

        console.log("\n3. Creating a new customer with billing details...");
        const newCustomer = {
            name: "Cust " + timestamp,
            mobile: "9876543210",
            email: "cust@example.com",
            address: "123 Test St",
            products: [
                { name: "iPhone 15", quantity: 1, gst: 18, totalamount: 70000 }
            ],
            paymentamount: 70000,
            changeamount: 0,
            totalamount: 70000,
            date: new Date().toISOString()
        };

        const createRes = await axios.post(`${API_URL}/customers`, newCustomer, config);
        console.log("   Customer Created:", createRes.data.id);
        const createdId = createRes.data.id;

        console.log("\n4. Fetching all customers...");
        const getRes = await axios.get(`${API_URL}/customers`, config);
        console.log(`   Fetched ${getRes.data.length} customers.`);

        const found = getRes.data.find(c => c.id === createdId);
        if (found) {
            console.log("   SUCCESS: Created customer found in list.");
            console.log("   Customer Data:", JSON.stringify(found, null, 2));

            // Verify Nested Data
            if (found.products && found.products.length > 0) {
                console.log("   SUCCESS: Validated billing details are present.");
            } else {
                console.error("   FAILURE: Billing details missing.");
            }
        } else {
            console.error("   FAILURE: Created customer NOT found.");
        }

        console.log("\n5. Fetching single customer...");
        const singleRes = await axios.get(`${API_URL}/customers/${createdId}`, config);
        if (singleRes.data.id === createdId) {
            console.log("   SUCCESS: Single customer fetch working.");
        } else {
            console.error("   FAILURE: Single customer fetch mismatch.");
        }

    } catch (error) {
        console.error("TEST FAILED:", error.message);
        if (error.response) {
            console.error("Response:", error.response.data);
        }
    }
}

testCustomerAPI();
