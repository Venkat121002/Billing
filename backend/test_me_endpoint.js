const axios = require('axios');

async function test() {
    try {
        console.log("Testing POST /api/auth/login...");
        // 1. Login to get token
        const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
            email: 'najbudeendeen@gmail.com',
            password: 'Password123!@#'
        });
        const token = loginRes.data.token;
        console.log("Login success! Token obtained:", token.substring(0, 10) + "...");

        console.log("\nTesting GET /api/auth/me...");
        // 2. Access /me
        const meRes = await axios.get('http://127.0.0.1:5000/api/auth/me', {
            headers: { 'x-auth-token': token }
        });
        console.log("ME Response:", meRes.data);

    } catch (error) {
        if (error.response) {
            console.error(`Error: ${error.response.status} ${error.response.statusText}`);
            console.error("Data:", error.response.data);
        } else {
            console.error("Error:", error.message);
        }
    }
}

test();
