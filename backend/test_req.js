const axios = require('axios');

async function test() {
    const apiKey = 'AIzaSyBd1k1J2-LCsXLnNEsM0g9evcdBcDVl5kY';
    const tenantId = 'SwordNexBilling-4pzp8';
    const email = 'deviseethala62@gmail.com'; // Testing email
    
    try {
        const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;
        const response = await axios.post(authUrl, {
            requestType: "PASSWORD_RESET",
            email: email,
            tenantId: tenantId
        });
        console.log('SUCCESS:', response.data);
    } catch (err) {
        console.error('ERROR RESPONSE:', err.response?.data || err.message);
    }
}
test();
