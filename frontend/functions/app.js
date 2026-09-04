const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const app = express();

// Middleware
app.use(cors({ origin: true })); // Allow all origins for now, or specify frontend URL
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
    console.log(`📨 Request: ${req.method} ${req.url} (Base: ${req.baseUrl})`);
    res.setHeader('X-Server-Version', 'Fixed-Auth-v2');
    next();
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: 'Fixed-Auth-v2' });
});

// Routes (Lazy Loaded to prevent timeouts)
// Mount Auth (Explicitly as requested)
app.use('/auth', (req, res, next) => require('./routes/auth')(req, res, next));
app.use('/api/auth', (req, res, next) => require('./routes/auth')(req, res, next));
app.use('/api/auth', (req, res, next) => require('./routes/auth')(req, res, next));

// Mount Others (Keep Lazy for performance unless critical)
const mountLazy = (path, routePath) => {
    app.use(path, (req, res, next) => require(routePath)(req, res, next));
};

// Mount Users
mountLazy('/users', './routes/user');
mountLazy('/api/users', './routes/user');

// Mount Admin
mountLazy('/admin', './routes/admin');
mountLazy('/api/admin', './routes/admin');

// Mount Billing
mountLazy('/billing', './routes/billing');
mountLazy('/api/billing', './routes/billing');

// Mount Notifications
mountLazy('/api/notifications', './routes/notification');

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to SwordNex Billing API' });
});

app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to SwordNex Billing API (via Hosting)' });
});

// ✅ STEP 4: ADD GLOBAL JSON 404 (PERMANENT SAFETY)
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        error: "API route not found",
    });
});

// Custom 404 Handler for other routes
app.use((req, res, next) => {
    res.status(404).json({ // Ensure JSON
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Global Error Handler (Must be last)
app.use((err, req, res, next) => {
    console.error("🔥 Global Error:", err);
    if (res.headersSent) return next(err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Database Sync (Be careful with this in serverless environment)
// Ideally, migrations should be run separately, but for now we'll keep it simple.
// Note: In Cloud Functions, this might run on every cold start.
/*
db.sequelize.sync({ alter: true })
    .then(() => {
        console.log('Database synced');
    })
    .catch((err) => {
        console.error('Failed to sync database:', err);
    });
*/

module.exports = app;
