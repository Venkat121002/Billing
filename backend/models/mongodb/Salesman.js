const mongoose = require('mongoose');

const SalesmanSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    salesmanId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    mobile: { type: String, default: '' },
    role: { type: String, default: 'Salesman' },
    status: { type: String, default: 'Active' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

SalesmanSchema.index({ tenantId: 1, ownerId: 1, salesmanId: 1 });

module.exports = mongoose.model('Salesman', SalesmanSchema);
