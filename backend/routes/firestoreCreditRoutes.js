const express = require('express');
const router = express.Router();
const creditController = require('../controllers/firestoreCreditController');
const auth = require('../middleware/firestoreAuth');
const pay = require('../controllers/paymentController');

// All routes require authentication
router.use(auth);

router.get('/', creditController.getCredits);
router.post('/', creditController.createCredit);
router.put('/:id', creditController.updateCredit);
router.delete('/:id', creditController.deleteCredit);
router.post('/:id/pay-link', pay.createPayLink);
router.post('/:id/send-pay-link', pay.emailPayLink);

module.exports = router;
