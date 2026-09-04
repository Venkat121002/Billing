
const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/firestoreTrainerController');
const auth = require('../middleware/firestoreAuth');

// All routes require authentication
router.use(auth);

router.get('/', trainerController.getTrainers);
router.get('/:id', trainerController.getTrainerById);
router.post("/", trainerController.createTrainer);
router.put("/:id", trainerController.updateTrainer);
router.delete("/:id", trainerController.deleteTrainer);

module.exports = router;

