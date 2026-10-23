/**
 * Brute-force protection for sign-in style endpoints.
 *
 * Counts attempts per account (the email in the body), not per IP: behind
 * Firebase Hosting the client IP is either spoofable (X-Forwarded-For) or
 * shared, while a per-account limit stops password guessing on any account,
 * including the super admin. Counters are in memory per server instance, so
 * with N instances the worst case is N x max attempts per window.
 */
const buckets = new Map(); // key -> { count, resetAt }

setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (now > b.resetAt) buckets.delete(key);
}, 60_000).unref();

/**
 * @param {string} name     bucket name, e.g. 'login'
 * @param {number} max      attempts allowed per window
 * @param {number} windowMs window length
 */
function limitAttemptsPerAccount(name, { max = 10, windowMs = 15 * 60 * 1000 } = {}) {
    return (req, res, next) => {
        const account = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        if (!account) return next(); // the handler itself rejects a missing email

        const key = `${name}:${account}`;
        const now = Date.now();
        let bucket = buckets.get(key);
        if (!bucket || now > bucket.resetAt) {
            bucket = { count: 0, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }
        bucket.count += 1;

        if (bucket.count > max) {
            const minutes = Math.ceil((bucket.resetAt - now) / 60000);
            res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
            return res.status(429).json({ msg: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` });
        }
        next();
    };
}

module.exports = { limitAttemptsPerAccount };
