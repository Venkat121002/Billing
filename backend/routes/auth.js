const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
// const db = require('../models');
let db = {};
try {
    db = require('../models');
} catch (err) {
    console.warn("⚠️ Database models failed to load in auth routes:", err.message);
}

const User = db.User || {};

// @route   POST api/auth/register
// @desc    Register a user and tenant
// @access  Public
router.post('/register', authController.register);

// @route   POST api/auth/login
// @desc    Auth user & get token
// @access  Public
router.post('/login', authController.login);

// @route   POST api/auth/google-login
// @desc    Auth user with Google & get token
// @access  Public
router.post('/google-login', authController.googleLogin);

// @route   GET api/auth/me
// @desc    Get logged in user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [{ model: db.Tenant }]
        });
        const userData = user.toJSON();
        userData.uid = user.id; // Alias id to uid for frontend compatibility
        res.json(userData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', authController.forgotPassword);

// @route   POST api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', authController.resetPassword);

// @route   POST api/auth/update-subscription
// @desc    Update user subscription
// @access  Private
router.post('/update-subscription', auth, authController.updateSubscription);

// @route   POST api/auth/start-trial
// @desc    Activate trial for pending users
// @access  Private
router.post('/start-trial', auth, authController.startTrial);

// @route   POST api/auth/onboarding
// @desc    Save onboarding details (Job title, Company size, etc.)
// @access  Private
router.post('/onboarding', auth, authController.saveOnboardingDetails);

// @route   PUT api/auth/update-profile
// @desc    Update business profile (address, tax info)
// @access  Private
router.put('/update-profile', auth, authController.updateProfile);

// @route   POST api/auth/super-login
// @desc    Backend login for Super Admin (Called after Firebase Auth)
// @access  Public (Protected by hardcoded email check for now)
router.post('/super-login', authController.superAdminLogin);

// @route   POST api/auth/logout
// @desc    Logout user and record session end
// @access  Private
router.post('/logout', auth, authController.logout);

// @route   DELETE api/auth/delete-account
// @desc    Delete user account and data
// @access  Private
router.delete('/delete-account', auth, authController.deleteAccount);

module.exports = router;
