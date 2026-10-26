// SwordNex Partner Program integration (server to server).
//
// Sign-up with a referral code  -> reportSignup   (partner sees "Free trial")
// First/renewal subscription    -> reportPayment  (partner commission becomes active)
//
// Everything is disabled until PARTNER_API_KEY is set, and a failure here never blocks Billing's own
// sign-up or payment flow: reports are retried in the background and failures are only logged.
// Contract: docs/integration/openapi.yaml in the Partner Program repository.
const axios = require('axios');

const PRODUCT_ID = () => process.env.PARTNER_PRODUCT_ID || 'prod_billing';
const BASE_URL = () => (process.env.PARTNER_API_URL || '').replace(/\/+$/, '');
const API_KEY = () => process.env.PARTNER_API_KEY || '';
const GST_RATE = () => {
    const rate = Number(process.env.BILLING_GST_RATE);
    return Number.isFinite(rate) && rate >= 0 ? rate : 18;
};
const RETRY_DELAYS_MS = [0, 5000, 30000, 300000];

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

/** POST with retries on network errors, 429 and 5xx. Resolves true when recorded, false when given up. */
const post = async (path, body, label) => {
    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
        if (RETRY_DELAYS_MS[attempt]) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        try {
            const res = await axios.post(`${BASE_URL()}${path}`, body, {
                headers: { 'x-api-key': API_KEY() }, timeout: 10000, validateStatus: () => true
            });
            if (res.status >= 200 && res.status < 300) return true;
            if (res.status !== 429 && res.status < 500) {
                console.error(`[partner-program] ${label} rejected (${res.status}):`, res.data?.message || res.data);
                return false;
            }
        } catch (err) {
            console.error(`[partner-program] ${label} attempt ${attempt + 1} failed:`, err.message);
        }
    }
    console.error(`[partner-program] ${label} gave up after ${RETRY_DELAYS_MS.length} attempts`);
    return false;
};

/** Fire-and-forget: a customer created an account with a referral code. */
const reportSignup = ({ referralCode, email, name, trialEndsAt }) => {
    const code = normalizeCode(referralCode);
    if (!isEnabled() || !code || !email) return;
    post('/integrations/referral-signup', {
        referralCode: code,
        customerEmail: email,
        customerName: name || undefined,
        productId: PRODUCT_ID(),
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : undefined
    }, `signup ${email}`).catch(() => {});
};

/** Fire-and-forget: a verified subscription payment (first purchase or renewal). `amount` is in rupees, GST included. */
const reportPayment = ({ orderId, email, name, amount, billingCycle, referralCode }) => {
    if (!isEnabled() || !orderId || !email) return;
    const { totalPaise, eligibleBasePaise } = splitAmount(amount);
    if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) return;
    post('/webhooks/direct-payment', {
        orderId: String(orderId),
        productId: PRODUCT_ID(),
        customerEmail: email,
        customerName: name || undefined,
        totalAmountPaise: totalPaise,
        eligibleBasePaise,
        billingCycle: billingCycle === 'yearly' || billingCycle === '3years' ? 'yearly' : 'monthly',
        referralCode: normalizeCode(referralCode) || undefined
    }, `payment ${orderId}`).catch(() => {});
};

module.exports = { isEnabled, verifyCode, reportSignup, reportPayment, splitAmount, normalizeCode };
