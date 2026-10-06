const mongoose = require('mongoose');

const SubUserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true }, // Sub-user's UID
    firebaseUid: { type: String, index: true },
    ownerId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, required: true, index: true },
    password: { type: String },
    role: { type: String, default: 'subuser' },
    branch: { type: String, default: '' },
    location: { type: String, default: '' },
    subbranchName: { type: String, default: '' },
    subbranchLocation: { type: String, default: '' },
    subbranchAddress: { type: String, default: '' },
    subbranchMobile: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    employee_id: { type: String, default: '' },
    status: { type: String, default: 'Active' },
    purchase_gst: { type: Number },
    purchase_tax_type: { type: String },
    sales_gst: { type: Number },
    sales_tax_type: { type: String },
    printer_configs: { type: Array },
    printer_auto_print: { type: Boolean },
    print_on_finalize: { type: Boolean },
    createdAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

module.exports = mongoose.model('SubUser', SubUserSchema);
