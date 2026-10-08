const express = require('express');
const router = express.Router();
const superAdminAuth = require('../middleware/superAdminAuth');
const controller = require('../controllers/superAdminController');
const planController = require('../controllers/planController');

// Public
router.post('/login', controller.login);

// Protected (super admin token required)
// Console (read-only data): overview, stores, dataset registry + rows
router.get('/overview', superAdminAuth, controller.getOverview);
router.get('/stores', superAdminAuth, controller.getStores);
router.get('/stores/:id', superAdminAuth, controller.getStore);
router.get('/datasets', superAdminAuth, controller.getDatasets);
router.get('/data/:dataset', superAdminAuth, controller.getData);

// Store account actions
router.patch('/tenants/:id/status', superAdminAuth, controller.updateTenantStatus);
router.patch('/tenants/:id/subscription', superAdminAuth, controller.updateTenantSubscription);
router.patch('/tenants/:id/bill-delivery', superAdminAuth, controller.updateTenantBillDelivery);
router.delete('/tenants/:id', superAdminAuth, controller.deleteTenant);
router.get('/support-requests', superAdminAuth, controller.getSupportRequests);
router.post('/support-requests/:id/switch-industry', superAdminAuth, controller.switchIndustryFromRequest);
router.patch('/support-requests/:id/status', superAdminAuth, controller.updateSupportRequestStatus);

// Subscription plans (Free / Standard / Premium) — prices, features & module gating
router.get('/plans', superAdminAuth, planController.getAdminPlans);
router.put('/plans/:key', superAdminAuth, planController.updatePlan);

// Platform settings — WhatsApp bill delivery default (PDF / text)
router.get('/settings', superAdminAuth, controller.getPlatformSettings);
router.put('/settings', superAdminAuth, controller.updatePlatformSettings);

// WhatsApp subscription reminders — runs daily as a scheduled function in production;
// this lets the super admin trigger a run manually (and is the only trigger locally).
router.post('/whatsapp/run-reminders', superAdminAuth, async (req, res) => {
    try {
        const { runSubscriptionReminders } = require('../utils/subscriptionReminders');
        res.json(await runSubscriptionReminders());
    } catch (err) {
        console.error('SuperAdmin run-reminders Error:', err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
});

module.exports = router;
