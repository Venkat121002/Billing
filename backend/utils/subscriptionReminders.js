/**
 * Daily WhatsApp subscription reminders for business owners.
 *
 *   1-3 days before subscription.endDate -> BILL_REMAINDER (once per endDate)
 *   0-7 days after  subscription.endDate -> BILL_EXPIRED   (once per endDate)
 *
 * "Once" is tracked on the owner record (waReminderSentFor / waExpirySentFor hold
 * the endDate they were sent for), so a renewal (new endDate) re-arms both.
 *
 * Runs from the `billingReminders` scheduled Cloud Function (index.js) in production,
 * or manually via POST /api/v2/superadmin/whatsapp/run-reminders.
 */
const platformStore = require('./platformStore');
const wa = require('./whatsappService');

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRED_NOTICE_WINDOW_DAYS = 7;

const formatDate = (d) =>
    d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }); // dd/mm/yyyy

exports.runSubscriptionReminders = async (now = new Date()) => {
    const summary = { checked: 0, reminders: 0, expired: 0, failed: 0, skippedNoMobile: 0 };
    // In dev mode (no credentials) messages are only logged; don't mark them as sent.
    const persist = wa.isConfigured();

    const owners = await platformStore.listOwners();

    for (const owner of owners) {
        const sub = owner.subscription || {};
        if (!sub.endDate || sub.plan === 'Free' || sub.status === 'Suspended') continue;

        const end = new Date(sub.endDate);
        if (Number.isNaN(end.getTime())) continue;
        summary.checked += 1;

        const daysLeft = Math.ceil((end - now) / DAY_MS);
        const isReminder = daysLeft >= 1 && daysLeft <= 3 && owner.waReminderSentFor !== sub.endDate;
        const isExpired = daysLeft <= 0 && now - end <= EXPIRED_NOTICE_WINDOW_DAYS * DAY_MS
            && owner.waExpirySentFor !== sub.endDate;
        if (!isReminder && !isExpired) continue;

        if (!wa.normalizePhone(owner.mobile)) {
            summary.skippedNoMobile += 1;
            continue;
        }

        const data = {
            customer_name: owner.companyDetails?.name || owner.firstName || 'Customer',
            plan_name: sub.plan || 'Standard',
            expiry_date: formatDate(end),
            days_left: String(daysLeft)
        };
        const type = isReminder ? 'BILL_REMAINDER' : 'BILL_EXPIRED';
        const sent = await wa.trySendTemplate({ to: owner.mobile, type, data });

        if (!sent) {
            summary.failed += 1;
            continue;
        }
        summary[isReminder ? 'reminders' : 'expired'] += 1;

        if (persist) {
            const ownerId = owner.userId || owner._id;
            const field = isReminder ? 'waReminderSentFor' : 'waExpirySentFor';
            try {
                await platformStore.updateOwner(ownerId, { [field]: sub.endDate });
            } catch (err) {
                console.error(`[reminders] could not mark ${field} for ${ownerId}:`, err.message);
            }
        }
    }

    console.log('[reminders] subscription WhatsApp run:', JSON.stringify(summary));
    return summary;
};
