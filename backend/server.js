const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env first, then let .env.custom override if present
dotenv.config();
if (fs.existsSync('.env.custom')) {
    dotenv.config({ path: '.env.custom', override: true });
}

// Database Configuration
const DB_TYPE = process.env.DB_TYPE || 'mongodb';

// Database initialization function
async function initializeDatabase() {
    if (DB_TYPE === 'mongodb') {
        const { connectMongoDB } = require('./config/mongodb');
        try {
            await connectMongoDB();
            console.log('✅ MongoDB initialization complete');
        } catch (err) {
            console.error('❌ Failed to connect to MongoDB:', err.message);
            throw err;
        }
    } else {
        const { db: firebaseDb } = require('./config/firebase');
        try {
            await firebaseDb.collection('healthcheck').limit(1).get();
            console.log('✅ Firebase connection success');
        } catch (err) {
            console.error('❌ Firebase connection failed:', err.message);
        }
    }
}

// let db = {};
// try {
//     db = require('./models');
// } catch (err) {
//     console.warn(
//         "⚠️ SQL Database models failed to load (Check DB Config):",
//         err.message
//     );
//     db.sequelize = null;
// }

const app = express();

const PORT = process.env.PORT || 5003;

console.log(`🗄️  Database Mode: ${DB_TYPE.toUpperCase()}`);

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------
app.use(
    cors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })
);

app.use(helmet());
app.use(morgan('dev'));

// API responses depend on who is signed in, but the Firebase Hosting CDN in front
// of this function caches by URL only, and without an explicit header it caches
// error responses (e.g. 404s) for 10 minutes: one store's "not found" would then
// be served to every store asking for that URL. Never let a cache store them.
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Keep the raw body: Cashfree webhook signatures are computed over the exact bytes.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------
// Debug Logger
// ---------------------------------------------------------
app.use((req, res, next) => {
    console.log(`🔍 [${req.method}] ${req.url}`);
    next();
});

// ---------------------------------------------------------
// Routes
// ---------------------------------------------------------

// NOTE: the legacy Postgres/Sequelize auth routes that used to be mounted
// here (`/auth`, `/api/auth` → ./routes/auth → ./controllers/authController)
// have been removed. The frontend (frontend/src/config/api.js) only ever
// calls `/v2/auth/*`, so that legacy flow was unreachable dead code — see
// project-issues-report.md and database-dual-mode-fix-report.md. The route
// and controller files themselves are still on disk pending cleanup; they
// are no longer mounted anywhere.

// ---------------------------------------------------------
// V2 Routes - Multi-Tenant Architecture
// ---------------------------------------------------------

// Authentication
app.use(
    '/api/v2/auth',
    require('./routes/firestoreAuthRoutes')
);

app.use(
    '/v2/auth',
    require('./routes/firestoreAuthRoutes')
);

// Products
app.use(
    '/api/v2/products',
    require('./routes/firestoreProductRoutes')
);

app.use(
    '/v2/products',
    require('./routes/firestoreProductRoutes')
);

// Customers
app.use(
    '/api/v2/customers',
    require('./routes/firestoreCustomerRoutes')
);

app.use(
    '/v2/customers',
    require('./routes/firestoreCustomerRoutes')
);

// Suppliers
app.use(
    '/api/v2/suppliers',
    require('./routes/firestoreSupplierRoutes')
);

app.use(
    '/v2/suppliers',
    require('./routes/firestoreSupplierRoutes')
);

// Billing
app.use(
    '/api/v2/billing',
    require('./routes/firestoreBillingRoutes')
);

app.use(
    '/v2/billing',
    require('./routes/firestoreBillingRoutes')
);

// Credit
app.use(
    '/api/v2/credit',
    require('./routes/firestoreCreditRoutes')
);

app.use(
    '/v2/credit',
    require('./routes/firestoreCreditRoutes')
);

// Cashbook
app.use(
    '/api/v2/cashbook',
    require('./routes/firestoreCashbookRoutes')
);

app.use(
    '/v2/cashbook',
    require('./routes/firestoreCashbookRoutes')
);

