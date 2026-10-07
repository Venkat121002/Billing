const express = require('express');
const router = express.Router();
const controller = require('../controllers/firestoreClothingController');
const auth = require('../middleware/firestoreAuth');

router.use(auth);

// Pillar 1: Matrix Variant Generator & Batch Product Creator
router.post('/matrix-products', controller.createMatrixProducts);

// Pillar 2: High-Speed POS Digital WhatsApp Bill Dispatch
router.post('/send-bill-whatsapp', controller.sendBillWhatsApp);

// Pillar 4: 1-Click Size Exchange & Store Credit Notes
router.post('/size-exchange', controller.processSizeExchange);
router.get('/store-credits', controller.getStoreCredits);

// Pillar 5: Dead Stock / Aging Analysis & Nightly Closing Reconciliation
router.get('/aging-stock', controller.getAgingStock);
router.get('/eod-closing', controller.getEodClosing);
router.post('/send-eod-whatsapp', controller.sendEodWhatsApp);

module.exports = router;
