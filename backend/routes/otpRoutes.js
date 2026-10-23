const express = require('express');
const router = express.Router();
const otp = require('../utils/otpService');
const { limitAttemptsPerAccount } = require('../utils/attemptLimiter');

const handle = (fn) => async (req, res) => {
    try {
        res.json(await fn(req.body || {}));
    } catch (err) {
        if (err instanceof otp.OtpError) return res.status(err.status).json({ msg: err.message });
        console.error('OTP error:', err);
        res.status(500).json({ msg: err.message || 'Could not process the request. Please try again.' });
    }
};

// Registration verification (public: the user has no account yet).
// send: { email, mobile, channel? }  channel = 'email' | 'whatsapp' to resend just one code
router.post('/signup/send', limitAttemptsPerAccount('otp-send', { max: 5, windowMs: 60 * 60 * 1000 }), handle(({ email, mobile, channel }) => otp.sendSignupOtp(email, { mobile, channel })));
// verify: { email, mobile, emailOtp, mobileOtp }  both codes are required
router.post('/signup/verify', limitAttemptsPerAccount('otp-verify', { max: 10 }), handle((body) => otp.verifySignupOtp(body)));

module.exports = router;
