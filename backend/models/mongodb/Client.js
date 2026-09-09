const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    name: { type: String, default: '' },
    companyName: { type: String, default: '' },
    contactPerson: { type: String, default: '' },
    email: { type: String, default: '' },
    mobile: { type: String, default: '' },
    phone: { type: String, default: '' },
    companyWebsite: { type: String, default: '' },
    industry: { type: String, default: '' },
    address: { type: String, default: '' },
    projectName: { type: String, default: '' },
    projectType: { type: String, default: '' },
    communication: { type: String, default: '' },
    budget: { type: String, default: '' },
    deadline: { type: String, default: null },
    existingWebsite: { type: String, default: '' },
    domainStatus: { type: Boolean, default: false },
    hostingStatus: { type: Boolean, default: false },
    requirements: { type: String, default: '' },
    referenceWebsites: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

ClientSchema.index({ tenantId: 1, ownerId: 1 });

module.exports = mongoose.model('Client', ClientSchema);
