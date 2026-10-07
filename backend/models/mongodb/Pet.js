const mongoose = require('mongoose');

const PetSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    subuserId: { type: String, default: null, index: true },
    createdBy: { type: String, required: true },
    customerId: { type: String, default: '', index: true },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    petName: { type: String, default: '' },
    species: { type: String, default: '' },
    breed: { type: String, default: '' },
    dob: { type: String, default: '' },
    gender: { type: String, default: 'Male' },
    microchipId: { type: String, default: '' },
    weightKg: { type: String, default: '' },
    // Vaccination & Deworming tracking
    vaccineName: { type: String, default: 'Rabies Booster' },
    lastVaccinationDate: { type: String, default: '' },
    nextVaccineDate: { type: String, default: '' },
    dewormingDate: { type: String, default: '' },
    nextDewormingDate: { type: String, default: '' },
    vaccineHistory: { type: Array, default: [] },
    // Food & Nutrition Refill Automation
    foodBrand: { type: String, default: '' },
    packSizeKg: { type: Number, default: 0 },
    dailyConsumptionGrams: { type: Number, default: 0 },
    lastFoodPurchaseDate: { type: String, default: '' },
    nextFoodRefillDate: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true,
    strict: false
});

PetSchema.index({ tenantId: 1, ownerId: 1 });

module.exports = mongoose.model('Pet', PetSchema);
