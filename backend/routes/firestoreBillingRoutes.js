const express = require('express');
const router = express.Router();
const billingController = require('../controllers/firestoreBillingController');
const auth = require('../middleware/firestoreAuth');
const roleAuth = require('../middleware/roleAuth');
const subAuth = require('../middleware/subscriptionAuth');

// All routes require authentication
router.use(auth);

// Billing actions (Require Active Subscription)
router.get('/bills', subAuth, billingController.getBills);
router.post('/bills', subAuth, billingController.createBill);
router.get('/gst-bills', subAuth, billingController.getGSTBills);
router.post('/gst-bills', subAuth, billingController.createGSTBill);

// Subscription management - Owner Only (DO NOT use subAuth here)
router.use(roleAuth(['owner', 'TenantAdmin']));
router.post('/create-order', billingController.createSubscriptionOrder);
router.post('/verify-payment', billingController.verifySubscriptionPayment);
router.post('/activate-trial', billingController.activateTrial);
router.post('/payment-success', billingController.paymentSuccess);
router.post('/test-email', billingController.testEmail);

module.exports = router;
