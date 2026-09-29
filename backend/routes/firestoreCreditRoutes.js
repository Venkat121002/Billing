const express = require('express');
const router = express.Router();
const creditController = require('../controllers/firestoreCreditController');
const auth = require('../middleware/firestoreAuth');
const pay = require('../controllers/paymentController');
const { requireCapability } = require('../utils/planEnforcement');

// All routes require authentication
router.use(auth);

const requirePayLinks = requireCapability('payLinks');

router.get('/', creditController.getCredits);
router.get('/whatsapp-status', pay.whatsappStatus);
router.post('/', creditController.createCredit);
router.put('/:id', creditController.updateCredit);
router.delete('/:id', creditController.deleteCredit);
router.post('/:id/pay-link', requirePayLinks, pay.createPayLink);
router.post('/:id/send-pay-link', requirePayLinks, pay.emailPayLink);
router.post('/:id/whatsapp-pay-link', requirePayLinks, pay.whatsappPayLink);

module.exports = router;
