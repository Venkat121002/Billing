const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    name: { type: String, default: '' },
    mobile: { type: String, default: '', index: true },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    gstin: { type: String, default: '' },
    products: { type: Array, default: [] },
    paymentamount: { type: Number },
    changeamount: { type: Number },
    totalamount: { type: Number },
    date: { type: String },
    lastTransaction: { type: Object },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

CustomerSchema.index({ tenantId: 1, ownerId: 1 });

module.exports = mongoose.model('Customer', CustomerSchema);
