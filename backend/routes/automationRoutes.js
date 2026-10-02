const express = require('express');
const router = express.Router();
const auth = require('../middleware/firestoreAuth');
const roleAuth = require('../middleware/roleAuth');
const { runDailyLowStockSummary } = require('../utils/inventoryAlerts');
const { runDuePaymentReminders } = require('../utils/dueReminders');
const { generateDailySalesSummary, runAllOwnersDailySalesSummary } = require('../utils/salesSummary');
const { isGeminiConfigured } = require('../config/gemini');
const { Product } = require('../models/mongodb');

// Phase 2 Utilities
const { parseNaturalLanguageBill } = require('../utils/smartBillingAi');
const { generateDemandForecast } = require('../utils/demandForecasting');
const { analyzeCustomerSegments } = require('../utils/customerSegmentation');
const { categorizeExpense } = require('../utils/expenseCategorization');
const { generateGstReturnsSummary, buildGstExcelWorkbook } = require('../utils/gstReturnGenerator');
const wa = require('../utils/whatsappService');

// All automation routes require authentication
router.use(auth);

// =========================================================================
// Status Endpoint (Phase 1 & Phase 2)
// =========================================================================
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
        phase2: {
            status: 'active',
            features: [
                '🧠 Smart Billing Assistant (AI Chat & Voice Parsing)',
                '🧠 Demand Forecasting & Restock Suggestions',
                '🧠 Customer Insights & RFM Segmentation',
                '🧠 AI Expense Categorization for Cashbook',
                '🧠 GST Return Preparation (GSTR-1 & GSTR-3B with Excel Export)'
            ]
        },
        geminiConfigured: isGeminiConfigured(),
        serverTimeIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
});

// =========================================================================
// Feature 6: Smart Billing Assistant (AI Chat / Voice input parser)
// Allowed for all billing roles (cashier, subuser, owner, admin)
// =========================================================================
router.post('/smart-billing', async (req, res) => {
    try {
        const { orderText } = req.body;
        if (!orderText || !orderText.trim()) {
            return res.status(400).json({ msg: 'Order text is required' });
        }

        const ownerId = req.user.ownerId || req.user.userId;
        const tenantId = req.user.tenantId || process.env.TENANT_ID;

        // Fetch store products to provide catalog grounding for AI
        const query = {};
        if (ownerId && tenantId) {
            query.$or = [{ ownerId }, { tenantId }];
        } else if (ownerId) {
            query.ownerId = ownerId;
        }

        const products = await Product.find(query).lean();

        const result = await parseNaturalLanguageBill({
            orderText,
            catalog: products
        });

        res.json({
            success: true,
            orderText,
            method: result.method,
            parsedItems: result.parsedItems || [],
            unmatched: result.unmatched || []
        });
    } catch (err) {
        console.error('❌ Smart Billing Assistant Error:', err);
        res.status(500).json({ msg: 'Failed to parse order text', error: err.message });
    }
});

// =========================================================================
// Feature 7: Demand Forecasting & Smart Restock Suggestions
// =========================================================================
router.get('/demand-forecast', async (req, res) => {
    try {
        const ownerId = req.user.ownerId || req.user.userId;
        const tenantId = req.user.tenantId || process.env.TENANT_ID;
        const lookbackDays = parseInt(req.query.lookbackDays) || 30;
        const forecastDays = parseInt(req.query.forecastDays) || 7;

        const forecast = await generateDemandForecast({
            ownerId,
            tenantId,
            lookbackDays,
            forecastDays
        });

        res.json(forecast);
    } catch (err) {
        console.error('❌ Demand Forecast Error:', err);
        res.status(500).json({ msg: 'Failed to generate demand forecast', error: err.message });
    }
});

// =========================================================================
// Feature 8: Customer Insights & RFM Segmentation
// =========================================================================
router.get('/customer-segments', async (req, res) => {
    try {
        const ownerId = req.user.ownerId || req.user.userId;
        const tenantId = req.user.tenantId || process.env.TENANT_ID;

        const data = await analyzeCustomerSegments({ ownerId, tenantId });
        res.json(data);
    } catch (err) {
        console.error('❌ Customer Segmentation Error:', err);
        res.status(500).json({ msg: 'Failed to analyze customer segments', error: err.message });
    }
});

