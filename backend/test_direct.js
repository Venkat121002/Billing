const axios = require('axios');

async function test() {
    try {
        const response = await axios.post('http://127.0.0.1:5003/auth/forgot-password', {
            email: 'deviseethala62@gmail.com'
        });
        console.log('SUCCESS:', response.data);
    } catch (err) {
        console.error('STATUS:', err.response?.status);
        console.error('HEADERS:', err.response?.headers);
        console.error('DATA:', err.response?.data);
        console.error('MESSAGE:', err.message);
    }
}
test();
