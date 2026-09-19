const express = require('express');
const router = express.Router();
const superAdminAuth = require('../middleware/superAdminAuth');
const controller = require('../controllers/superAdminController');

// Public
router.post('/login', controller.login);

// Protected (super admin token required)
router.get('/stats', superAdminAuth, controller.getStats);
router.get('/tenants', superAdminAuth, controller.getTenants);
router.get('/tenants/:id', superAdminAuth, controller.getTenantById);
router.get('/tenants/:id/data', superAdminAuth, controller.getTenantData);
router.patch('/tenants/:id/status', superAdminAuth, controller.updateTenantStatus);
router.patch('/tenants/:id/subscription', superAdminAuth, controller.updateTenantSubscription);
router.delete('/tenants/:id', superAdminAuth, controller.deleteTenant);
router.get('/subusers', superAdminAuth, controller.getAllSubUsers);
router.get('/support-requests', superAdminAuth, controller.getSupportRequests);
router.post('/support-requests/:id/switch-industry', superAdminAuth, controller.switchIndustryFromRequest);
router.patch('/support-requests/:id/status', superAdminAuth, controller.updateSupportRequestStatus);

module.exports = router;
