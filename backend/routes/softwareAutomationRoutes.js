const express = require('express');
const router = express.Router();
const auth = require('../middleware/firestoreAuth');
const softwareController = require('../controllers/softwareAutomationController');

// All software development automation routes require tenant auth
router.use(auth);

// Phase 1: AI Project Scope & Proposal Generator
router.post('/generate-proposal', softwareController.generateProposal);

// Phase 2: Convert Proposal to Client & Milestones
router.post('/convert-proposal', softwareController.convertProposalToProject);

// Phase 3: Automated Milestone Invoicing
router.post('/auto-invoice-milestone', softwareController.autoInvoiceMilestone);

// Phase 4: Client Progress Update & Release Notes Draft
router.post('/draft-client-update', softwareController.generateClientUpdate);

module.exports = router;
