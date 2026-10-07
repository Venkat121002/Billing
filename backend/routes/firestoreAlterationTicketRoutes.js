const express = require('express');
const router = express.Router();
const controller = require('../controllers/firestoreAlterationTicketController');
const auth = require('../middleware/firestoreAuth');

router.use(auth);

// CRUD routes
router.get('/', controller.getAlterationTickets);
router.post('/', controller.createAlterationTicket);
router.get('/:id', controller.getAlterationTicketById);
router.put('/:id', controller.updateAlterationTicket);
router.delete('/:id', controller.deleteAlterationTicket);

// 1-Click WhatsApp Trigger
router.post('/:id/notify', controller.notifyCustomer);

module.exports = router;
