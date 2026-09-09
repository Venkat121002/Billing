const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    invoiceNo: { type: String, index: true },
    customerName: { type: String, default: '' },
    customerMobile: { type: String, default: '' },
    items: { type: Array, default: [] },
    subTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'Cash' },
    paymentStatus: { type: String, default: 'Paid' },
    receivedAmount: { type: Number, default: 0 },
    changeAmount: { type: Number, default: 0 },
    date: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

BillSchema.index({ tenantId: 1, ownerId: 1 });
BillSchema.index({ tenantId: 1, ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Bill', BillSchema);
