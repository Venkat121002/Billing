const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
// @route   POST api/billing/payment-success
// @desc    Record payment, generate invoice, email, and save to history
// @access  Private
router.post('/payment-success', auth, (req, res, next) => require('../controllers/billingController').handlePaymentSuccess(req, res, next));

// @route   GET api/billing/history
// @desc    Get billing history for tenant
// @access  Private
router.get('/history', auth, (req, res, next) => require('../controllers/billingController').getBillingHistory(req, res, next));

// @route   GET api/billing/invoice/:invoiceId/download
// @desc    Download/View Invoice PDF
// @access  Private
router.get('/invoice/:invoiceId/download', auth, (req, res, next) => require('../controllers/billingController').downloadInvoice(req, res, next));

module.exports = router;
