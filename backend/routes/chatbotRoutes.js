const express = require('express');
const router = express.Router();
const auth = require('../middleware/firestoreAuth');
const chatbotController = require('../controllers/chatbotController');
const { requireCapability } = require('../utils/planEnforcement');
const roleAuth = require('../middleware/roleAuth');

// All chatbot routes require tenant authentication
router.use(auth);

// Enforce plan capability for AI Assistant / Chatbot
router.use(requireCapability('aiAssistant'));

// Ask query (grounded multi-tenant answer)
router.post('/query', chatbotController.queryChatbot);

// Knowledge base endpoints (adding/removing the store's knowledge is owner-only)
router.post('/knowledge', roleAuth(['owner', 'TenantAdmin']), chatbotController.ingestKnowledge);
router.get('/knowledge', chatbotController.listKnowledge);
router.delete('/knowledge/:id', roleAuth(['owner', 'TenantAdmin']), chatbotController.deleteKnowledge);

// Stats
router.get('/stats', chatbotController.getChatbotStats);

module.exports = router;
