const Razorpay = require('razorpay');

// Env is loaded by server.js (`.env.custom`) before controllers require this.

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Treat obvious placeholders / previously-leaked values as "not configured".
const PLACEHOLDER = /^\s*$|your_key|your_razorpay|rzp_(test|live)_your|changeme|rzp_live_Rimr8JIVXNSKlr/i;

const enabled =
    !!KEY_ID && !PLACEHOLDER.test(KEY_ID) &&
    !!KEY_SECRET && !PLACEHOLDER.test(KEY_SECRET);

if (!enabled) {
    console.warn('[razorpay] payments disabled — RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured');
}

module.exports = {
    instance: enabled ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET }) : null,
    enabled,
};
