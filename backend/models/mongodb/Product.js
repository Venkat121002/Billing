const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: '1' },
    category: { type: String, default: '' },
    barcode: { type: String, index: true },
    imei1: { type: String, index: true },
    imei2: { type: String },
    gst: { type: Number, default: 0 },
    hsn: { type: String, default: '' },
    description: { type: String, default: '' },
    discount: { type: Number, default: 0 },
    brand: { type: String, default: '' },
    size: { type: String, default: '' },
    color: { type: String, default: '' },
    expiryDate: { type: String },
    batchNo: { type: String },
    minStockThreshold: { type: Number, default: 5 },
    reorderLevel: { type: Number, default: 5 },
    lowStockAlertSent: { type: Boolean, default: false },
    industry: { type: String, default: '', index: true },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

// Compound indexes for fast tenant-scoped queries
ProductSchema.index({ tenantId: 1, ownerId: 1 });
ProductSchema.index({ tenantId: 1, ownerId: 1, industry: 1 });
ProductSchema.index({ tenantId: 1, ownerId: 1, imei1: 1 });
ProductSchema.index({ tenantId: 1, ownerId: 1, barcode: 1 });

module.exports = mongoose.model('Product', ProductSchema);
