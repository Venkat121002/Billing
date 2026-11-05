const crypto = require('crypto');

const PRODUCTION_SITE = 'https://swordnex-billing-app.web.app';

function getSecret() {
    return process.env.JWT_SECRET || process.env.SUPERADMIN_PASSWORD || 'swordnex-daily-email-secret-key';
}

function siteUrl() {
    return (process.env.FRONTEND_URL || PRODUCTION_SITE).replace(/\/$/, '');
}

/**
 * Generate a deterministic HMAC token for an email address.
 */
function createUnsubscribeToken(email) {
    if (!email) return '';
    const cleanEmail = String(email).trim().toLowerCase();
    return crypto.createHmac('sha256', getSecret())
        .update(cleanEmail)
        .digest('hex');
}

/**
 * Verify whether the provided token matches the email.
 */
function verifyUnsubscribeToken(email, token) {
    if (!email || !token) return false;
    const expected = createUnsubscribeToken(email);
    try {
        const expectedBuf = Buffer.from(expected, 'hex');
        const tokenBuf = Buffer.from(String(token), 'hex');
        if (expectedBuf.length !== tokenBuf.length) return false;
        return crypto.timingSafeEqual(expectedBuf, tokenBuf);
    } catch {
        return false;
    }
}

/**
 * Get full frontend URL for unsubscribing.
 */
function getUnsubscribeUrl(email) {
    const token = createUnsubscribeToken(email);
    return `${siteUrl()}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

module.exports = {
    createUnsubscribeToken,
    verifyUnsubscribeToken,
    getUnsubscribeUrl
};

