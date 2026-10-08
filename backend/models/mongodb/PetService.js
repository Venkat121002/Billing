const mongoose = require('mongoose');

const PetServiceSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    petId: { type: String, default: '', index: true },
    petName: { type: String, default: '' },
    species: { type: String, default: 'Dog' },
    breed: { type: String, default: '' },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    serviceType: { type: String, default: 'Full Grooming & Spa' }, // 'Full Grooming & Spa' | 'Bath & Blow Dry' | 'Haircut & Styling' | 'Nail Trimming' | 'Medicated Tick Bath' | 'Vet Consultation' | 'Vaccination'
    status: { type: String, default: 'Checked-In' }, // 'Booked' | 'Checked-In' | 'In-Progress' | 'Ready-For-Pickup' | 'Completed' | 'Cancelled'
    cost: { type: Number, default: 0 },
    groomer: { type: String, default: '' },
    specialInstructions: { type: String, default: '' },
    scheduledDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    readyAt: { type: String, default: '' },
    completedAt: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

PetServiceSchema.index({ tenantId: 1, ownerId: 1 });

module.exports = mongoose.model('PetService', PetServiceSchema);
