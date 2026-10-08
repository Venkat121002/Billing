const mongoose = require('mongoose');

const CreditSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    customerName: { type: String, default: '' },
    name: { type: String, default: '' },
    mobile: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    totalCredit: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    status: { type: String, default: 'Pending' },
    history: { type: Array, default: [] },
    appliedPaymentOrders: { type: [String], default: [] },
    notes: { type: String, default: '' },
    payToken: { type: String, index: true, sparse: true }, // public pay-link token (Cashfree)
    date: { type: String },
    remindersSent: { type: [String], default: [] },
    lastReminderSentAt: { type: String, default: null },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

CreditSchema.index({ tenantId: 1, ownerId: 1 });

module.exports = mongoose.model('Credit', CreditSchema);
