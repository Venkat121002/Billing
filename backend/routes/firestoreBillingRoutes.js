const express = require('express');
const router = express.Router();
const billingController = require('../controllers/firestoreBillingController');
const planController = require('../controllers/planController');
const auth = require('../middleware/firestoreAuth');
const roleAuth = require('../middleware/roleAuth');
const subAuth = require('../middleware/subscriptionAuth');
const { enforceCombinedLimit, requireCapability } = require('../utils/planEnforcement');
const { Bill, GstBill } = require('../models/mongodb');

// Public — the pricing page reads plan names/prices/features here, logged in or not
router.get('/plans', planController.getPublicPlans);

// All routes below require authentication
router.use(auth);

// POS bills + GST bills share one "bills" limit (see planCapabilities.js).
const enforceBillLimit = enforceCombinedLimit('bills', [Bill, GstBill]);

// Billing actions (Require Active Subscription)
router.get('/bills', subAuth, billingController.getBills);
router.post('/bills', subAuth, enforceBillLimit, billingController.createBill);
router.post(
    '/bills/:id/whatsapp',
    subAuth,
    requireCapability('whatsappInvoices'),
    express.raw({ type: 'application/octet-stream', limit: '10mb' }),
    billingController.sendBillWhatsapp
);
router.get('/gst-bills', subAuth, billingController.getGSTBills);
router.post('/gst-bills', subAuth, enforceBillLimit, billingController.createGSTBill);

// Subscription management - Owner Only (DO NOT use subAuth here)
router.use(roleAuth(['owner', 'TenantAdmin']));
router.post('/create-order', billingController.createSubscriptionOrder);
router.post('/verify-payment', billingController.verifySubscriptionPayment);
router.post('/activate-trial', billingController.activateTrial);
router.post('/payment-success', billingController.paymentSuccess);
router.post('/test-email', billingController.testEmail);

module.exports = router;
