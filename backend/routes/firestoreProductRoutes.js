const express = require('express');
const router = express.Router();
const productController = require('../controllers/firestoreProductController');
const auth = require('../middleware/firestoreAuth');
const roleAuth = require('../middleware/roleAuth');
const subAuth = require('../middleware/subscriptionAuth');
const { enforceLimit } = require('../utils/planEnforcement');

// All routes require authentication
router.use(auth);
// Ensure role is authorized
router.use(roleAuth(['owner', 'subuser', 'TenantAdmin']));
// Ensure owner subscription is active
router.use(subAuth);

router.get('/barcode/:barcode', productController.getProductByBarcode);
router.get('/:id', productController.getProduct);

router.get('/', productController.getProducts);
router.post('/', enforceLimit('products', 'products'), productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
