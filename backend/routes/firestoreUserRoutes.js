const express = require('express');
const router = express.Router();
const userController = require('../controllers/firestoreUserController');
const auth = require('../middleware/firestoreAuth');
const roleAuth = require('../middleware/roleAuth');
const subAuth = require('../middleware/subscriptionAuth');

// All routes require authentication
router.use(auth);

// Only owners can manage sub-users
router.use(roleAuth(['owner', 'TenantAdmin']));

// @route   POST /api/v2/users/create
// @desc    Create a sub-user
router.post('/create', userController.createSubUser);

// @route   GET /api/v2/users
// @desc    Get all sub-users for the owner
router.get('/', userController.getSubUsers);

// @route   PUT /api/v2/users/:id
// @desc    Update a sub-user
router.put('/:id', userController.updateSubUser);

// @route   DELETE /api/v2/users/:id
// @desc    Delete a sub-user
router.delete('/:id', userController.deleteSubUser);

module.exports = router;
