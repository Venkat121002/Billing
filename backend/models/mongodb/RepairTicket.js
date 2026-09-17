const mongoose = require('mongoose');

const RepairTicketSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    ticketType: { type: String, default: 'repair' }, // 'repair' | 'warranty'
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    deviceBrand: { type: String, default: '' },
    deviceModel: { type: String, default: '' },
    imei: { type: String, default: '', index: true },
    issueDescription: { type: String, default: '' },
    status: { type: String, default: 'Received' }, // Received | In Progress | Completed | Delivered | Cancelled
    estimatedCost: { type: Number, default: 0 },
    finalCost: { type: Number, default: 0 },
    receivedDate: { type: String, default: () => new Date().toISOString() },
    promisedDate: { type: String, default: '' },
    technician: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

RepairTicketSchema.index({ tenantId: 1, ownerId: 1 });

module.exports = mongoose.model('RepairTicket', RepairTicketSchema);
