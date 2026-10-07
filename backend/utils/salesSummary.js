/**
 * Daily Sales Summary Generator & Dispatcher
 * Feature 5 of Phase 1 Automation.
 */
const { Bill, Credit, Product } = require('../models/mongodb');
const platformStore = require('./platformStore');
const wa = require('./whatsappService');
const { sendEmail } = require('./emailService');
const emailTemplates = require('./emailTemplates');
const { money } = require('./paymentService');
const { generateDailyReportPDF } = require('./reportPdfGenerator');

/**
 * Returns Start & End of day in IST (Asia/Kolkata)
 */
function getDayBoundsIST(date = new Date()) {
    const d = new Date(date);
    // Format to yyyy-mm-dd in Asia/Kolkata
    const istString = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    const start = new Date(`${istString}T00:00:00.000+05:30`);
    const end = new Date(`${istString}T23:59:59.999+05:30`);
    return { start: start.toISOString(), end: end.toISOString(), displayDate: istString };
}

/**
 * Generates and sends daily sales summary for a specific store owner.
 */
async function generateDailySalesSummary({ ownerId, date = new Date() }) {
    try {
        const owner = await platformStore.getOwner(ownerId);
        if (!owner) return { skipped: true, reason: 'Owner not found' };

        const { start, end, displayDate } = getDayBoundsIST(date);
        const storeName = owner.companyDetails?.name || owner.businessName || 'Your Store';
        const ownerName = owner.firstName || owner.name || 'Store Owner';
        const ownerMobile = owner.mobile || owner.phone;
        const ownerEmail = owner.email;

        // Fetch all bills generated today strictly for this owner
        const bills = await Bill.find({
            ownerId,
            createdAt: { $gte: start, $lte: end }
        }).lean();

        let totalRevenue = 0;
        let cashTotal = 0;
        let digitalTotal = 0;
        let cardTotal = 0;
        const productStats = {};

        bills.forEach((bill) => {
            const billTotal = Number(bill.totals?.grandTotal ?? bill.grandTotal ?? bill.total ?? 0);
            totalRevenue += billTotal;

            const method = String(bill.paymentMethod || 'cash').toLowerCase();
            if (method.includes('cash')) {
                cashTotal += billTotal;
            } else if (method.includes('card')) {
                cardTotal += billTotal;
            } else {
                digitalTotal += billTotal;
            }

            // Summarize products
            (bill.items || []).forEach((item) => {
                const name = item.name || 'Item';
                const qty = Number(item.qty || 1);
                const price = Number(item.price || 0);
                if (!productStats[name]) {
                    productStats[name] = { name, qty: 0, revenue: 0 };
                }
                productStats[name].qty += qty;
                productStats[name].revenue += (price * qty);
            });
        });

        // Top 5 products
        const topProducts = Object.values(productStats)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        // Fetch dues created today strictly for this owner
        const todayCredits = await Credit.find({
            ownerId,
            createdAt: { $gte: start, $lte: end }
        }).lean();

        const duesIncurred = todayCredits.reduce((sum, c) => sum + Number(c.balance || c.amount || 0), 0);

        // Fetch low-stock products strictly for this owner
        const products = await Product.find({
            ownerId
        }).lean();

        const lowStockItems = (products || []).filter((p) => {
            const threshold = Number(p.minStockThreshold !== undefined ? p.minStockThreshold : (p.reorderLevel || 5));
            const qty = Number(p.quantity || 0);
            return threshold > 0 && qty <= threshold;
        }).map((p) => ({
            name: p.name || 'Product',
            quantity: Number(p.quantity || 0),
            unit: p.unit || '',
            minStockThreshold: Number(p.minStockThreshold !== undefined ? p.minStockThreshold : (p.reorderLevel || 5))
        }));

        const frontendBase = (process.env.FRONTEND_URL || 'https://swordnex-billing-app.web.app').replace(/\/$/, '');

        const summaryData = {
            storeName,
            ownerName,
            date: displayDate,
            websiteUrl: frontendBase,
            totalSales: money(totalRevenue),
            totalBills: bills.length,
            paymentBreakdown: {
                cash: money(cashTotal),
                digital: money(digitalTotal),
                card: money(cardTotal)
            },
            topProducts,
            duesIncurred: money(duesIncurred),
            lowStockItems
        };

        const result = { ownerId, storeName, totalBills: bills.length, totalRevenue, whatsappSent: false, emailSent: false, pdfGenerated: false };

        // Generate PDF report
        let pdfAttachment = null;
        try {
            const pdfBuffer = await generateDailyReportPDF(summaryData);
            if (pdfBuffer && pdfBuffer.length > 0) {
                pdfAttachment = {
                    name: `Daily_Store_Report_${displayDate}.pdf`,
                    content: pdfBuffer.toString('base64')
                };
                result.pdfGenerated = true;
            }
        } catch (pdfErr) {
            console.error('[salesSummary] PDF generation error:', pdfErr.message);
        }

        // 1. Send WhatsApp Summary to Owner
        if (ownerMobile && wa.normalizePhone(ownerMobile)) {
            const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
            const topProductsText = topProducts.length
                ? topProducts.map((p, idx) => `  ${numberEmojis[idx] || '🔹'} *${p.name}* — ${p.qty} sold (${money(p.revenue)})`).join('\n')
                : '  • No items recorded today';

            await wa.sendTemplate({
                to: ownerMobile,
                type: 'DAILY_SALES_SUMMARY',
                data: {
                    owner_name: ownerName,
                    store_name: storeName,
                    date: displayDate,
                    total_sales: summaryData.totalSales,
                    total_bills: String(bills.length),
                    cash_sales: summaryData.paymentBreakdown.cash,
                    digital_sales: summaryData.paymentBreakdown.digital,
                    dues_incurred: summaryData.duesIncurred,
                    top_products: topProductsText
                }
            }).then(() => { result.whatsappSent = true; })
              .catch((err) => console.error(`[salesSummary] WhatsApp failed for ${ownerMobile}:`, err.message));
        }

        // 2. Send Email Summary to Owner (with attached PDF)
        if (ownerEmail && /^\S+@\S+\.\S+$/.test(ownerEmail)) {
            const emailTemplate = emailTemplates.dailySalesSummary(summaryData);
            await sendEmail({
                to: ownerEmail,
                ...emailTemplate,
                attachment: pdfAttachment ? [pdfAttachment] : []
            }).then(() => { result.emailSent = true; })
              .catch((err) => console.error(`[salesSummary] Email failed for ${ownerEmail}:`, err.message));
        }

        return result;
    } catch (err) {
        console.error(`[salesSummary] Error generating summary for owner ${ownerId}:`, err);
        return { error: err.message };
    }
}

/**
 * Runs daily sales summary for all active owners in the system.
 */
async function runAllOwnersDailySalesSummary(date = new Date()) {
    const summary = { processed: 0, whatsappSent: 0, emailsSent: 0, errors: 0 };
    try {
        const owners = await platformStore.listOwners();
        for (const owner of owners) {
            const ownerId = owner.id || owner.uid || owner._id?.toString();
            const res = await generateDailySalesSummary({ ownerId, date });
            summary.processed += 1;
            if (res.whatsappSent) summary.whatsappSent += 1;
            if (res.emailSent) summary.emailsSent += 1;
            if (res.error) summary.errors += 1;
        }
    } catch (err) {
        console.error('[salesSummary] Error in runAllOwnersDailySalesSummary:', err);
    }
    return summary;
}

module.exports = {
    generateDailySalesSummary,
    runAllOwnersDailySalesSummary
};
