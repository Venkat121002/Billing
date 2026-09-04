const express = require('express');
const router = express.Router();
const customerController = require('../controllers/firestoreCustomerController');
const auth = require('../middleware/firestoreAuth');

// All routes require authentication
router.use(auth);

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById); // Added Single Customer Get
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
