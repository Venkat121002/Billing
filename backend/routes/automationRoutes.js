const express = require('express');
const router = express.Router();
const auth = require('../middleware/firestoreAuth');
const roleAuth = require('../middleware/roleAuth');
const { runDailyLowStockSummary } = require('../utils/inventoryAlerts');
const { runDuePaymentReminders } = require('../utils/dueReminders');
const { generateDailySalesSummary, runAllOwnersDailySalesSummary } = require('../utils/salesSummary');
const { isGeminiConfigured } = require('../config/gemini');

// All automation routes require authentication and owner/TenantAdmin/superadmin role
router.use(auth);
router.use(roleAuth(['owner', 'TenantAdmin', 'superadmin']));

// @desc    Get Automation & AI status
// @route   GET /api/v2/automation/status
router.get('/status', (req, res) => {
    res.json({
        phase1: {
            status: 'active',
            features: [
                'Auto-Invoice Numbering & Date Prefill',
                'Smart Product Search (Fuzzy + Barcode)',
                'Low Stock Alerts (WhatsApp + Daily Email Summary)',
                'Automated Dues Payment Reminders (3d, 7d, 15d)',
                'Daily Closing Sales Summary (WhatsApp + Email at 9 PM IST)'
            ]
        },
        geminiConfigured: isGeminiConfigured(),
        serverTimeIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
});

// @desc    Trigger Daily Sales Summary (for current owner or all owners)
// @route   POST /api/v2/automation/sales-summary
router.post('/sales-summary', async (req, res) => {
    try {
        const ownerId = req.body.all === true && req.user.role === 'superadmin'
            ? null
            : (req.user.ownerId || req.user.userId);

        if (ownerId) {
            const result = await generateDailySalesSummary({ ownerId, date: req.body.date ? new Date(req.body.date) : new Date() });
            return res.json({ msg: 'Daily sales summary generated', result });
        } else {
            const result = await runAllOwnersDailySalesSummary(req.body.date ? new Date(req.body.date) : new Date());
            return res.json({ msg: 'Daily sales summary for all stores executed', result });
        }
    } catch (err) {
        console.error('Trigger sales summary error:', err);
        res.status(500).json({ msg: 'Failed to generate sales summary', error: err.message });
    }
});

// @desc    Trigger Low-Stock Summary Email
// @route   POST /api/v2/automation/low-stock-summary
router.post('/low-stock-summary', async (req, res) => {
    try {
        const result = await runDailyLowStockSummary();
        res.json({ msg: 'Low-stock summary scan completed', result });
    } catch (err) {
        console.error('Trigger low stock error:', err);
        res.status(500).json({ msg: 'Failed to run low stock summary', error: err.message });
    }
});

// @desc    Trigger Dues Payment Reminders
// @route   POST /api/v2/automation/due-reminders
router.post('/due-reminders', async (req, res) => {
    try {
        const result = await runDuePaymentReminders();
        res.json({ msg: 'Due payment reminders scan completed', result });
    } catch (err) {
        console.error('Trigger dues reminder error:', err);
        res.status(500).json({ msg: 'Failed to run due payment reminders', error: err.message });
    }
});

module.exports = router;
