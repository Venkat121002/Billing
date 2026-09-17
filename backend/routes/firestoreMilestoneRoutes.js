
const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/firestoreMilestoneController');
const auth = require('../middleware/firestoreAuth');

// All routes require authentication
router.use(auth);

router.get('/', milestoneController.getMilestones);
router.get('/:id', milestoneController.getMilestoneById);
router.post("/", milestoneController.createMilestone);
router.put("/:id", milestoneController.updateMilestone);
router.delete("/:id", milestoneController.deleteMilestone);

module.exports = router;
