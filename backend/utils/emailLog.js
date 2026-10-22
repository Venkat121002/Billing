/**
 * Record an outgoing email (scheduled stock/closing mails etc.) in either
 * database. MongoDB: the EmailLog collection. Firestore:
 * SwordNexBillingSoftware/{TENANT_ID}/emailLogs. Never throws: a failed log
 * must not affect the email itself.
 */
const { db } = require('../config/firebase');
const { EmailLog } = require('../models/mongodb');

const isMongo = () => (process.env.DB_TYPE || 'mongodb') === 'mongodb';

async function recordEmail({ ownerId, recipient, subject, type = 'general', status = 'sent', error = null, metadata = {} }) {
    const entry = {
        tenantId: process.env.TENANT_ID,
        ownerId: ownerId || null,
        recipient,
        subject,
        type,
        status,
        error: error ? String(error).slice(0, 500) : null,
        metadata,
        sentAt: new Date().toISOString()
    };
    try {
        if (isMongo()) {
            await EmailLog.create(entry);
        } else {
            await db.collection('SwordNexBillingSoftware').doc(process.env.TENANT_ID).collection('emailLogs').add(entry);
        }
    } catch (err) {
        console.error('[emailLog] could not record email:', err.message);
    }
}

module.exports = { recordEmail };
