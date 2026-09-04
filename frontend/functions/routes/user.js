const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
// @route   POST api/users/create
// @desc    Create a sub-user
// @access  Private (Admin only)
router.post('/create', auth, (req, res, next) => require('../controllers/userController').createUser(req, res, next));

// @route   GET api/users
// @desc    Get all sub-users for the tenant
// @access  Private (Admin only)
router.get('/', auth, (req, res, next) => require('../controllers/userController').getSubUsers(req, res, next));

// @route   GET api/users/sessions
// @desc    Get session logs
// @access  Private (Admin only)
router.get('/sessions', auth, (req, res, next) => require('../controllers/userController').getUserSessions(req, res, next));

// @route   PUT api/users/:id
// @desc    Update a sub-user
// @access  Private (Admin only)
router.put('/:id', auth, (req, res, next) => require('../controllers/userController').updateUser(req, res, next));

// @route   DELETE api/users/:id
// @desc    Delete a sub-user
// @access  Private (Admin only)
router.delete('/:id', auth, (req, res, next) => require('../controllers/userController').deleteUser(req, res, next));

module.exports = router;
