const mongoose = require('mongoose');

const AlterationTicketSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
    ticketNo: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true, index: true },
    garmentName: { type: String, required: true },
    barcode: { type: String, default: '' },
    brand: { type: String, default: '' },
    color: { type: String, default: '' },
    size: { type: String, default: '' },
    alterationTypes: [{ type: String }], // e.g. ["Length Hemming", "Waist Tighten", "Sleeve Shortening", "Chest/Fitting"]
    notes: { type: String, default: '' },
    promisedDate: { type: String, default: '' },
    tailorName: { type: String, default: '' },
    charge: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['Received', 'In Alteration', 'Ready for Pickup', 'Delivered', 'Cancelled'],
        default: 'Received',
        index: true
    },
    billId: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

AlterationTicketSchema.index({ tenantId: 1, ownerId: 1, status: 1 });
AlterationTicketSchema.index({ tenantId: 1, ownerId: 1, customerPhone: 1 });

module.exports = mongoose.model('AlterationTicket', AlterationTicketSchema);
