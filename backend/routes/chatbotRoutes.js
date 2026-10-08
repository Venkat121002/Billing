const express = require('express');
const router = express.Router();
const auth = require('../middleware/firestoreAuth');
const chatbotController = require('../controllers/chatbotController');

// All chatbot routes require tenant authentication
router.use(auth);

// Ask query (grounded multi-tenant answer)
router.post('/query', chatbotController.queryChatbot);

// Knowledge base endpoints
router.post('/knowledge', chatbotController.ingestKnowledge);
router.get('/knowledge', chatbotController.listKnowledge);
router.delete('/knowledge/:id', chatbotController.deleteKnowledge);

// Stats
router.get('/stats', chatbotController.getChatbotStats);

module.exports = router;
