// Cloud Functions entry point: exposes the Express app (server.js) as `billingApi`.
// Firebase Hosting rewrites /api/** to this function (see ../firebase.json).
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const app = require('./server');
const { runSubscriptionReminders } = require('./utils/subscriptionReminders');

exports.billingApi = onRequest(
    { region: 'asia-south1', memory: '512MiB', timeoutSeconds: 120, maxInstances: 10 },
    app
);

// Daily WhatsApp subscription expiry reminders (10:00 IST).
exports.billingReminders = onSchedule(
    { schedule: 'every day 10:00', timeZone: 'Asia/Kolkata', region: 'asia-south1', timeoutSeconds: 300 },
    async () => {
        await runSubscriptionReminders();
    }
);
