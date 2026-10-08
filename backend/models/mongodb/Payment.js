const mongoose = require('mongoose');

// One row per Cashfree order we create for a customer due (kind: 'credit').
// status: created -> paid | failed. `paid` is set exactly once (see paymentService).
const PaymentSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    kind: { type: String, default: 'credit' },
    creditId: { type: String, index: true },
    customerName: { type: String, default: '' },
    amount: { type: Number, required: true }, // rupees
    appliedAmount: { type: Number, default: 0 },
    unappliedAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String, index: true, sparse: true },
    status: { type: String, default: 'created' },
    method: { type: String, default: '' },
    payerEmail: { type: String, default: '' },
    payerContact: { type: String, default: '' },
    failureReason: { type: String, default: '' },
    receiptSentAt: { type: String, default: null },
    paidAt: { type: String, default: null },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

PaymentSchema.index({ tenantId: 1, ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
