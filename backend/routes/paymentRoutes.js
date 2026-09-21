const express = require('express');
const router = express.Router();
const pay = require('../controllers/paymentController');

// Tiny per-IP limiter for the unauthenticated endpoints (per server instance).
const hits = new Map();
const limiter = (max, windowMs) => (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const rec = hits.get(key);
    if (!rec || now > rec.reset) {
        hits.set(key, { count: 1, reset: now + windowMs });
        return next();
    }
    if (++rec.count > max) return res.status(429).json({ msg: 'Too many requests. Please try again shortly.' });
    next();
};
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (n > v.reset) hits.delete(k); }, 60_000).unref();

router.use(limiter(60, 60_000));
router.get('/:token', pay.getPayInfo);
router.post('/:token/order', pay.createPayOrder);
router.post('/:token/verify', pay.verifyPayOrder);

module.exports = router;
