// SwordNex Partner Program integration (server to server).
//
// Sign-up with a referral code  -> reportSignup   (partner sees "Free trial")
// First/renewal subscription    -> reportPayment  (partner commission becomes active)
//
// Everything is disabled until PARTNER_API_KEY is set, and a failure here never blocks Billing's own
// sign-up or payment flow: callers await one short attempt, temporary failures are retried in the background.
// Contract: docs/integration/openapi.yaml in the Partner Program repository.
const axios = require('axios');

const PRODUCT_ID = () => process.env.PARTNER_PRODUCT_ID || 'prod_billing';
const BASE_URL = () => (process.env.PARTNER_API_URL || '').replace(/\/+$/, '');
const API_KEY = () => process.env.PARTNER_API_KEY || '';
const GST_RATE = () => {
    const rate = Number(process.env.BILLING_GST_RATE);
    return Number.isFinite(rate) && rate >= 0 ? rate : 18;
};
// The first attempt is made inline (hosting platforms may freeze the process once the response is sent);
// if it fails temporarily, the remaining attempts run in the background after these delays.
const BACKGROUND_RETRY_DELAYS_MS = [5000, 30000, 300000];
const ATTEMPT_TIMEOUT_MS = 5000;

const isEnabled = () => !!(BASE_URL() && API_KEY());
const normalizeCode = (code) => (typeof code === 'string' ? code.trim().toUpperCase().slice(0, 30) : '');

/** Amount the customer paid (rupees, GST included) -> paise total and paise before GST. */
const splitAmount = (amountRupees) => {
    const totalPaise = Math.round(Number(amountRupees) * 100);
    const eligibleBasePaise = Math.round(totalPaise / (1 + GST_RATE() / 100));
    return { totalPaise, eligibleBasePaise };
};

/**
 * Checks a code on the sign-up form.
 * Returns { valid: true, partnerName } | { valid: false } | { unavailable: true } (Partner Program unreachable or not configured).
 */
const verifyCode = async (code) => {
    const clean = normalizeCode(code);
    if (!clean || !BASE_URL()) return { unavailable: true };
    try {
        const res = await axios.get(`${BASE_URL()}/referrals/verify-code/${encodeURIComponent(clean)}`, { timeout: 6000, validateStatus: () => true });
        if (res.status === 200 && res.data?.valid) return { valid: true, partnerCode: res.data.partnerCode, partnerName: res.data.partnerName };
        if (res.status === 404) return { valid: false };
        return { unavailable: true };
    } catch {
        return { unavailable: true };
    }
};

/** One POST. Resolves 'ok', 'rejected' (do not retry) or 'retry' (network error, 429, 5xx). */
const attempt = async (path, body, label) => {
    try {
        const res = await axios.post(`${BASE_URL()}${path}`, body, {
            headers: { 'x-api-key': API_KEY() }, timeout: ATTEMPT_TIMEOUT_MS, validateStatus: () => true
        });
        if (res.status >= 200 && res.status < 300) return 'ok';
        if (res.status !== 429 && res.status < 500) {
            console.error(`[partner-program] ${label} rejected (${res.status}):`, res.data?.message || res.data);
            return 'rejected';
        }
        console.error(`[partner-program] ${label} temporary failure (${res.status})`);
    } catch (err) {
        console.error(`[partner-program] ${label} failed:`, err.message);
    }
    return 'retry';
};

/** Never throws. Resolves true when recorded; on a temporary failure it keeps retrying in the background. */
const post = async (path, body, label) => {
    const first = await attempt(path, body, label);
    if (first !== 'retry') return first === 'ok';
    const next = (i) => {
        if (i >= BACKGROUND_RETRY_DELAYS_MS.length) return console.error(`[partner-program] ${label} gave up`);
        const timer = setTimeout(async () => {
            if (await attempt(path, body, label) === 'retry') next(i + 1);
        }, BACKGROUND_RETRY_DELAYS_MS[i]);
        if (timer.unref) timer.unref();
    };
    next(0);
    return false;
};

/** A customer created an account with a referral code. Never throws. */
const reportSignup = async ({ referralCode, email, name, trialEndsAt }) => {
    const code = normalizeCode(referralCode);
    if (!isEnabled() || !code || !email) return false;
    return post('/integrations/referral-signup', {
        referralCode: code,
        customerEmail: email,
        customerName: name || undefined,
        productId: PRODUCT_ID(),
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : undefined
    }, `signup ${email}`);
};

/** A verified subscription payment (first purchase or renewal). `amount` is in rupees, GST included. Never throws. */
const reportPayment = async ({ orderId, email, name, amount, billingCycle, referralCode }) => {
    if (!isEnabled() || !orderId || !email) return false;
    const { totalPaise, eligibleBasePaise } = splitAmount(amount);
    if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) return false;
    return post('/webhooks/direct-payment', {
        orderId: String(orderId),
        productId: PRODUCT_ID(),
        customerEmail: email,
        customerName: name || undefined,
        totalAmountPaise: totalPaise,
        eligibleBasePaise,
        billingCycle: billingCycle === 'yearly' || billingCycle === '3years' ? 'yearly' : 'monthly',
        referralCode: normalizeCode(referralCode) || undefined
    }, `payment ${orderId}`);
};

module.exports = { isEnabled, verifyCode, reportSignup, reportPayment, splitAmount, normalizeCode };
