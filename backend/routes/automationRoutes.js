const express = require('express');
const router = express.Router();
const auth = require('../middleware/firestoreAuth');
const roleAuth = require('../middleware/roleAuth');
const { runDailyLowStockSummary } = require('../utils/inventoryAlerts');
const { runDuePaymentReminders } = require('../utils/dueReminders');
const { generateDailySalesSummary, runAllOwnersDailySalesSummary } = require('../utils/salesSummary');
const { isGeminiConfigured } = require('../config/gemini');
const { Product, Bill } = require('../models/mongodb');
const platformStore = require('../utils/platformStore');
const { generateDailyReportPDF } = require('../utils/reportPdfGenerator');

// Phase 2 Utilities
const { generateDemandForecast } = require('../utils/demandForecasting');
const { analyzeCustomerSegments } = require('../utils/customerSegmentation');
const { categorizeExpense } = require('../utils/expenseCategorization');
const { generateGstReturnsSummary, buildGstExcelWorkbook } = require('../utils/gstReturnGenerator');
const wa = require('../utils/whatsappService');
const { listStoreRecords } = require('../utils/storeRecords');

// Phase 3 Feature 11 Utilities (Receipt & Invoice Scanner OCR)
const multer = require('multer');
const uploadReceipt = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});
const {
    scanReceiptOrInvoice,
    saveScannedReceiptAsExpense,
    saveScannedReceiptToInventory,
    SAMPLE_RECEIPTS
} = require('../utils/receiptScanner');

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
                'Demand Forecasting & Restock Suggestions',
                'Customer Insights & RFM Segmentation',
                'AI Expense Categorization for Cashbook',
                'GST Return Preparation (GSTR-1 & GSTR-3B with Excel Export)'
            ]
        },
        phase3: {
            status: 'active',
            features: [
                'Receipt/Invoice Scanner (OCR)'
            ]
        },
        geminiConfigured: isGeminiConfigured(),
        serverTimeIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
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
        if (!mobile || !message || typeof message !== 'string') {
            return res.status(400).json({ msg: 'Mobile and message are required' });
        }

        // Only this store's own customers (directory or bills) can be messaged,
        // so the platform's WhatsApp number can't be used to text arbitrary numbers.
        const to = wa.normalizePhone(mobile);
        const ownerId = req.user.ownerId || req.user.userId;
        const [customers, bills] = await Promise.all([
            listStoreRecords(ownerId, 'customers'),
            listStoreRecords(ownerId, 'bills')
        ]);
        const known = new Set(
            [...customers.map((c) => c.mobile || c.phone), ...bills.map((b) => b.customerPhone || b.customerMobile)]
                .map((p) => wa.normalizePhone(p))
                .filter(Boolean)
        );
        if (!to || !known.has(to)) {
            return res.status(403).json({ msg: 'Campaign messages can only be sent to your own customers.' });
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
// Phase 3 Feature 11: 📸 Receipt / Invoice Scanner (OCR)
// =========================================================================

// Get list of interactive preset sample receipts for 1-click testing
router.get('/scan-receipt/samples', (req, res) => {
    res.json({
        success: true,
        samples: SAMPLE_RECEIPTS.map(s => ({
            id: s.id,
            name: s.name,
            type: s.type,
            vendor: s.data.vendor?.name,
            total: s.data.financials?.grandTotal,
            category: s.data.suggestedExpenseCategory
        }))
    });
});

// Scan uploaded receipt or invoice (File upload or base64)
router.post('/scan-receipt', uploadReceipt.single('receipt'), async (req, res) => {
    try {
        const effectiveOwnerId = req.user.role === 'owner' || req.user.role === 'TenantAdmin'
            ? (req.user.userId || req.user.ownerId)
            : (req.user.ownerId || req.user.userId);
        const businessType = req.body.businessType || req.user.businessType || req.user.industry || 'Retail';

        let buffer = null;
        let mimeType = null;
        let filename = null;
        let base64Data = req.body.base64Data || null;

        const sampleId = req.body?.sampleId || req.query?.sampleId;

        if (req.file) {
            buffer = req.file.buffer;
            mimeType = req.file.mimetype;
            filename = req.file.originalname;
        } else if (sampleId) {
            filename = sampleId;
        }

        if (!buffer && !base64Data && !filename) {
            return res.status(400).json({ msg: 'Please provide a receipt file, base64 image, or sampleId' });
        }

        const parsedData = await scanReceiptOrInvoice({
            buffer,
            base64Data,
            mimeType: mimeType || req.body.mimeType,
            filename,
            ownerId: effectiveOwnerId,
            businessType
        });

        res.json({
            success: true,
            data: parsedData
        });
    } catch (err) {
        console.error('❌ Receipt Scanner OCR Error:', err);
        res.status(500).json({ msg: 'Failed to process receipt', error: err.message });
    }
});

// 1-Click: Save scanned receipt directly into CashBook as an Expense
router.post('/scan-receipt/save-expense', async (req, res) => {
    try {
        const effectiveOwnerId = req.user.role === 'owner' || req.user.role === 'TenantAdmin'
            ? (req.user.userId || req.user.ownerId)
            : (req.user.ownerId || req.user.userId);
        const userId = req.user.userId || req.user.uid;
        const { receiptData } = req.body;

        if (!receiptData) {
            return res.status(400).json({ msg: 'Receipt data is required' });
        }

        const result = await saveScannedReceiptAsExpense({
            ownerId: effectiveOwnerId,
            userId,
            receiptData,
            req
        });

        res.json(result);
    } catch (err) {
        console.error('❌ Save Scanned Expense Error:', err);
        res.status(500).json({ msg: 'Failed to save expense from receipt', error: err.message });
    }
});

// 1-Click: Save scanned receipt line items directly into Products / Inventory
router.post('/scan-receipt/save-inventory', async (req, res) => {
    try {
        const effectiveOwnerId = req.user.role === 'owner' || req.user.role === 'TenantAdmin'
            ? (req.user.userId || req.user.ownerId)
            : (req.user.ownerId || req.user.userId);
        const userId = req.user.userId || req.user.uid;
        const { receiptData } = req.body;

        if (!receiptData || !receiptData.items || receiptData.items.length === 0) {
            return res.status(400).json({ msg: 'Receipt items are required for inventory update' });
        }

        const result = await saveScannedReceiptToInventory({
            ownerId: effectiveOwnerId,
            userId,
            receiptData,
            req
        });

        res.json(result);
    } catch (err) {
        console.error('❌ Save Scanned Inventory Error:', err);
        res.status(500).json({ msg: 'Failed to update inventory from receipt', error: err.message });
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
        // Only the caller's own store; the all-stores run is the scheduled job.
        const result = await runDailyLowStockSummary(new Date(), { ownerId: req.user.ownerId || req.user.userId });
        res.json({ msg: 'Low-stock summary scan completed', result });
    } catch (err) {
        console.error('Trigger low stock error:', err);
        res.status(500).json({ msg: 'Failed to run low stock summary', error: err.message });
    }
});

router.post('/due-reminders', roleAuth(['owner', 'TenantAdmin', 'superadmin']), async (req, res) => {
    try {
        // Only the caller's own store; the all-stores run is the scheduled job.
        const result = await runDuePaymentReminders(new Date(), { ownerId: req.user.ownerId || req.user.userId });
        res.json({ msg: 'Due payment reminders scan completed', result });
    } catch (err) {
        console.error('Trigger dues reminder error:', err);
        res.status(500).json({ msg: 'Failed to run due payment reminders', error: err.message });
    }
});

// =========================================================================
// Pharmacy Refill Automation & Nightly Closing PDF
// =========================================================================

// Compute chronic patients due for medicine refill based on purchase history
router.get('/pharmacy/refills', async (req, res) => {
    try {
        const effectiveOwnerId = req.user.role === 'owner' || req.user.role === 'TenantAdmin'
            ? (req.user.userId || req.user.ownerId)
            : (req.user.ownerId || req.user.userId);
        const tenantId = req.user.tenantId || effectiveOwnerId;

        // Look back 60 days of bills to detect repeat course cycles
        const startDate = new Date(Date.now() - 60 * 86400000).toISOString();
        const bills = await Bill.find({
            ownerId: effectiveOwnerId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: -1 }).lean();

        const refills = [];
        const seenCombo = new Set();

        for (const bill of bills) {
            const customerName = bill.customer?.name || bill.customerName || bill.clientName;
            const customerPhone = bill.customer?.phone || bill.customer?.mobile || bill.customerPhone || bill.phone;
            if (!customerName || !customerPhone) continue;

            const items = bill.items || bill.products || [];
            const billDate = new Date(bill.createdAt || bill.date || Date.now());
            const daysElapsed = Math.max(0, Math.round((Date.now() - billDate.getTime()) / (1000 * 60 * 60 * 24)));

            for (const item of items) {
                const medName = item.name || item.description || '';
                if (!medName) continue;

                const comboKey = `${customerPhone}_${medName.toLowerCase().trim()}`;
                if (seenCombo.has(comboKey)) continue;
                seenCombo.add(comboKey);

                const qty = Number(item.qty || item.quantity || 1);
                // Standard course assumption: 1 strip (10-15 tabs) = 15-30 days supply
                const courseDays = qty >= 10 ? Math.min(60, Math.max(20, Math.round(qty))) : 30;
                const daysRemaining = courseDays - daysElapsed;
                const dueDate = new Date(billDate.getTime() + courseDays * 86400000).toISOString().split('T')[0];

                let status = 'active';
                if (daysRemaining <= 0) {
                    status = 'overdue';
                } else if (daysRemaining <= 5) {
                    status = 'due_soon'; // Day 25 to 30 window
                }

                refills.push({
                    id: `${bill._id || bill.id}_${item.sku || Math.random().toString(36).substring(7)}`,
                    patientName: customerName,
                    patientPhone: customerPhone,
                    medicineName: medName,
                    salt: item.salt || '',
                    batchNumber: item.batchNumber || '',
                    qtyPurchased: qty,
                    purchasedDate: billDate.toISOString().split('T')[0],
                    courseDays,
                    daysElapsed,
                    daysRemaining,
                    dueDate,
                    status
                });
            }
        }

        // Prioritize due_soon and overdue
        refills.sort((a, b) => a.daysRemaining - b.daysRemaining);

        res.json({
            success: true,
            totalPatients: refills.length,
            dueSoonCount: refills.filter(r => r.status === 'due_soon').length,
            overdueCount: refills.filter(r => r.status === 'overdue').length,
            refills
        });
    } catch (err) {
        console.error('❌ Pharmacy Refills Error:', err);
        res.status(500).json({ msg: 'Failed to compute medicine refills', error: err.message });
    }
});

// 1-Click Send Refill WhatsApp Reminder
router.post('/pharmacy/send-refill', async (req, res) => {
    try {
        const { patientName, patientPhone, medicineName, daysRemaining } = req.body;
        if (!patientPhone) {
            return res.status(400).json({ msg: 'Patient phone number is required' });
        }

        const effectiveOwnerId = req.user.role === 'owner' || req.user.role === 'TenantAdmin'
            ? (req.user.userId || req.user.ownerId)
            : (req.user.ownerId || req.user.userId);
        const owner = await platformStore.getOwner(effectiveOwnerId);
        const pharmacyName = owner?.companyDetails?.name || owner?.businessName || 'Your Neighborhood Pharmacy';

        const daysCount = Math.max(1, Math.abs(Number(daysRemaining) || 3));
        const dueDate = req.body.dueDate || new Date(Date.now() + daysCount * 86400000).toLocaleDateString('en-GB');

        const waRes = await wa.sendTemplate({
            to: patientPhone,
            type: 'MEDICINE_REFILL_REMINDER',
            data: {
                patient_name: patientName || 'Valued Patient',
                pharmacy_name: pharmacyName,
                medicine_name: medicineName || 'Prescription Medicines',
                days_left: String(daysCount),
                expiry_date: dueDate
            }
        });

        res.json({
            success: true,
            msg: `Refill reminder dispatched to ${patientName} on WhatsApp!`,
            waRes
        });
    } catch (err) {
        console.error('❌ Send Refill WhatsApp Error:', err);
        res.status(500).json({ msg: 'Failed to dispatch WhatsApp refill reminder', error: err.message });
    }
});

// Download 1-Page Nightly Closing PDF on demand
router.get('/daily-sales-summary/download-pdf', async (req, res) => {
    try {
        const effectiveOwnerId = req.user.role === 'owner' || req.user.role === 'TenantAdmin'
            ? (req.user.userId || req.user.ownerId)
            : (req.user.ownerId || req.user.userId);

        const targetDate = req.query.date ? new Date(req.query.date) : new Date();
        const owner = await platformStore.getOwner(effectiveOwnerId);
        const storeName = owner?.companyDetails?.name || owner?.businessName || 'Pharmacy & Medical Store';

        // Format to yyyy-mm-dd in Asia/Kolkata
        const istString = targetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const start = new Date(`${istString}T00:00:00.000+05:30`).toISOString();
        const end = new Date(`${istString}T23:59:59.999+05:30`).toISOString();

        const bills = await Bill.find({
            ownerId: effectiveOwnerId,
            createdAt: { $gte: start, $lte: end }
        }).lean();

        let totalRevenue = 0;
        let cashTotal = 0;
        let digitalTotal = 0;
        let cardTotal = 0;
        const productStats = {};

        bills.forEach((bill) => {
            const billTotal = Number(bill.totals?.grandTotal ?? bill.grandTotal ?? bill.total ?? 0);
            totalRevenue += billTotal;
            const method = String(bill.paymentMethod || 'cash').toLowerCase();
            if (method.includes('cash')) cashTotal += billTotal;
            else if (method.includes('card')) cardTotal += billTotal;
            else digitalTotal += billTotal;

            (bill.items || []).forEach((item) => {
                const name = item.name || 'Medicine';
                const qty = Number(item.qty || 1);
                const price = Number(item.price || 0);
                if (!productStats[name]) productStats[name] = { name, qty: 0, revenue: 0 };
                productStats[name].qty += qty;
                productStats[name].revenue += (price * qty);
            });
        });

        const topProducts = Object.values(productStats).sort((a, b) => b.qty - a.qty).slice(0, 5);
        const { Credit } = require('../models/mongodb');
        const todayCredits = await Credit.find({
            ownerId: effectiveOwnerId,
            createdAt: { $gte: start, $lte: end }
        }).lean();
        const duesIncurred = todayCredits.reduce((sum, c) => sum + Number(c.balance || c.amount || 0), 0);

        const pdfBuffer = await generateDailyReportPDF({
            storeName,
            ownerName: owner?.firstName || owner?.name || 'Pharmacist',
            date: istString,
            websiteUrl: process.env.FRONTEND_URL || 'https://swordnex-billing-app.web.app',
            totalSales: `Rs. ${totalRevenue.toFixed(2)}`,
            totalBills: bills.length,
            paymentBreakdown: {
                cash: `Rs. ${cashTotal.toFixed(2)}`,
                digital: `Rs. ${digitalTotal.toFixed(2)}`,
                card: `Rs. ${cardTotal.toFixed(2)}`
            },
            topProducts,
            duesIncurred: `Rs. ${duesIncurred.toFixed(2)}`,
            lowStockItems: []
        });

        const fileName = `Pharmacy_Closing_Report_${istString}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('❌ Download Closing PDF Error:', err);
        res.status(500).json({ msg: 'Failed to generate closing PDF', error: err.message });
    }
});

module.exports = router;
