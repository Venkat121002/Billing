const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    clientId: { type: String, default: '', index: true },
    clientName: { type: String, default: '' },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    dueDate: { type: String, default: '' },
    status: { type: String, default: 'Not Started' }, // Not Started | In Progress | Completed | Blocked
    amount: { type: Number, default: 0 },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

MilestoneSchema.index({ tenantId: 1, ownerId: 1 });

module.exports = mongoose.model('Milestone', MilestoneSchema);
