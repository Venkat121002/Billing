const express = require('express');
const router = express.Router();
const creditController = require('../controllers/firestoreCreditController');
const auth = require('../middleware/firestoreAuth');

// All routes require authentication
router.use(auth);

router.get('/', creditController.getCredits);
router.post('/', creditController.createCredit);
router.put('/:id', creditController.updateCredit);
router.delete('/:id', creditController.deleteCredit);

module.exports = router;