// Dispatch targeted WhatsApp campaign to customer
router.post('/send-segment-campaign', async (req, res) => {
    try {
        const { mobile, message, customerName } = req.body;
        if (!mobile || !message) {
            return res.status(400).json({ msg: 'Mobile and message are required' });
        }

        const personalized = message.replace('{customerName}', customerName || 'Customer');
        const sendResult = await wa.sendDirectText({ to: mobile, text: personalized });

        res.json({
            msg: `Campaign message sent to ${mobile}`,
            sendResult
        });
    } catch (err) {
        console.error('❌ Send Campaign Error:', err);
        res.status(500).json({ msg: 'Failed to dispatch campaign', error: err.message });
    }
});

// =========================================================================
// Feature 9: Expense Categorization (AI)
// Allowed for subusers and owners entering cashbook records
// =========================================================================
router.post('/categorize-expense', async (req, res) => {
    try {
        const { description, amount, businessType } = req.body;
        const result = await categorizeExpense({
            description,
            amount,
            businessType: businessType || req.user.businessType || 'Retail'
        });

        res.json(result);
    } catch (err) {
        console.error('❌ Expense Categorization Error:', err);
        res.status(500).json({ msg: 'Failed to categorize expense', error: err.message });
    }
});

// =========================================================================
// Feature 10: GST Return Preparation (GSTR-1, GSTR-3B, & Excel Export)
// =========================================================================
router.get('/gst-returns/summary', async (req, res) => {
    try {
        const ownerId = req.user.ownerId || req.user.userId;
        const tenantId = req.user.tenantId || process.env.TENANT_ID;
        const { month, year, startDate, endDate } = req.query;

        const summary = await generateGstReturnsSummary({
            ownerId,
            tenantId,
            month,
            year,
            startDate,
            endDate
        });

        res.json(summary);
    } catch (err) {
        console.error('❌ GST Returns Summary Error:', err);
        res.status(500).json({ msg: 'Failed to generate GST returns summary', error: err.message });
    }
});

router.get('/gst-returns/export', async (req, res) => {
    try {
        const ownerId = req.user.ownerId || req.user.userId;
        const tenantId = req.user.tenantId || process.env.TENANT_ID;
        const { month, year, startDate, endDate } = req.query;

        const summaryData = await generateGstReturnsSummary({
            ownerId,
            tenantId,
            month,
            year,
            startDate,
            endDate
        });

        const excelBuffer = buildGstExcelWorkbook(summaryData);
        const fileName = `GST_Returns_${summaryData.period.replace(/\s+/g, '_')}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(excelBuffer);
    } catch (err) {
        console.error('❌ GST Returns Export Error:', err);
        res.status(500).json({ msg: 'Failed to export GST returns', error: err.message });
    }
});

// =========================================================================
// Phase 1 Scheduled Triggers (Restricted to Owner/Admin)
// =========================================================================
router.post('/sales-summary', roleAuth(['owner', 'TenantAdmin', 'superadmin']), async (req, res) => {
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

router.post('/low-stock-summary', roleAuth(['owner', 'TenantAdmin', 'superadmin']), async (req, res) => {
    try {
        const result = await runDailyLowStockSummary();
        res.json({ msg: 'Low-stock summary scan completed', result });
    } catch (err) {
        console.error('Trigger low stock error:', err);
        res.status(500).json({ msg: 'Failed to run low stock summary', error: err.message });
    }
});

router.post('/due-reminders', roleAuth(['owner', 'TenantAdmin', 'superadmin']), async (req, res) => {
    try {
        const result = await runDuePaymentReminders();
        res.json({ msg: 'Due payment reminders scan completed', result });
    } catch (err) {
        console.error('Trigger dues reminder error:', err);
        res.status(500).json({ msg: 'Failed to run due payment reminders', error: err.message });
    }
});

module.exports = router;
