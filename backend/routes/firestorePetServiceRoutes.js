const express = require('express');
const router = express.Router();
const controller = require('../controllers/firestorePetServiceController');
const auth = require('../middleware/firestoreAuth');

router.use(auth);

router.get('/', controller.getPetServices);
router.get('/:id', controller.getPetServiceById);
router.post('/', controller.createPetService);
router.put('/:id', controller.updatePetService);
router.delete('/:id', controller.deletePetService);

// WhatsApp status trigger
router.post('/:id/send-status-whatsapp', controller.sendStatusWhatsApp);

module.exports = router;
