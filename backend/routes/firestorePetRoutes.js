const express = require('express');
const router = express.Router();
const petController = require('../controllers/firestorePetController');
const auth = require('../middleware/firestoreAuth');

// Public route for digital pet passport (No login required so owners can view QR scan)
router.get('/public-passport/:id', petController.getPublicPassport);

// Authenticated routes
router.use(auth);

// Reminders & analytics
router.get('/reminders/due', petController.getDueReminders);

// Automated WhatsApp Reminders
router.post('/:id/send-vaccine-reminder', petController.sendVaccineReminder);
router.post('/:id/send-deworming-reminder', petController.sendDewormingReminder);
router.post('/:id/send-refill-reminder', petController.sendFoodRefillReminder);

// Standard CRUD
router.get('/', petController.getPets);
router.get('/:id', petController.getPetById);
router.post('/', petController.createPet);
router.put('/:id', petController.updatePet);
router.delete('/:id', petController.deletePet);

module.exports = router;
