const mongoose = require('mongoose');

const SupportRequestSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    requestedBy: { type: String, required: true },
    requesterName: { type: String, default: '' },
    requesterEmail: { type: String, default: '' },
    requesterRole: { type: String, default: 'owner' },
    businessName: { type: String, default: '' },
    type: { type: String, default: 'general' }, // 'general' | 'industry_change'
    message: { type: String, default: '' },
    currentIndustry: { type: String, default: '' },
    requestedIndustry: { type: String, default: '' },
    status: { type: String, default: 'Pending', index: true }, // Pending | Resolved | Dismissed
    resolution: { type: String, default: '' },
    resolvedBy: { type: String, default: '' },
    resolvedAt: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

SupportRequestSchema.index({ ownerId: 1, type: 1, status: 1 });

module.exports = mongoose.model('SupportRequest', SupportRequestSchema);
