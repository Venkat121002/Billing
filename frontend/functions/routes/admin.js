const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming you want these protected

// @route   GET api/admin/tenants
// @desc    Get all tenants
// @access  Private (SuperAdmin ideally, but using auth for now)
router.get('/tenants', auth, (req, res, next) => require('../controllers/adminController').getAllTenants(req, res, next));

// @route   GET api/admin/users
// @desc    Get all users
// @access  Private
router.get('/users', auth, (req, res, next) => require('../controllers/adminController').getAllUsers(req, res, next));

module.exports = router;
