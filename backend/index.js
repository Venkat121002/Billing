// Cloud Functions entry point: exposes the Express app (server.js) as `billingApi`.
// Firebase Hosting rewrites /api/** to this function (see ../firebase.json).
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const app = require('./server');
const { runSubscriptionReminders } = require('./utils/subscriptionReminders');
const { runDailyLowStockSummary } = require('./utils/inventoryAlerts');
const { runDuePaymentReminders } = require('./utils/dueReminders');
const { runAllOwnersDailySalesSummary } = require('./utils/salesSummary');

const { connectMongoDB } = require('./config/mongodb');

async function ensureDbConnected() {
    if ((process.env.DB_TYPE || 'mongodb') === 'mongodb') {
        await connectMongoDB().catch(err => console.error('Cloud Function MongoDB init failed:', err.message));
    }
}

exports.billingApi = onRequest(
    { region: 'asia-south1', memory: '512MiB', timeoutSeconds: 120, maxInstances: 10 },
    app
);

// Daily WhatsApp subscription expiry reminders (10:00 IST).
exports.billingReminders = onSchedule(
    { schedule: 'every day 10:00', timeZone: 'Asia/Kolkata', region: 'asia-south1', timeoutSeconds: 300 },
    async () => {
        await ensureDbConnected();
        await runSubscriptionReminders();
    }
);

// Daily Low-Stock Summary Email (08:30 IST).
exports.lowStockSummaryJob = onSchedule(
    { schedule: 'every day 08:30', timeZone: 'Asia/Kolkata', region: 'asia-south1', timeoutSeconds: 300 },
    async () => {
        await ensureDbConnected();
        await runDailyLowStockSummary();
    }
);

// Daily Dues Payment Reminders (11:00 IST).
exports.duePaymentRemindersJob = onSchedule(
    { schedule: 'every day 11:00', timeZone: 'Asia/Kolkata', region: 'asia-south1', timeoutSeconds: 300 },
    async () => {
        await ensureDbConnected();
        await runDuePaymentReminders();
    }
);

// Daily Sales & Closing Summary (21:00 IST).
exports.dailySalesSummaryJob = onSchedule(
    { schedule: 'every day 21:00', timeZone: 'Asia/Kolkata', region: 'asia-south1', timeoutSeconds: 300 },
    async () => {
        await ensureDbConnected();
        await runAllOwnersDailySalesSummary();
    }
);

