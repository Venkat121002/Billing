
const express = require('express');
const router = express.Router();
const repairTicketController = require('../controllers/firestoreRepairTicketController');
const auth = require('../middleware/firestoreAuth');

// All routes require authentication
router.use(auth);

router.get('/', repairTicketController.getRepairTickets);
router.get('/:id', repairTicketController.getRepairTicketById);
router.post("/", repairTicketController.createRepairTicket);
router.put("/:id", repairTicketController.updateRepairTicket);
router.delete("/:id", repairTicketController.deleteRepairTicket);

module.exports = router;
