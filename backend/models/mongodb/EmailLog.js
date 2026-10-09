const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
    tenantId: { type: String, default: () => process.env.TENANT_ID || 'SwordNexBilling-4pzp8', index: true },
    ownerId: { type: String, index: true },
    recipient: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    type: { type: String, default: 'general', index: true }, // 'morning_stock', 'daily_closing_summary', 'dues_reminder', etc.
    status: { type: String, enum: ['sent', 'failed', 'skipped'], default: 'sent', index: true },
    error: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    sentAt: { type: String, default: () => new Date().toISOString() }
}, {
    timestamps: true
});

EmailLogSchema.index({ tenantId: 1, ownerId: 1 });
EmailLogSchema.index({ recipient: 1, type: 1 });

module.exports = mongoose.model('EmailLog', EmailLogSchema);
