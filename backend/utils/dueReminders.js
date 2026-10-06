/**
 * Automated Payment Reminders for Customer Dues
 * Feature 4 of Phase 1 Automation.
 */
const { Credit } = require('../models/mongodb');
const platformStore = require('./platformStore');
const wa = require('./whatsappService');
const { sendEmail } = require('./emailService');
const emailTemplates = require('./emailTemplates');
const { newPayToken, money } = require('./paymentService');
const store = require('./paymentStore');
const { storeFilter } = require('./dbUtils');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Scan all unpaid credits and send WhatsApp & Email payment reminders
 * at 3 days, 7 days, and 15 days overdue.
 * `ownerId` limits the run to that one store (the owner's manual trigger);
 * without it every store's dues are processed (the scheduled job).
 */
async function runDuePaymentReminders(now = new Date(), { ownerId } = {}) {
    const summary = { checked: 0, remindersSent: 0, skipped: 0, errors: 0 };

    try {
        const credits = await Credit.find({
            ...(ownerId ? storeFilter(ownerId) : {}),
            balance: { $gt: 0 },
            status: { $nin: ['Paid', 'Settled', 'Cancelled'] }
        });

        for (const credit of credits) {
            summary.checked += 1;

            const creditDate = new Date(credit.date || credit.createdAt || Date.now());
            if (Number.isNaN(creditDate.getTime())) {
                summary.skipped += 1;
                continue;
            }

            const daysElapsed = Math.floor((now - creditDate) / DAY_MS);
            let intervalKey = null;
            let markProcessed = [];

            if (daysElapsed >= 15) {
                if (!credit.remindersSent?.includes('15d')) {
                    intervalKey = '15d';
                    markProcessed = ['3d', '7d', '15d'];
                }
            } else if (daysElapsed >= 7) {
                if (!credit.remindersSent?.includes('7d')) {
                    intervalKey = '7d';
                    markProcessed = ['3d', '7d'];
                }
            } else if (daysElapsed >= 3) {
                if (!credit.remindersSent?.includes('3d')) {
                    intervalKey = '3d';
                    markProcessed = ['3d'];
                }
            }

            if (!intervalKey) {
                summary.skipped += 1;
                continue;
            }

            // Customer details
            const customerMobile = credit.mobile || credit.phone;
            const customerName = credit.name || credit.customerName || 'Customer';
            const owner = await platformStore.getOwner(credit.ownerId);
            const businessName = owner?.companyDetails?.name || owner?.businessName || 'SwordNex Billing';

            // Pay link generation
            let payLink = '';
            if (process.env.RAZORPAY_KEY_ID) {
                if (!credit.payToken) {
                    credit.payToken = newPayToken();
                    await store.setPayToken(credit, credit.payToken);
                }
                const frontendBase = (process.env.FRONTEND_URL || 'https://swordnex-billing-app.web.app').replace(/\/$/, '');
                payLink = `${frontendBase}/pay/${credit.payToken}`;
            }

            let sentSuccess = false;

            // Send WhatsApp reminder
            if (customerMobile && wa.normalizePhone(customerMobile)) {
                try {
                    await wa.sendTemplate({
                        to: customerMobile,
                        type: 'PAYMENT_REMINDER',
                        data: {
                            customer_name: customerName,
                            business_name: businessName,
                            amount: money(credit.balance),
                            days_overdue: String(daysElapsed),
                            pay_link: payLink
                        }
                    });
                    sentSuccess = true;
                } catch (waErr) {
                    console.error(`[dueReminders] WhatsApp failed for ${customerMobile}:`, waErr.message);
                }
            }

            // If customer has an email, send email reminder too
            if (credit.email && /^\S+@\S+\.\S+$/.test(credit.email)) {
                try {
                    await sendEmail({
                        to: credit.email,
                        ...emailTemplates.payLink({
                            business: businessName,
                            customerName,
                            amount: money(credit.balance),
                            url: payLink || `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/credit`
                        })
                    });
                    sentSuccess = true;
                } catch (emailErr) {
                    console.error(`[dueReminders] Email failed for ${credit.email}:`, emailErr.message);
                }
            }

            if (sentSuccess || !wa.isConfigured()) {
                const currentSent = Array.isArray(credit.remindersSent) ? credit.remindersSent : [];
                credit.remindersSent = [...new Set([...currentSent, ...markProcessed])];
                credit.lastReminderSentAt = now.toISOString();
                await credit.save();
                summary.remindersSent += 1;
            } else {
                summary.errors += 1;
            }
        }
    } catch (err) {
        console.error('[dueReminders] Execution error:', err);
    }

    return summary;
}

module.exports = {
    runDuePaymentReminders
};
