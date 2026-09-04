const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/importController');
const auth = require('../middleware/firestoreAuth');

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.use(auth);

// @route   POST api/import/preview
router.post('/preview', upload.single('file'), importController.getPreview);

// @route   POST api/import/map-preview
router.post('/map-preview', importController.mapAndValidate);

// @route   POST api/import/confirm
router.post('/confirm', importController.confirmImport);

module.exports = router;