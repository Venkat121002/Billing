const { onRequest } = require("firebase-functions/v2/https");
const app = require("./server");

// Export the Express app as a Cloud Function
exports.billingApi = onRequest(
    {
        memory: '512MiB',
        timeoutSeconds: 120,
        region: 'us-central1'
    },
    app
);
