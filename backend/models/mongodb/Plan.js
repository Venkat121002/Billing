const mongoose = require('mongoose');

// One row per capability from utils/planCapabilities.js. Only `limit` or
// `enabled` is meaningful, depending on that capability's `type` — the other
// field is just left at its default.
const CapabilitySchema = new mongoose.Schema({
    key: { type: String, required: true },
    limit: { type: Number, default: null, min: 0 }, // 'limit' type; null/absent = unlimited
    enabled: { type: Boolean, default: false },       // 'toggle' type
}, { _id: false });

// The three subscription tiers (Free = the auto-started trial, Standard, Premium).
// Superadmin-editable via /superadmin/plans; the public pricing page, the
// Razorpay order amount, and the plan-enforcement middleware all read straight
// from this collection — there is no second copy of prices/limits anywhere else.
const PlanSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, enum: ['trial', 'standard', 'premium'] },
    order: { type: Number, required: true }, // fixed display order: trial=0, standard=1, premium=2
    name: { type: String, required: true, trim: true, maxlength: 40 },
    tagline: { type: String, default: '', trim: true, maxlength: 120 },
    badge: { type: String, default: '', trim: true, maxlength: 24 }, // e.g. "Best Value"; blank = none

    // Rupees. Always 0 for the trial ("Free"); billing reads these two fields
    // directly when creating a Razorpay order.
    monthly: { type: Number, default: 0, min: 0 },
    yearly: { type: Number, default: 0, min: 0 },

    // One entry per key in the fixed capability catalog (see planCapabilities.js).
    capabilities: { type: [CapabilitySchema], default: [] },

    updatedBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Plan', PlanSchema);
