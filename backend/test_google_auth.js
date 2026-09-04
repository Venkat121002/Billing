const axios = require('axios');

const TEST_URL = 'http://localhost:5000/api/auth/google-login';

async function testGoogleLogin() {
    console.log('Testing Google Login Endpoint...');

    const mockGoogleData = {
        email: `test_google_${Date.now()}@example.com`,
        name: "Test Google User",
        googleId: `google_id_${Date.now()}`,
        photoURL: "https://example.com/photo.jpg"
    };

    try {
        const res = await axios.post(TEST_URL, mockGoogleData);
        console.log('✅ Google Login Success!');
        console.log('Status:', res.status);
        console.log('Token:', res.data.token ? 'Received' : 'Missing');
        console.log('User:', res.data.user ? res.data.user.email : 'Missing');
    } catch (error) {
        console.error('❌ Google Login Failed');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error Message:', error.message);
            console.error('Full Error:', error);
        }
    }
}

testGoogleLogin();
