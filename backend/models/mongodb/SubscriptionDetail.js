const mongoose = require('mongoose');

const SubscriptionDetailSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    plan: { type: String, required: true },
    billingCycle: { type: String, default: 'monthly' },
    amount: { type: Number, default: 0 },
    paymentId: { type: String },
    orderId: { type: String },
    cashfreeOrderId: { type: String },
    signature: { type: String },
    paymentMethod: { type: String, default: 'cashfree' },
    startDate: { type: String },
    endDate: { type: String },
    createdBy: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

SubscriptionDetailSchema.index({ tenantId: 1, ownerId: 1 });
SubscriptionDetailSchema.index(
    { cashfreeOrderId: 1 },
    { unique: true, partialFilterExpression: { cashfreeOrderId: { $type: 'string' } } }
);

module.exports = mongoose.model('SubscriptionDetail', SubscriptionDetailSchema);
