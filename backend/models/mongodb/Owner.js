const mongoose = require('mongoose');

const OwnerSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, required: true, index: true },
    mobile: { type: String, default: '' },
    password: { type: String }, // For local dev auth
    role: { type: String, default: 'owner' },
    companyDetails: {
        name: { type: String, default: '' },
        type: { type: String, default: '' },
        industry: { type: String, default: '' },
        subIndustry: { type: String, default: '' },
        employees: { type: String, default: '' },
        email: { type: String, default: '' },
        gstin: { type: String, default: '' },
        pan: { type: String, default: '' }
    },
    address: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' }
    },
    subscription: {
        plan: { type: String, default: 'Free' },
        status: { type: String, default: 'Active' },
        startDate: { type: String, default: null },
        endDate: { type: String, default: null },
        billingCycle: { type: String, default: 'monthly' },
        paymentId: { type: String, default: null },
        orderId: { type: String, default: null },
        amount: { type: Number, default: 0 },
        paymentMethod: { type: String, default: 'manual' }
    },
    additionalSubUsers: { type: Number, default: 0 },
    purchase_gst: { type: Number, default: 0 },
    purchase_tax_type: { type: String, default: 'exclusive' },
    sales_gst: { type: Number, default: 0 },
    sales_tax_type: { type: String, default: 'exclusive' },
    printer_configs: { type: Array, default: [] },
    printer_auto_print: { type: Boolean, default: false },
    invoiceSettings: {
        prefix: { type: String, default: 'INV-' },
        sequence: { type: Number, default: 1 }
    },
    invoice_prefix: { type: String, default: 'INV-' },
    next_invoice_number: { type: Number, default: 1 },
    lastLogin: { type: String, default: null },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false // Allow dynamic custom fields
});

module.exports = mongoose.model('Owner', OwnerSchema);
