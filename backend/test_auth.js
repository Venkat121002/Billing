const registerUrl = 'http://localhost:5000/api/auth/register';
const loginUrl = 'https://swordnex-softwares.web.app/api';

async function testAuth() {
    console.log('Testing Registration...');
    const registerData = {
        name: "Trial User",
        email: "trialuser@example.com",
        password: "Password123!",
        tenant_name: "Trial Corp"
    };

    try {
        const regRes = await fetch(registerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerData)
        });

        const regJson = await regRes.json();
        console.log('Registration Status:', regRes.status);
        console.log('Registration Response:', regJson);

        if (regRes.status !== 200) {
            console.error('Registration failed');
            // If user already exists, try login
            if (regJson.msg === 'User already exists') {
                console.log('User exists, proceeding to login...');
            } else {
                return;
            }
        }

        console.log('\nTesting Login...');
        const loginData = {
            email: "trialuser@example.com",
            password: "Password123!"
        };

        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });

        const loginJson = await loginRes.json();
        console.log('Login Status:', loginRes.status);
        console.log('Login Response:', loginJson);

        if (loginRes.status === 200 && loginJson.token) {
            console.log('SUCCESS: Login successful, token received.');
        } else {
            console.error('FAILURE: Login failed.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testAuth();
