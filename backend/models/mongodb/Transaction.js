const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    type: { type: String, required: true }, // 'cash_in' | 'cash_out' | 'Income' | 'Expense'
    amount: { type: Number, required: true },
    category: { type: String, default: 'General' },
    reason: { type: String, default: '' },
    description: { type: String, default: '' },
    paymentMode: { type: String, default: 'Cash' },
    date: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

TransactionSchema.index({ tenantId: 1, ownerId: 1 });
TransactionSchema.index({ tenantId: 1, ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
