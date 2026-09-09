const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    name: { type: String, default: '' },
    company: { type: String, default: '' },
    code: { type: String, default: '' },
    gst: { type: String, default: '' },
    pan: { type: String, default: '' },
    mobile: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    paymentMode: { type: String, default: 'Cash' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

SupplierSchema.index({ tenantId: 1, ownerId: 1 });

module.exports = mongoose.model('Supplier', SupplierSchema);