// GST Bills
app.use(
    '/api/v2/gst-bills',
    require('./routes/firestoreGstBillRoutes')
);

app.use(
    '/v2/gst-bills',
    require('./routes/firestoreGstBillRoutes')
);

// Users
app.use(
    '/api/v2/users',
    require('./routes/firestoreUserRoutes')
);

app.use(
    '/v2/users',
    require('./routes/firestoreUserRoutes')
);

// OTP
app.use(
    '/api/v2/otp',
    require('./routes/otpRoutes')
);

app.use(
    '/v2/otp',
    require('./routes/otpRoutes')
);

// Trainers
app.use(
    '/api/v2/trainers',
    require('./routes/firestoreTrainerRoutes')
);

app.use(
    '/v2/trainers',
    require('./routes/firestoreTrainerRoutes')
);

// Returns
app.use(
    '/api/v2/returns',
    require('./routes/firestoreReturnsRoutes')
);

app.use(
    '/v2/returns',
    require('./routes/firestoreReturnsRoutes')
);

// Clients
app.use(
    '/api/v2/clients',
    require('./routes/firestoreClientRoutes')
);

app.use(
    '/v2/clients',
    require('./routes/firestoreClientRoutes')
);

// Repair Tickets
app.use(
    '/api/v2/repair-tickets',
    require('./routes/firestoreRepairTicketRoutes')
);

app.use(
    '/v2/repair-tickets',
    require('./routes/firestoreRepairTicketRoutes')
);

// Pets
app.use(
    '/api/v2/pets',
    require('./routes/firestorePetRoutes')
);

app.use(
    '/v2/pets',
    require('./routes/firestorePetRoutes')
);

// Pet Services (Grooming, Spa & Clinic)
app.use(
    '/api/v2/pet-services',
    require('./routes/firestorePetServiceRoutes')
);

app.use(
    '/v2/pet-services',
    require('./routes/firestorePetServiceRoutes')
);

// Milestones
app.use(
    '/api/v2/milestones',
    require('./routes/firestoreMilestoneRoutes')
);

app.use(
    '/v2/milestones',
    require('./routes/firestoreMilestoneRoutes')
);

// Salesman
app.use(
    '/api/v2/salesman',
    require('./routes/firestoreSalesmanRoutes')
);

app.use(
    '/v2/salesman',
    require('./routes/firestoreSalesmanRoutes')
);

// Support Requests (tenant -> super admin messages / industry change requests)
app.use(
    '/api/v2/support-requests',
    require('./routes/supportRequestRoutes')
);

app.use(
    '/v2/support-requests',
    require('./routes/supportRequestRoutes')
);

// Alteration Tickets (Tailoring & Fitting)
app.use(
    '/api/v2/alteration-tickets',
    require('./routes/firestoreAlterationTicketRoutes')
);
app.use(
    '/v2/alteration-tickets',
    require('./routes/firestoreAlterationTicketRoutes')
);

// Clothing Store Automation (Matrix Variants, WhatsApp Bill, Size Exchange, Aging Stock, EOD Closing)
app.use(
    '/api/v2/clothing',
    require('./routes/firestoreClothingRoutes')
);
app.use(
    '/v2/clothing',
    require('./routes/firestoreClothingRoutes')
);

// Payments: public pay-link endpoints (token-authenticated) + Razorpay webhook
app.use('/api/v2/pay', require('./routes/paymentRoutes'));
app.use('/v2/pay', require('./routes/paymentRoutes'));


const { razorpayWebhook } = require('./controllers/paymentController');
app.post('/api/v2/webhooks/razorpay', razorpayWebhook);
app.post('/v2/webhooks/razorpay', razorpayWebhook);
// Payments: public pay-link endpoints (token-authenticated) + Cashfree webhook
app.use('/api/v2/pay', require('./routes/paymentRoutes'));
app.use('/v2/pay', require('./routes/paymentRoutes'));

const { cashfreeWebhook } = require('./controllers/paymentController');
app.post('/api/v2/webhooks/cashfree', cashfreeWebhook);
app.post('/v2/webhooks/cashfree', cashfreeWebhook);
app.post('/api/v2/webhooks/razorpay', cashfreeWebhook);
app.post('/v2/webhooks/razorpay', cashfreeWebhook);

