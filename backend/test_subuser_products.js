const axios = require('axios');

async function testSubuserProducts() {
    const API_URL = "http://localhost:5003/v2";
    // Using the same email from previous tests
    const ownerEmail = "sabilling@swordnex.com";
    const password = "Password123!"; // Assuming this is the password

    try {
        console.log("Logging in as owner...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ownerEmail,
            password: password
        });

        const token = loginRes.data.token;
        console.log("Login successful. Token acquired.");

        console.log("Fetching products with includeSubusers=true...");
        const productsRes = await axios.get(`${API_URL}/products?includeSubusers=true`, {
            headers: { 'x-auth-token': token }
        });

        const products = productsRes.data;
        console.log(`Total products fetched: ${products.length}`);

        const ownerProducts = products.filter(p => p.source === 'Owner');
        const subuserProducts = products.filter(p => p.source !== 'Owner');

        console.log(`Owner products: ${ownerProducts.length}`);
        console.log(`Subuser products: ${subuserProducts.length}`);

        if (subuserProducts.length > 0) {
            console.log("Sample subuser product:", JSON.stringify(subuserProducts[0], null, 2));
        }

    } catch (err) {
        console.error("Test failed:", err.response?.data || err.message);
    }
}

testSubuserProducts();
