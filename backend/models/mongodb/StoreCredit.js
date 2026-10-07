const mongoose = require('mongoose');

const StoreCreditSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
    code: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    remainingAmount: { type: Number, required: true },
    reason: { type: String, default: 'Size Exchange Price Difference' },
    originalBillId: { type: String, default: '' },
    status: {
        type: String,
        enum: ['active', 'partially_used', 'fully_redeemed', 'expired'],
        default: 'active',
        index: true
    },
    expiryDate: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

StoreCreditSchema.index({ tenantId: 1, ownerId: 1, customerPhone: 1 });
StoreCreditSchema.index({ tenantId: 1, ownerId: 1, code: 1 });

module.exports = mongoose.model('StoreCredit', StoreCreditSchema);
