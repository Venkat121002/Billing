/**
 * Signup verification: two independent 6-digit codes, one by email and one by
 * WhatsApp, so both the email address and the mobile number are proven.
 *
 *   sendSignupOtp(email, { mobile, channel })     -> sends both codes (or one, with
 *                                                    channel 'email' | 'whatsapp', for resend)
 *   verifySignupOtp({ email, mobile, emailOtp, mobileOtp })
 *                                                 -> both must match; returns a short-lived signed token
 *   assertVerifiedSignup(email, mobile, token)     -> used by /auth/register
 *
 * If the WhatsApp code can't be delivered, signup is blocked (no email-only fallback).
 *
 * Codes are stored server-side (MongoDB or Firestore) as an HMAC, never in plaintext
 * and never in anything the browser can read. Each code expires after 5 minutes and
 * allows 5 wrong guesses. Records are keyed by the email, or by "wa:<digits>" for
 * the mobile number.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db, admin } = require('../config/firebase');
const { OtpVerification, Owner } = require('../models/mongodb');
const emailService = require('./emailService');
const wa = require('./whatsappService');
const emailTemplates = require('./emailTemplates');

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;
const VERIFIED_TOKEN_TTL = '30m';
const TOKEN_PURPOSE = 'signup-verified';

class OtpError extends Error {
    constructor(status, msg) {
        super(msg);
        this.status = status;
    }
}

const isMongo = () => (process.env.DB_TYPE || 'mongodb') === 'mongodb';
const isProd = () => process.env.NODE_ENV === 'production';
const normalize = (email) => String(email || '').trim().toLowerCase();
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const otpRequired = () => String(process.env.OTP_REQUIRED || 'true').toLowerCase() !== 'false';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const newCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

const CHANNELS = {
    email: { label: 'email', key: (email) => email },
    whatsapp: { label: 'WhatsApp', key: (_email, mobile) => `wa:${mobile}` }
};

const hashOtp = (key, otp) =>
    crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${key}:${otp}`).digest('hex');

// ---- storage (one record per key; the Mongo field is still called `email`) ----
const fsRef = (key) =>
    db.collection('SwordNexBillingSoftware').doc(process.env.TENANT_ID)
        .collection('otpVerifications').doc(crypto.createHash('sha256').update(key).digest('hex'));

const load = async (key) => {
    if (isMongo()) return OtpVerification.findOne({ email: key }).lean();
    const doc = await fsRef(key).get();
    return doc.exists ? doc.data() : null;
};

const save = async (key, data) => {
    const record = { ...data, email: key, expireAt: new Date(data.expiresAt + 60 * 60 * 1000) };
    if (isMongo()) {
        await OtpVerification.updateOne({ email: key }, { $set: record }, { upsert: true });
    } else {
        await fsRef(key).set(record);
    }
};

const remove = async (key) => {
    if (isMongo()) await OtpVerification.deleteOne({ email: key });
    else await fsRef(key).delete();
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

/** Throws if this key is in its resend cooldown or hourly cap; returns the rate window. */
const rateWindow = async (key, label, now) => {
    const existing = await load(key);
    if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
        throw new OtpError(429, `Please wait ${wait}s before requesting another ${label} code.`);
    }
    let windowStart = existing?.windowStart || now;
    let sendCount = existing?.sendCount || 0;
    if (now - windowStart > 60 * 60 * 1000) {
        windowStart = now;
        sendCount = 0;
    }
    if (sendCount >= MAX_SENDS_PER_HOUR) {
        throw new OtpError(429, `Too many ${label} codes requested. Please try again in an hour.`);
    }
    return { windowStart, sendCount };
};

const issue = async (key, window, now) => {
    const otp = newCode();
    await save(key, {
        otpHash: hashOtp(key, otp),
        expiresAt: now + OTP_TTL_MS,
        attempts: 0,
        lastSentAt: now,
        windowStart: window.windowStart,
        sendCount: window.sendCount + 1
    });
    return otp;
};

const deliverEmail = async (email, otp) => {
    if (!emailService.isConfigured()) {
        // Local development only (production is rejected earlier): no email provider.
        console.log(`[otp] DEV MODE, no email provider. Email code for ${email}: ${otp}`);
        return;
    }
    await emailService.sendEmail({ to: email, ...emailTemplates.signupOtp({ otp }) });
};

const deliverWhatsapp = async (mobile, otp) => {
    try {
        // Without credentials (local dev) this logs the message, code included.
        await wa.sendTemplate({ to: mobile, type: 'OTP_VERIFICATION', data: { otp } });
    } catch (err) {
        console.error(`[otp] WhatsApp code to ${mobile} failed:`, err.message);
        throw new OtpError(502, "Couldn't send a WhatsApp code to this number. Check that it's a WhatsApp number and try again.");
    }
};

/**
 * Returns null if `otp` matches the stored code for `key`, otherwise a message.
 * A wrong guess is counted; an expired or exhausted code is deleted. A correct
 * code is NOT consumed here, so one wrong box doesn't burn the other code.
 */
