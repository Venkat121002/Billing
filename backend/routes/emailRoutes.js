const express = require('express');
const router = express.Router();
const platformStore = require('../utils/platformStore');
const { verifyUnsubscribeToken } = require('../utils/unsubscribeToken');
const { EmailLog } = require('../models/mongodb');

/**
 * Check subscription status for a given email and token
 * GET /api/v2/email/status?email=...&token=...
 */
router.get('/status', async (req, res) => {
    try {
        const { email, token } = req.query;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const isValid = verifyUnsubscribeToken(email, token);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid or expired security token.' });
        }

        const owners = await platformStore.listOwners();
        const cleanEmail = String(email).trim().toLowerCase();
        const owner = owners.find((o) => String(o.email || '').trim().toLowerCase() === cleanEmail);

        if (!owner) {
            return res.status(404).json({ error: 'Registered user not found.' });
        }

        return res.json({
            email: owner.email,
            name: owner.firstName || owner.companyDetails?.name || 'Store Owner',
            dailyEmailSubscribed: owner.dailyEmailSubscribed !== false,
            unsubscribedAt: owner.unsubscribedAt || null
        });
    } catch (err) {
        console.error('[emailRoutes] Error getting status:', err.message);
        return res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

/**
 * Unsubscribe from daily automated emails
 * POST /api/v2/email/unsubscribe
 */
router.post('/unsubscribe', async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        const isValid = verifyUnsubscribeToken(email, token);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid or expired security token.' });
        }

        const owners = await platformStore.listOwners();
        const cleanEmail = String(email).trim().toLowerCase();
        const owner = owners.find((o) => String(o.email || '').trim().toLowerCase() === cleanEmail);

        if (!owner) {
            return res.status(404).json({ error: 'Registered user account not found.' });
        }

        const ownerId = owner.userId || owner._id?.toString();
        const now = new Date().toISOString();

        await platformStore.updateOwner(ownerId, {
            dailyEmailSubscribed: false,
            unsubscribedAt: now
        });

        if (EmailLog) {
            await EmailLog.create({
                tenantId: owner.tenantId || process.env.TENANT_ID || 'SwordNexBilling-4pzp8',
                ownerId,
                recipient: owner.email,
                subject: 'User Unsubscribed from Daily Emails',
                type: 'user_unsubscribed',
                status: 'sent',
                metadata: { email: owner.email, unsubscribedAt: now }
            }).catch(() => {});
        }

        return res.json({
            success: true,
            message: 'You have been successfully unsubscribed from daily automated emails. Your account and billing access remain fully active.'
        });
    } catch (err) {
        console.error('[emailRoutes] Error unsubscribing:', err.message);
        return res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

/**
 * Resubscribe to daily automated emails
 * POST /api/v2/email/resubscribe
 */
router.post('/resubscribe', async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        const isValid = verifyUnsubscribeToken(email, token);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid or expired security token.' });
        }

        const owners = await platformStore.listOwners();
        const cleanEmail = String(email).trim().toLowerCase();
        const owner = owners.find((o) => String(o.email || '').trim().toLowerCase() === cleanEmail);

        if (!owner) {
            return res.status(404).json({ error: 'Registered user account not found.' });
        }

        const ownerId = owner.userId || owner._id?.toString();

        await platformStore.updateOwner(ownerId, {
            dailyEmailSubscribed: true,
            unsubscribedAt: null
        });

        return res.json({
            success: true,
            message: 'You have been resubscribed to daily automated emails.'
        });
    } catch (err) {
        console.error('[emailRoutes] Error resubscribing:', err.message);
        return res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

module.exports = router;

