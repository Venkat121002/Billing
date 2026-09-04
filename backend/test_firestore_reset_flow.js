const axios = require('axios');

const API_BASE_URL = 'http://localhost:5003/api/v2/auth';
const TEST_EMAIL = 'deviseethala62@gmail.com'; // Existing user in Firebase Tenant

async function testForgotPassword() {
    console.log('Testing V2 Forgot Password...');
    try {
        const response = await axios.post(`${API_BASE_URL}/forgot-password`, {
            email: TEST_EMAIL
        });
        console.log('Forgot Password Response:', response.data);
    } catch (error) {
        console.error('Forgot Password Error:', error.response?.data || error.message);
        if (error.response) console.error('Status:', error.response.status);
    }
}

async function testResetPasswordInvalidToken() {
    console.log('\nTesting V2 Reset Password with Invalid Token...');
    try {
        const response = await axios.post(`${API_BASE_URL}/reset-password`, {
            token: 'invalid-token',
            password: 'NewPassword123!'
        });
        console.log('Reset Password Response:', response.data);
    } catch (error) {
        console.error('Reset Password Error (Expected):', error.response?.data || error.message);
    }
}

async function runTests() {
    await testForgotPassword();
    await testResetPasswordInvalidToken();
}

runTests();
