const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Hardcoded based on .env.custom and user request
const TENANT_ID = "SwordNexBilling-4pzp8";
const USER_ID = "80vR82vQFQhJ74ISjJ3yKsbY6JB3";

async function checkUser() {
    console.log(`Checking user ${USER_ID} in tenant ${TENANT_ID}...`);
    try {
        const docRef = db.collection('SwordNexBillingSoftware').doc(TENANT_ID).collection('owner').doc(USER_ID);
        const doc = await docRef.get();

        if (doc.exists) {
            console.log("User Data Found:");
            console.log(JSON.stringify(doc.data(), null, 2));
        } else {
            console.log("User NOT found at path:", docRef.path);

            // Fallback: list all owners to validity
            console.log("Listing all owners in tenant...");
            const ownersSnapshot = await db.collection('SwordNexBillingSoftware').doc(TENANT_ID).collection('owner').get();
            ownersSnapshot.forEach(d => console.log(d.id));
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

checkUser();

const axios = require('axios');

// Configuration
const API_URL = 'http://127.0.0.1:5001/swordnex-softwares/us-central1/api/api/v2';
const AUTH_TOKEN = "YOUR_AUTH_TOKEN_HERE"; // We need a valid token. 
// Ideally we login first.

async function testCustomerAPI() {
    try {
        console.log("1. Logging in to get token...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: "magic@gmail.com",
            password: "password123" // Assuming this credential works from previous context
        });
        const token = loginRes.data.token;
        console.log("   Token received.");

        const config = {
            headers: { 'x-auth-token': token }
        };

        console.log("\n2. Creating a new customer with billing details...");
        const newCustomer = {
            name: "Test Customer " + Date.now(),
            mobile: "9876543210",
            email: "test@example.com",
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

        console.log("\n3. Fetching all customers...");
        const getRes = await axios.get(`${API_URL}/customers`, config);
        console.log(`   Fetched ${getRes.data.length} customers.`);
        const found = getRes.data.find(c => c.id === createdId);
        if (found) {
            console.log("   SUCCESS: Created customer found in list.");
            console.log("   Customer Data:", JSON.stringify(found, null, 2));
        } else {
            console.error("   FAILURE: Created customer NOT found.");
        }

    } catch (error) {
        console.error("TEST FAILED:", error.response ? error.response.data : error.message);
    }
}

testCustomerAPI();
