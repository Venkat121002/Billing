const express = require('express');
const router = express.Router();
const authController = require('../controllers/firestoreAuthController');
const auth = require('../middleware/firestoreAuth');

// @route   POST /api/v2/auth/register
router.post('/register', authController.register);

// @route   POST /api/v2/auth/login
router.post('/login', authController.login);

// @route   GET /api/v2/auth/me
router.get('/me', auth, authController.getMe);

// @route   PUT /api/v2/auth/update-profile
router.put('/update-profile', auth, authController.updateProfile);

module.exports = router;
