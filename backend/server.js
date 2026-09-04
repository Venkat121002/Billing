const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.custom' });

const { db: firebaseDb } = require('./config/firebase');

// let db = {};
// try {
//     db = require('./models');
// } catch (err) {
//     console.warn("⚠️ SQL Database models failed to load (Check DB Config):", err.message);
//     db.sequelize = null; // Mark as missing
// }

const app = express();
const PORT = 5003; // Changed from 5000 to 5003 to avoid conflicts with HMS/Payroll

(async () => {
    try {
        await firebaseDb.collection('healthcheck').limit(1).get();
        console.log('Firebase connection success');
    } catch (err) {
        console.error('Firebase connection failed:', err.message);
    }
})();

// Middleware
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug Logger
app.use((req, res, next) => {
    console.log(`🔍 [${req.method}] ${req.url}`);
    next();
});

// Routes
// Mount on both paths to handle local dev vs production consistent behavior
app.use('/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/auth'));
// app.use('/api/fire-auth', require('./routes/firestoreAuth')); // Removed broken route

// V2 Routes (Multi-Tenant Architecture)
// Mount on both /api/v2 and /v2 to handle Cloud Function prefix stripping idiosyncrasies
app.use('/api/v2/auth', require('./routes/firestoreAuthRoutes'));
app.use('/v2/auth', require('./routes/firestoreAuthRoutes'));

app.use('/api/v2/products', require('./routes/firestoreProductRoutes'));
app.use('/v2/products', require('./routes/firestoreProductRoutes'));

app.use('/api/v2/customers', require('./routes/firestoreCustomerRoutes'));
app.use('/v2/customers', require('./routes/firestoreCustomerRoutes'));

app.use('/api/v2/suppliers', require('./routes/firestoreSupplierRoutes'));
app.use('/v2/suppliers', require('./routes/firestoreSupplierRoutes'));

app.use('/api/v2/billing', require('./routes/firestoreBillingRoutes'));
app.use('/v2/billing', require('./routes/firestoreBillingRoutes'));

app.use('/api/v2/credit', require('./routes/firestoreCreditRoutes'));
app.use('/v2/credit', require('./routes/firestoreCreditRoutes'));

app.use('/api/v2/cashbook', require('./routes/firestoreCashbookRoutes'));
app.use('/v2/cashbook', require('./routes/firestoreCashbookRoutes'));

app.use('/api/v2/gst-bills', require('./routes/firestoreGstBillRoutes'));
app.use('/v2/gst-bills', require('./routes/firestoreGstBillRoutes'));

app.use('/api/v2/users', require('./routes/firestoreUserRoutes'));
app.use('/v2/users', require('./routes/firestoreUserRoutes'));

app.use("/api/v2/otp", require("./routes/otpRoutes"));
app.use("/v2/otp", require("./routes/otpRoutes"));


app.use('/api/v2/trainers', require('./routes/firestoreTrainerRoutes'));
app.use('/v2/trainers', require('./routes/firestoreTrainerRoutes'));


app.use('/api/v2/import', require('./routes/importRoutes'));
app.use('/v2/import', require('./routes/importRoutes'));

app.use('/api/v2/returns', require('./routes/firestoreReturnsRoutes'));
app.use('/v2/returns', require('./routes/firestoreReturnsRoutes'));

app.use('/api/v2/clients', require('./routes/firestoreClientRoutes'));
app.use('/v2/clients', require('./routes/firestoreClientRoutes'));

app.use('/api/v2/salesman', require('./routes/firestoreSalesmanRoutes'));
app.use('/v2/salesman', require('./routes/firestoreSalesmanRoutes'));



app.get('/', (req, res) => {
    res.json({ message: 'Welcome to SwordNex Billing API' });
});

app.get('/health/firebase', async (req, res) => {
    try {
        await firebaseDb.collection('healthcheck').limit(1).get();
        res.json({ connected: true });
    } catch (err) {
        res.status(500).json({ connected: false, error: err.message });
    }
});

// Custom 404 Handler (JSON)
app.use((req, res, next) => {
    console.warn(`⚠️ 404 Hit: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        originalUrl: req.originalUrl,
        method: req.method
    });
});






module.exports = app;

// Database Sync and Server Start
// Database Sync and Server Start
// Check if we are running in Firebase Cloud Functions environment
// const isFirebase = process.env.FUNCTIONS_FRAMEWORK || process.env.FIREBASE_CONFIG;

// if (!isFirebase && require.main === module) {
//     if (db.sequelize) {
//         db.sequelize.sync({ alter: true })
//             .then(() => {
//                 console.log('Database synced');
//                 app.listen(PORT, () => {
//                     console.log(`Server is running on port ${PORT}`);
//                 });
//             })
//             .catch((err) => {
//                 console.error('Failed to sync database (Standalone):', err.message);
//                 console.log('⚠️ Starting server anyway...');
//                 app.listen(PORT, () => {
//                     console.log(`Server is running on port ${PORT}`);
//                 });
//             });
//     } else {
//         console.warn("⚠️ Starting server without SQL Database (Standalone)");
//         app.listen(PORT, () => {
//             console.log(`Server is running on port ${PORT}`);
//         });
//     }
// } else {
//     // For Cloud Functions, we export the app without starting a listener or syncing SQL
//     console.log('☁️ Running in Cloud Functions Mode - SQL Sync Skipped');
//     module.exports = app;
// }
