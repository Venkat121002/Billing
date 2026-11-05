const mongoose = require('mongoose');

// Platform-wide settings the super admin controls. A single document keyed 'global'.
const PlatformSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: 'global' },
    // How POS bills are sent to customers on WhatsApp: 'pdf' | 'text'.
    // A store can be overridden individually via owner.billDeliveryMode.
    billDeliveryMode: { type: String, enum: ['pdf', 'text'], default: 'pdf' },
    // Global control for 9:00 PM automated daily emails
    dailyEmailsEnabled: { type: Boolean, default: true },
    dailyEmailsLastRunAt: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('PlatformSetting', PlatformSettingSchema);