// Super Admin (platform-level, cross-tenant)
app.use(
    '/api/v2/superadmin',
    require('./routes/superAdminRoutes')
);

app.use(
    '/v2/superadmin',
    require('./routes/superAdminRoutes')
);

// Automation & AI (Phase 1)
app.use(
    '/api/v2/automation',
    require('./routes/automationRoutes')
);

app.use(
    '/v2/automation',
    require('./routes/automationRoutes')
);

// Intelligent Chatbot & Knowledge Ingestion (SwordNexi Multi-Tenant RAG)
app.use(
    '/api/v2/chatbot',
    require('./routes/chatbotRoutes')
);

app.use(
    '/v2/chatbot',
    require('./routes/chatbotRoutes')
);

// Software Development Automation (Proposal AI, Auto Milestone Invoicing)
app.use(
    '/api/v2/software',
    require('./routes/softwareAutomationRoutes')
);

app.use(
    '/v2/software',
    require('./routes/softwareAutomationRoutes')
);

// ---------------------------------------------------------
// Root Route
// ---------------------------------------------------------
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to SwordNex Billing API'
    });
});

// ---------------------------------------------------------
// Health Check (Supports both MongoDB & Firestore)
// ---------------------------------------------------------
app.get('/health', async (req, res) => {
    try {
        if (DB_TYPE === 'mongodb') {
            const { mongoose } = require('./config/mongodb');
            const state = mongoose.connection.readyState;
            const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
            res.json({
                database: 'mongodb',
                connected: state === 1,
                status: stateMap[state] || 'unknown',
                dbName: mongoose.connection.db?.databaseName || 'swordnex_billing_dev'
            });
        } else {
            const { db: firebaseDb } = require('./config/firebase');
            await firebaseDb.collection('healthcheck').limit(1).get();
            res.json({
                database: 'firestore',
                connected: true
            });
        }
    } catch (err) {
        res.status(500).json({
            database: DB_TYPE,
            connected: false,
            error: err.message
        });
    }
});

app.get('/health/firebase', async (req, res) => {
    try {
        const { db: firebaseDb } = require('./config/firebase');
        await firebaseDb.collection('healthcheck').limit(1).get();
        res.json({
            database: 'firestore',
            connected: true
        });
    } catch (err) {
        res.status(500).json({
            database: 'firestore',
            connected: false,
            error: err.message
        });
    }
});

// ---------------------------------------------------------
// Custom 404 Handler
// ---------------------------------------------------------
app.use((req, res, next) => {
    console.warn(
        `⚠️ 404 Hit: ${req.method} ${req.originalUrl}`
    );

    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        originalUrl: req.originalUrl,
        method: req.method
    });
});

// ---------------------------------------------------------
// Export Express App
// ---------------------------------------------------------
module.exports = app;

// ---------------------------------------------------------
// Start Standalone Express Server
// ---------------------------------------------------------
// This allows:
//     npm run dev
//
// to start the server locally.
//
// When this file is imported by another module
// (for example Firebase Functions), the listener
// will NOT start automatically.
// ---------------------------------------------------------
if (require.main === module) {
    // Start server after database initialization
    (async () => {
        try {
            await initializeDatabase();
            const { initScheduler } = require('./utils/scheduler');
            initScheduler();
            const { isGeminiConfigured } = require('./config/gemini');
            console.log(`🤖 Gemini AI Configured: ${isGeminiConfigured() ? 'YES (GEMINI_AI variable active)' : 'NO'}`);
            app.listen(PORT, () => {
                console.log(`🚀 SwordNex Billing API running on port ${PORT}`);
                console.log(`🌐 Local URL: http://localhost:${PORT}`);
                console.log(
                    `🔥 Firebase Health: http://localhost:${PORT}/health/firebase`
                );
            });
        } catch (err) {
            console.error('❌ Failed to initialize database, server not started');
            process.exit(1);
        }
    })();
}