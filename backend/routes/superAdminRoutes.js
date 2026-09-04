const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const auth = require('../middleware/auth');

// @route   POST /api/superadmin/register
// @desc    Register SuperAdmin
// @access  Public (but requires secret key)
router.post('/register', superAdminController.register);

// @route   POST /api/superadmin/login
// @desc    Login SuperAdmin
// @access  Public
router.post('/login', superAdminController.login);

// @route   GET /api/superadmin/admins
// @desc    Get all tenant admins
// @access  Private (SuperAdmin only)
router.get('/admins', auth, superAdminController.getAllAdmins);

// @route   GET /api/superadmin/stats
// @desc    Get dashboard statistics
// @access  Private (SuperAdmin only)
router.get('/stats', auth, superAdminController.getDashboardStats);

module.exports = router;
