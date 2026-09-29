
const express = require('express');
const router = express.Router();
const petController = require('../controllers/firestorePetController');
const auth = require('../middleware/firestoreAuth');

// All routes require authentication
router.use(auth);

router.get('/', petController.getPets);
router.get('/:id', petController.getPetById);
router.post("/", petController.createPet);
router.put("/:id", petController.updatePet);
router.delete("/:id", petController.deletePet);

module.exports = router;
