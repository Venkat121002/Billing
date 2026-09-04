const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
// const auth = require('../middleware/auth'); (Removed duplicate)
// const db = require('../models'); // Lazy loaded below
// const User = db.User;
// @route   POST api/auth/register
// @desc    Register a user and tenant
// @access  Public
router.post('/register', (req, res, next) => require('../controllers/authController').register(req, res, next));

// @route   POST api/auth/login
// @desc    Auth user & get token
// @access  Public
router.post('/login', (req, res, next) => require('../controllers/authController').login(req, res, next));

// @route   POST api/auth/google-login
// @desc    Auth user with Google & get token
// @access  Public
router.post('/google-login', (req, res, next) => require('../controllers/authController').googleLogin(req, res, next));

// @route   GET api/auth/me
// @desc    Get logged in user
// @access  Private
// @route   GET api/auth/me
// @desc    Get logged in user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const db = require('../models');
        const User = db.User; // Ensure we have the model
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [{ model: db.Tenant }] // Include Tenant
        });

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const userData = user.toJSON();

        // Compatibility fields
        userData.uid = user.firebase_uid || String(user.id);
        userData.success = true; // User requested success: true format

        res.status(200).json(userData);
    } catch (err) {
        console.error("GET /me Error:", err.message);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', (req, res, next) => require('../controllers/authController').forgotPassword(req, res, next));

// @route   POST api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', (req, res, next) => require('../controllers/authController').resetPassword(req, res, next));

// @route   POST api/auth/update-subscription
// @desc    Update user subscription
// @access  Private
router.post('/update-subscription', auth, (req, res, next) => require('../controllers/authController').updateSubscription(req, res, next));

// @route   DELETE api/auth/delete-account
// @desc    Delete user account and data
// @access  Private
router.delete('/delete-account', auth, (req, res, next) => require('../controllers/authController').deleteAccount(req, res, next));
// @route   POST api/auth/start-trial
// @desc    Activate trial for pending users
// @access  Private
router.post('/start-trial', auth, (req, res, next) => require('../controllers/authController').startTrial(req, res, next));

// @route   POST api/auth/onboarding
// @desc    Save onboarding details (Job title, Company size, etc.)
// @access  Private
router.post('/onboarding', auth, (req, res, next) => require('../controllers/authController').saveOnboardingDetails(req, res, next));

// @route   PUT api/auth/update-profile
// @desc    Update business profile (address, tax info)
// @access  Private
router.put('/update-profile', auth, (req, res, next) => require('../controllers/authController').updateProfile(req, res, next));

// @route   POST api/auth/super-login
// @desc    Backend login for Super Admin (Called after Firebase Auth)
// @access  Public (Protected by hardcoded email check for now)
router.post('/super-login', (req, res, next) => require('../controllers/authController').superAdminLogin(req, res, next));

// @route   POST api/auth/logout
// @desc    Logout user and record session end
// @access  Private
router.post('/logout', auth, (req, res, next) => require('../controllers/authController').logout(req, res, next));

module.exports = router;
