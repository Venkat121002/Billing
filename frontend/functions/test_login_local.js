const app = require('./app');
const http = require('http');
const axios = require('axios');

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    const port = 5001;
    const server = http.createServer(app);

    server.listen(port, async () => {
        console.log(`Test server running on port ${port}`);

        const baseUrl = `http://localhost:${port}/api/auth`;
        const testUser = {
            name: "Test User",
            email: `test_login_${Date.now()}@example.com`,
            password: "Password123!",
            tenant_name: "Test Tenant",
            firebase_tenant_id: "test-tenant-id"
        };

        try {
            console.log("1. Registering test user...");
            const registerRes = await axios.post(`${baseUrl}/register`, testUser);
            console.log("✅ Registration successful:", registerRes.data);

            console.log("\n2. Attempting login...");
            const loginRes = await axios.post(`${baseUrl}/login`, {
                email: testUser.email,
                password: testUser.password
            });

            if (loginRes.data.token) {
                console.log("✅ Login successful! Token received.");
                console.log("Token:", loginRes.data.token.substring(0, 20) + "...");
                console.log("Subscription Status:", loginRes.data.subscription_status);
            } else {
                console.error("❌ Login failed: No token received.");
            }

        } catch (error) {
            console.error("❌ Test failed:");
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error("Data:", error.response.data);
            } else {
                console.error(error.message);
            }
        } finally {
            server.close(() => {
                console.log("\nServer closed.");
                process.exit(0);
            });
        }
    });
}

runTest();
