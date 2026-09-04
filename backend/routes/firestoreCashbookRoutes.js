const express = require('express');
const router = express.Router();
const cashbookController = require('../controllers/firestoreCashbookController');
const auth = require('../middleware/firestoreAuth');

// All routes require authentication
router.use(auth);

router.get('/', cashbookController.getTransactions);
router.post('/', cashbookController.createTransaction);
router.put('/:id', cashbookController.updateTransaction);
router.delete('/:id', cashbookController.deleteTransaction);

module.exports = router;
