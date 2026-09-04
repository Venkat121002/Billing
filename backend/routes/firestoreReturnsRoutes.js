const express = require('express');
const router = express.Router();
const firestoreReturnsController = require('../controllers/firestoreReturnsController');
const auth = require('../middleware/firestoreAuth');


router.use(auth);

// @route   GET api/returns
router.get('/', firestoreReturnsController.getReturns);

// @route   POST api/purchase-return
router.post('/purchase-return',firestoreReturnsController.processPurchaseReturn);

// @route   POST api/sales-return
router.post('/sales-return',firestoreReturnsController.processSalesReturn);

module.exports = router;