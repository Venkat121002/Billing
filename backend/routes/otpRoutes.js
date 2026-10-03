const express = require('express');
const router = express.Router();
const otp = require('../utils/otpService');

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
router.post('/signup/send', handle(({ email, mobile, channel }) => otp.sendSignupOtp(email, { mobile, channel })));
// verify: { email, mobile, emailOtp, mobileOtp }  both codes are required
router.post('/signup/verify', handle((body) => otp.verifySignupOtp(body)));

module.exports = router;
