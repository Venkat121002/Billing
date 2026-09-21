// Cloud Functions entry point: exposes the Express app (server.js) as `billingApi`.
// Firebase Hosting rewrites /api/** to this function (see ../firebase.json).
const { onRequest } = require('firebase-functions/v2/https');
const app = require('./server');

exports.billingApi = onRequest(
    { region: 'asia-south1', memory: '512MiB', timeoutSeconds: 120, maxInstances: 10 },
    app
);
