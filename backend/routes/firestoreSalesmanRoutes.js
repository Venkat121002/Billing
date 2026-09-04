
const express = require('express');
const router = express.Router();
const salesmanController = require('../controllers/firestoreSalesmanController');
const auth = require('../middleware/firestoreAuth');

// All routes require authentication
router.use(auth);

router.get('/', salesmanController.getSalesmen);
router.post('/', salesmanController.createSalesman);
router.put('/:id', salesmanController.updateSalesman);
router.delete('/:id', salesmanController.deleteSalesman);

module.exports = router;


