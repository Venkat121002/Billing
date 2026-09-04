const express = require('express');
const router = express.Router();
const gstBillController = require('../controllers/firestoreGstBillController');
const auth = require('../middleware/firestoreAuth');

// All routes require authentication
router.use(auth);

router.get('/', gstBillController.getGstBills);
router.post('/', gstBillController.createGstBill);
router.put('/:id', gstBillController.updateGstBill);
router.delete('/:id', gstBillController.deleteGstBill);

module.exports = router;