const check = async (key, label, otp) => {
    const record = await load(key);
    if (!record) return `No ${label} code found. Please request a new one.`;

    if (Date.now() > record.expiresAt) {
        await remove(key);
        return `The ${label} code has expired. Please request a new one.`;
    }
    if (record.attempts >= MAX_ATTEMPTS) {
        await remove(key);
        return `Too many wrong attempts on the ${label} code. Please request a new one.`;
    }

    const expected = Buffer.from(record.otpHash, 'hex');
    const actual = Buffer.from(hashOtp(key, otp), 'hex');
    if (expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) return null;

    const { email: _k, expireAt: _x, ...rest } = record;
    await save(key, { ...rest, attempts: record.attempts + 1 });
    const left = MAX_ATTEMPTS - (record.attempts + 1);
    return left > 0
        ? `Incorrect ${label} code. ${left} attempt(s) left.`
        : `Too many wrong attempts on the ${label} code. Please request a new one.`;
};

const parseContact = (rawEmail, rawMobile) => {
    const email = normalize(rawEmail);
    if (!isEmail(email)) throw new OtpError(400, 'Please enter a valid email address.');
    const mobile = wa.normalizePhone(rawMobile);
    if (!mobile) throw new OtpError(400, 'Please enter a valid WhatsApp mobile number.');
    return { email, mobile };
};

// ---- public API ----
exports.otpRequired = otpRequired;

exports.sendSignupOtp = async (rawEmail, { mobile: rawMobile, channel } = {}) => {
    const { email, mobile } = parseContact(rawEmail, rawMobile);
    const channels = channel === 'email' || channel === 'whatsapp' ? [channel] : ['whatsapp', 'email'];

    if (await emailAlreadyRegistered(email)) {
        throw new OtpError(409, 'An account with this email already exists. Please log in.');
    }

    if (isProd() && channels.includes('email') && !emailService.isConfigured()) {
        console.error('[otp] no email provider (SMTP_USER/SMTP_PASS or BREVO_API_KEY) configured; cannot send signup OTP');
        throw new OtpError(503, 'Email service is not available right now. Please try again later.');
    }
    if (isProd() && channels.includes('whatsapp') && !wa.isConfigured()) {
        console.error('[otp] WhatsApp is not configured; cannot send signup OTP');
        throw new OtpError(503, 'WhatsApp verification is not available right now. Please try again later.');
    }

    // Check every channel's limits before sending anything, so a 429 on one
    // doesn't leave the user with only half of the codes.
    const now = Date.now();
    const windows = {};
    for (const ch of channels) {
        windows[ch] = await rateWindow(CHANNELS[ch].key(email, mobile), CHANNELS[ch].label, now);
    }

    // WhatsApp first: if the number can't receive it, stop before emailing a code.
    for (const ch of channels) {
        const key = CHANNELS[ch].key(email, mobile);
        const otp = await issue(key, windows[ch], now);
        if (ch === 'whatsapp') await deliverWhatsapp(mobile, otp);
        else await deliverEmail(email, otp);
    }

    return { expiresInSeconds: OTP_TTL_MS / 1000, sent: channels };
};

exports.verifySignupOtp = async ({ email: rawEmail, mobile: rawMobile, emailOtp, mobileOtp }) => {
    const { email, mobile } = parseContact(rawEmail, rawMobile);
    const codes = { email: String(emailOtp || '').trim(), whatsapp: String(mobileOtp || '').trim() };
    if (!/^\d{6}$/.test(codes.email) || !/^\d{6}$/.test(codes.whatsapp)) {
        throw new OtpError(400, 'Enter both 6-digit codes.');
    }

    const keys = { email: CHANNELS.email.key(email, mobile), whatsapp: CHANNELS.whatsapp.key(email, mobile) };
    const errors = (await Promise.all([
        check(keys.email, CHANNELS.email.label, codes.email),
        check(keys.whatsapp, CHANNELS.whatsapp.label, codes.whatsapp)
    ])).filter(Boolean);
    if (errors.length) throw new OtpError(400, errors.join(' '));

    await Promise.all([remove(keys.email), remove(keys.whatsapp)]);
    const verificationToken = jwt.sign(
        { email, mobile, purpose: TOKEN_PURPOSE },
        process.env.JWT_SECRET,
        { expiresIn: VERIFIED_TOKEN_TTL }
    );
    return { verificationToken };
};

// Throws OtpError unless `token` proves both `email` and `mobile` passed verification.
exports.assertVerifiedSignup = (rawEmail, rawMobile, token) => {
    if (!otpRequired()) return;
    const email = normalize(rawEmail);
    const mobile = wa.normalizePhone(rawMobile);
    try {
        const decoded = jwt.verify(String(token || ''), process.env.JWT_SECRET);
        if (decoded.purpose === TOKEN_PURPOSE && decoded.email === email && mobile && decoded.mobile === mobile) return;
    } catch (e) {
        // fall through
    }
    throw new OtpError(403, 'Please verify your email and WhatsApp number before registering.');
};

exports.OtpError = OtpError;
