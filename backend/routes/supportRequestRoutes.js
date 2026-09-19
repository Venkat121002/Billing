const express = require('express');
const router = express.Router();
const supportRequestController = require('../controllers/supportRequestController');
const auth = require('../middleware/firestoreAuth');

// All routes require tenant authentication
router.use(auth);

router.post('/', supportRequestController.createSupportRequest);
router.get('/mine', supportRequestController.getMySupportRequests);

module.exports = router;
