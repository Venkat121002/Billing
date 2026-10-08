const axios = require('axios');
const crypto = require('crypto');

// Environment variables are loaded by server.js before controllers require this.
const APP_ID = (process.env.CASHFREE_APP_ID || '').trim();
const SECRET_KEY = (process.env.CASHFREE_SECRET_KEY || '').trim();
const ENV = (process.env.CASHFREE_ENV || 'production').trim().toLowerCase();
if (!['sandbox', 'production'].includes(ENV)) {
    throw new Error('CASHFREE_ENV must be either "sandbox" or "production"');
}

// Treat obvious placeholders as "not configured".
const PLACEHOLDER = /^\s*$|your_app_id|your_secret|changeme/i;

const enabled = !!APP_ID && !PLACEHOLDER.test(APP_ID) && !!SECRET_KEY && !PLACEHOLDER.test(SECRET_KEY);

const BASE_URL = ENV === 'sandbox'
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';

if (!enabled) {
    console.warn('[cashfree] payments disabled — CASHFREE_APP_ID / CASHFREE_SECRET_KEY not configured');
} else {
    console.log(`✅ [cashfree] payments configured in ${ENV.toUpperCase()} mode (Base URL: ${BASE_URL})`);
}

/**
 * Common headers for Cashfree PG API v2023-08-01
 */
const getHeaders = () => ({
    'x-api-version': '2023-08-01',
    'x-client-id': APP_ID,
    'x-client-secret': SECRET_KEY,
    'Content-Type': 'application/json'
});

/**
 * Create a new payment order on Cashfree
 * @param {object} params
 * @param {string} params.orderId - Unique order ID (alphanumeric, underscores, hyphens)
 * @param {number} params.orderAmount - Amount in INR (e.g. 299.00)
 * @param {string} [params.orderCurrency='INR']
 * @param {object} params.customerDetails - { customer_id, customer_phone, customer_email, customer_name }
 * @param {object} [params.orderMeta] - { return_url, notify_url, payment_methods }
 * @param {string} [params.orderNote]
 * @param {object} [params.orderTags] - key-value custom tags
 * @returns {Promise<object>} Cashfree order response containing payment_session_id & order_id
 */
async function createOrder({
    orderId,
    orderAmount,
    orderCurrency = 'INR',
    customerDetails,
    orderMeta = {},
    orderNote = '',
    orderTags = {}
}) {
    if (!enabled) throw new Error('Cashfree is not configured on this server');
    const numericAmount = Number(orderAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Cashfree order amount must be a positive number');
    }

    // Clean customer details
    const customerId = String(customerDetails?.customer_id || `cust_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    let customerPhone = String(customerDetails?.customer_phone || '').replace(/\D/g, '');
    if (customerPhone.length > 10) customerPhone = customerPhone.slice(-10);
    if (customerPhone.length < 10) customerPhone = '9999999999'; // Safe 10-digit fallback

    const customerEmail = customerDetails?.customer_email && /^\S+@\S+\.\S+$/.test(customerDetails.customer_email)
        ? customerDetails.customer_email
        : 'customer@example.com';

    const customerName = String(customerDetails?.customer_name || 'Customer').trim().slice(0, 100) || 'Customer';

    // Format tags: keys/values strings, max length 50
    const sanitizedTags = {};
    if (orderTags && typeof orderTags === 'object') {
        for (const [k, v] of Object.entries(orderTags)) {
            if (v != null) {
                const cleanKey = String(k).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
                const cleanVal = String(v).slice(0, 50);
                if (cleanKey) sanitizedTags[cleanKey] = cleanVal;
            }
        }
    }

    const payload = {
        order_id: String(orderId).slice(0, 45),
        order_amount: Math.round(numericAmount * 100) / 100,
        order_currency: orderCurrency,
        customer_details: {
            customer_id: customerId,
            customer_phone: customerPhone,
            customer_email: customerEmail,
            customer_name: customerName
        },
        order_meta: orderMeta,
        order_note: String(orderNote || '').slice(0, 200)
    };

    if (Object.keys(sanitizedTags).length > 0) {
        payload.order_tags = sanitizedTags;
    }

    const res = await axios.post(`${BASE_URL}/orders`, payload, {
        headers: getHeaders(),
        timeout: 20000
    });

    return res.data;
}

/**
 * Fetch Order details from Cashfree
 * @param {string} orderId
 * @returns {Promise<object>}
 */
async function getOrder(orderId) {
    if (!enabled) throw new Error('Cashfree is not configured on this server');

    const res = await axios.get(`${BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
        headers: getHeaders(),
        timeout: 15000
    });

    return res.data;
}

/**
 * Fetch all payments for an order from Cashfree
 * @param {string} orderId
 * @returns {Promise<Array<object>>}
 */
async function getOrderPayments(orderId) {
    if (!enabled) throw new Error('Cashfree is not configured on this server');

    const res = await axios.get(`${BASE_URL}/orders/${encodeURIComponent(orderId)}/payments`, {
        headers: getHeaders(),
        timeout: 15000
    });

    return Array.isArray(res.data) ? res.data : [];
}

/**
 * Verify Cashfree webhook signature
 * Header x-webhook-signature is base64 of HMAC-SHA256(timestamp + rawBody, secretKey)
 * @param {string} signature - x-webhook-signature header
 * @param {string|Buffer} rawBody - exact raw body bytes/string
 * @param {string} timestamp - x-webhook-timestamp header
 * @returns {boolean}
 */
function verifyWebhookSignature(signature, rawBody, timestamp) {
    if (!enabled || !SECRET_KEY || !signature || !timestamp || !rawBody) return false;

    try {
        const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
        const expected = crypto.createHmac('sha256', SECRET_KEY)
            .update(Buffer.concat([Buffer.from(String(timestamp)), body]))
            .digest();
        const supplied = Buffer.from(String(signature), 'base64');
        return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
    } catch (err) {
        console.error('[cashfree] webhook signature verification error:', err.message);
        return false;
    }
}

module.exports = {
    enabled,
    appId: APP_ID,
    environment: ENV,
    baseUrl: BASE_URL,
    createOrder,
    getOrder,
    getOrderPayments,
    verifyWebhookSignature
};
