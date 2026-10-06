/**
 * Automated Cron Scheduler for Phase 1 Tasks
 * Runs automatically when backend starts standalone, or via Cloud Function schedulers.
 */
const cron = require('node-cron');
const { runDailyLowStockSummary } = require('./inventoryAlerts');
const { runDuePaymentReminders } = require('./dueReminders');
const { runAllOwnersDailySalesSummary } = require('./salesSummary');

let schedulerInitialized = false;

function initScheduler() {
    if (schedulerInitialized) return;
    schedulerInitialized = true;

    console.log('⏰ [Scheduler] Initializing automated daily cron jobs (Asia/Kolkata)...');

    // Night 9:00 PM (21:00) IST: Overall Daily Closing Report (Sales, Collections, Top Items, Low Stock & PDF)

    // 2. Automated Due Payment Reminders: 11:00 AM IST
    cron.schedule('0 11 * * *', async () => {
        console.log('⏰ [Scheduler] Running 11:00 AM Dues Payment Reminders job...');
        try {
            const res = await runDuePaymentReminders();
            console.log('✅ [Scheduler] Dues reminders job finished:', res);
        } catch (err) {
            console.error('❌ [Scheduler] Dues reminders job error:', err.message);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    // 3. Daily Sales & Closing Summary: 09:00 PM (21:00) IST
    cron.schedule('0 21 * * *', async () => {
        console.log('⏰ [Scheduler] Running 09:00 PM Daily Sales Summary job...');
        try {
            const res = await runAllOwnersDailySalesSummary();
            console.log('✅ [Scheduler] Daily sales summary finished:', res);
        } catch (err) {
            console.error('❌ [Scheduler] Daily sales summary error:', err.message);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('✅ [Scheduler] Automated jobs active: 11:00 AM Dues Reminders, 09:00 PM Overall Daily Report (Sales + Low Stock + PDF).');
}

module.exports = {
    initScheduler,
    runDailyLowStockSummary,
    runDuePaymentReminders,
    runAllOwnersDailySalesSummary
};
