console.log('Start Debug');
try {
    require('dotenv').config({ path: '.env.custom' });
    console.log('Dotenv loaded');
} catch (e) {
    console.error('Dotenv Error:', e);
}

try {
    require('./config/firebase');
    console.log('Firebase config loaded');
} catch (e) {
    console.error('Firebase Config Error:', e);
}

try {
    require('./models');
    console.log('Models loaded');
} catch (e) {
    console.error('Models Error:', e.message);
}

try {
    require('./routes/firestoreBillingRoutes');
    console.log('Billing Routes loaded');
} catch (e) {
    console.error('Billing Routes Error:', e);
}

console.log('End Debug');
