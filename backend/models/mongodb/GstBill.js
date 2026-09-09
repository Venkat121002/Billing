const mongoose = require('mongoose');

const GstBillSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    invoiceNo: { type: String, index: true },
    billNumber: { type: String },
    customerName: { type: String, default: '' },
    customerMobile: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    customerGstin: { type: String, default: '' },
    items: { type: Array, default: [] },
    subTotal: { type: Number, default: 0 },
    taxDetails: { type: Object, default: {} },
    totalTax: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'Cash' },
    paymentStatus: { type: String, default: 'Paid' },
    notes: { type: String, default: '' },
    date: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

GstBillSchema.index({ tenantId: 1, ownerId: 1 });
GstBillSchema.index({ tenantId: 1, ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('GstBill', GstBillSchema);
