const mongoose = require('mongoose');

const InventoryReturnSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String },
    type: { type: String, required: true }, // 'purchase' | 'sales'
    vendorId: { type: String, default: null },
    customerId: { type: String, default: null },
    customerName: { type: String, default: '' },
    purchaseInvoiceNo: { type: String, default: '' },
    salesInvoiceNo: { type: String, default: '' },
    returnDate: { type: String },
    reason: { type: String, default: '' },
    items: { type: Array, default: [] },
    totals: { type: Object, default: {} },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

InventoryReturnSchema.index({ tenantId: 1, ownerId: 1 });

module.exports = mongoose.model('InventoryReturn', InventoryReturnSchema);
