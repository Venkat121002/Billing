const express = require('express');
const router = express.Router();
const authController = require('../controllers/firestoreAuthController');
const auth = require('../middleware/firestoreAuth');
const roleAuth = require('../middleware/roleAuth');

// @route   POST /api/v2/auth/register
router.post('/register', authController.register);

// @route   POST /api/v2/auth/login
router.post('/login', authController.login);

// @route   GET /api/v2/auth/me
router.get('/me', auth, authController.getMe);

// @route   PUT /api/v2/auth/update-profile
router.put('/update-profile', auth, authController.updateProfile);

// @route   POST /api/v2/auth/logout
router.post('/logout', auth, authController.logout);

// @route   DELETE /api/v2/auth/delete-account
router.delete('/delete-account', auth, authController.deleteAccount);

// @route   POST /api/v2/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// @route   POST /api/v2/auth/reset-password
router.post('/reset-password', authController.resetPassword);

// @route   POST /api/v2/auth/select-industry
router.post('/select-industry', auth, authController.selectIndustry);

// @route   GET /api/v2/auth/item-categories
// @desc    Store's category → product list (null until the owner saves one)
router.get('/item-categories', auth, authController.getItemCategories);

// @route   PUT /api/v2/auth/item-categories
// @desc    Replace the store's category → product list (owner only)
router.put('/item-categories', auth, roleAuth(['owner', 'TenantAdmin']), authController.updateItemCategories);

module.exports = router;
