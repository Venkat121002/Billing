const mongoose = require('mongoose');

// One pending signup OTP per email. Only a keyed hash of the code is stored.
// `expireAt` carries a TTL index so Mongo purges stale rows on its own.
const OtpVerificationSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Number, required: true }, // epoch ms, what verify() checks
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Number, default: 0 },
    windowStart: { type: Number, default: 0 },
    sendCount: { type: Number, default: 0 },
    expireAt: { type: Date, required: true, index: { expires: 0 } }
}, { strict: false });

module.exports = mongoose.model('OtpVerification', OtpVerificationSchema);
