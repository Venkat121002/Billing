const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   POST api/notifications/broadcast
// @desc    Send a notification to everyone
// @access  Private (Superadmin only)
router.post('/broadcast', auth, (req, res, next) => require('../controllers/notificationController').createBroadcast(req, res, next));

// @route   GET api/notifications
// @desc    Get notifications for the logged-in user
// @access  Private
router.get('/', auth, (req, res, next) => require('../controllers/notificationController').getMyNotifications(req, res, next));

module.exports = router;
