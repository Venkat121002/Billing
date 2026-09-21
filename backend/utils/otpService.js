/**
 * Email OTP verification for registration.
 *
 *   sendSignupOtp(email)              -> emails a 6-digit code (rate limited)
 *   verifySignupOtp(email, otp)       -> returns a short-lived signed token on success
 *   assertVerifiedEmail(email, token) -> used by /auth/register
 *
 * Codes are stored server-side (MongoDB or Firestore) as an HMAC, never in plaintext
 * and never in anything the browser can read. Each code expires after 5 minutes and
 * allows 5 wrong guesses.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db, admin } = require('../config/firebase');
const { OtpVerification, Owner } = require('../models/mongodb');
const emailService = require('./emailService');

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;
const VERIFIED_TOKEN_TTL = '30m';

class OtpError extends Error {
    constructor(status, msg) {
        super(msg);
        this.status = status;
    }
}

const isMongo = () => (process.env.DB_TYPE || 'mongodb') === 'mongodb';
const normalize = (email) => String(email || '').trim().toLowerCase();
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const otpRequired = () => String(process.env.OTP_REQUIRED || 'true').toLowerCase() !== 'false';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hashOtp = (email, otp) =>
    crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${email}:${otp}`).digest('hex');

// ---- storage (one record per email) ----
const fsRef = (email) =>
    db.collection('SwordNexBillingSoftware').doc(process.env.TENANT_ID)
        .collection('otpVerifications').doc(crypto.createHash('sha256').update(email).digest('hex'));

const load = async (email) => {
    if (isMongo()) return OtpVerification.findOne({ email }).lean();
    const doc = await fsRef(email).get();
    return doc.exists ? doc.data() : null;
};

const save = async (email, data) => {
    const record = { ...data, email, expireAt: new Date(data.expiresAt + 60 * 60 * 1000) };
    if (isMongo()) {
        await OtpVerification.updateOne({ email }, { $set: record }, { upsert: true });
    } else {
        await fsRef(email).set(record);
    }
};

const remove = async (email) => {
    if (isMongo()) await OtpVerification.deleteOne({ email });
    else await fsRef(email).delete();
};

const emailAlreadyRegistered = async (email) => {
    if (isMongo()) {
        return !!(await Owner.exists({
            email: new RegExp(`^${escapeRegex(email)}$`, 'i'),
            tenantId: process.env.TENANT_ID
        }));
    }
    try {
        await admin.auth().getUserByEmail(email);
        return true;
    } catch (e) {
        if (e.code === 'auth/user-not-found') return false;
        throw e;
    }
};

// ---- public API ----
exports.otpRequired = otpRequired;

exports.sendSignupOtp = async (rawEmail) => {
    const email = normalize(rawEmail);
    if (!isEmail(email)) throw new OtpError(400, 'Please enter a valid email address.');

    if (await emailAlreadyRegistered(email)) {
        throw new OtpError(409, 'An account with this email already exists. Please log in.');
    }

    const now = Date.now();
    const existing = await load(email);

    if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
        throw new OtpError(429, `Please wait ${wait}s before requesting another code.`);
    }

    let windowStart = existing?.windowStart || now;
    let sendCount = existing?.sendCount || 0;
    if (now - windowStart > 60 * 60 * 1000) {
        windowStart = now;
        sendCount = 0;
    }
    if (sendCount >= MAX_SENDS_PER_HOUR) {
        throw new OtpError(429, 'Too many codes requested. Please try again in an hour.');
    }

    if (!emailService.isConfigured() && process.env.NODE_ENV === 'production') {
        console.error('[otp] no email provider (SMTP_USER/SMTP_PASS or BREVO_API_KEY) configured; cannot send signup OTP');
        throw new OtpError(503, 'Email service is not available right now. Please try again later.');
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

    await save(email, {
        otpHash: hashOtp(email, otp),
        expiresAt: now + OTP_TTL_MS,
        attempts: 0,
        lastSentAt: now,
        windowStart,
        sendCount: sendCount + 1
    });

    if (!emailService.isConfigured()) {
        // Local development only (production is rejected above): no email provider.
        console.log(`[otp] DEV MODE, no email provider. Code for ${email}: ${otp}`);
        return { expiresInSeconds: OTP_TTL_MS / 1000 };
    }

    await emailService.sendEmail({
        to: email,
        subject: 'Your SwordNex Billing verification code',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2>Verify your email</h2>
            <p>Use this code to finish creating your SwordNex Billing account:</p>
            <p style="font-size:32px;letter-spacing:8px;font-weight:bold">${otp}</p>
            <p>It expires in 5 minutes. If you didn't request it, you can ignore this email.</p>
          </div>`
    });

    return { expiresInSeconds: OTP_TTL_MS / 1000 };
};

exports.verifySignupOtp = async (rawEmail, rawOtp) => {
    const email = normalize(rawEmail);
    const otp = String(rawOtp || '').trim();
    if (!isEmail(email) || !/^\d{6}$/.test(otp)) {
        throw new OtpError(400, 'Enter the 6-digit code.');
    }

    const record = await load(email);
    if (!record) throw new OtpError(400, 'No code found. Please request a new one.');

    if (Date.now() > record.expiresAt) {
        await remove(email);
        throw new OtpError(400, 'This code has expired. Please request a new one.');
    }

    if (record.attempts >= MAX_ATTEMPTS) {
        await remove(email);
        throw new OtpError(429, 'Too many wrong attempts. Please request a new code.');
    }

    const expected = Buffer.from(record.otpHash, 'hex');
    const actual = Buffer.from(hashOtp(email, otp), 'hex');
    const ok = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!ok) {
        const { email: _e, expireAt: _x, ...rest } = record;
        await save(email, { ...rest, attempts: record.attempts + 1 });
        const left = MAX_ATTEMPTS - (record.attempts + 1);
        throw new OtpError(
            400,
            left > 0 ? `Incorrect code. ${left} attempt(s) left.` : 'Too many wrong attempts. Please request a new code.'
        );
    }

    await remove(email);
    const verificationToken = jwt.sign(
        { email, purpose: 'signup-email-verified' },
        process.env.JWT_SECRET,
        { expiresIn: VERIFIED_TOKEN_TTL }
    );
    return { verificationToken };
};

// Throws OtpError unless `token` proves `email` passed OTP verification.
exports.assertVerifiedEmail = (rawEmail, token) => {
    if (!otpRequired()) return;
    const email = normalize(rawEmail);
    try {
        const decoded = jwt.verify(String(token || ''), process.env.JWT_SECRET);
        if (decoded.purpose === 'signup-email-verified' && decoded.email === email) return;
    } catch (e) {
        // fall through
    }
    throw new OtpError(403, 'Please verify your email with the OTP before registering.');
};

exports.OtpError = OtpError;
