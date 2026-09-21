const express = require('express');
const router = express.Router();
const otp = require('../utils/otpService');

const handle = (fn) => async (req, res) => {
    try {
        res.json(await fn(req.body || {}));
    } catch (err) {
        if (err instanceof otp.OtpError) return res.status(err.status).json({ msg: err.message });
        console.error('OTP error:', err.message);
        res.status(500).json({ msg: 'Could not process the request. Please try again.' });
    }
};

// Registration email verification (public: the user has no account yet)
router.post('/signup/send', handle(({ email }) => otp.sendSignupOtp(email)));
router.post('/signup/verify', handle(({ email, otp: code }) => otp.verifySignupOtp(email, code)));

module.exports = router;
