/**
 * Customer Insights & RFM Segmentation Engine
 * Feature 8 of Phase 2 Automation.
 *
 * Automatically segments customers based on Recency, Frequency, and Monetary (RFM) analytics,
 * providing actionable retention alerts and targeted WhatsApp campaign templates.
 */
const { Customer, Bill, GstBill } = require('../models/mongodb');
const platformStore = require('./platformStore');

/**
 * Perform RFM Customer Segmentation
 */
async function analyzeCustomerSegments({ ownerId, tenantId }) {
    try {
        const query = {};
        if (ownerId && tenantId) {
            query.$or = [{ ownerId }, { tenantId }];
        } else if (ownerId) {
            query.ownerId = ownerId;
        } else if (tenantId) {
            query.tenantId = tenantId;
        }

        // 1. Fetch store owner details for branding in promo messages
        const owner = ownerId ? await platformStore.getOwner(ownerId) : null;
        const storeName = owner?.companyDetails?.name || owner?.businessName || 'Our Store';

        // 2. Fetch all customers
        const customers = await Customer.find(query).lean();

        // 3. Fetch all bills and GST bills to compute actual purchase behavior
        const [standardBills, gstBills] = await Promise.all([
            Bill.find(query).lean(),
            GstBill.find(query).lean()
        ]);

        const allBills = [...standardBills, ...gstBills];

        // 4. Map transactions by customer mobile or id
        const customerStats = {}; // key: mobile or id

        // Initialize from customer directory
        for (const cust of customers) {
            const key = cust.mobile || cust.phone || String(cust._id || cust.id);
            if (!key) continue;
            customerStats[key] = {
                customerId: String(cust._id || cust.id),
                name: cust.name || 'Valued Customer',
                mobile: cust.mobile || cust.phone || '',
                email: cust.email || '',
                address: cust.address || cust.location || '',
                gstin: cust.gstin || '',
                totalSpend: 0,
                billCount: 0,
                firstPurchaseDate: null,
                lastPurchaseDate: null,
                purchasedItemsCount: 0,
                itemsSummary: {}
            };
        }

        // Process bills
        for (const bill of allBills) {
            const mobile = bill.customerMobile || bill.mobile || bill.customerPhone || '';
            const custId = bill.customerId || '';
            const key = mobile || custId;
            if (!key) continue;

            if (!customerStats[key]) {
                customerStats[key] = {
                    customerId: custId || key,
                    name: bill.customerName || 'Customer',
                    mobile: mobile,
                    email: bill.customerEmail || '',
                    address: bill.customerAddress || '',
                    gstin: bill.customerGstin || '',
                    totalSpend: 0,
                    billCount: 0,
                    firstPurchaseDate: null,
                    lastPurchaseDate: null,
                    purchasedItemsCount: 0,
                    itemsSummary: {}
                };
            }

            const billTotal = Number(bill.totals?.grandTotal ?? bill.grandTotal ?? bill.total ?? 0);
            const billDateStr = bill.date || bill.createdAt;
            const billDate = billDateStr ? new Date(billDateStr) : new Date();

            const c = customerStats[key];
            c.totalSpend += billTotal;
            c.billCount += 1;

            if (!c.firstPurchaseDate || billDate < c.firstPurchaseDate) {
                c.firstPurchaseDate = billDate;
            }
            if (!c.lastPurchaseDate || billDate > c.lastPurchaseDate) {
                c.lastPurchaseDate = billDate;
            }

            if (Array.isArray(bill.items)) {
                c.purchasedItemsCount += bill.items.length;
                bill.items.forEach(it => {
                    const itemName = it.productName || it.name;
                    if (itemName) {
                        c.itemsSummary[itemName] = (c.itemsSummary[itemName] || 0) + (Number(it.qty || it.quantity || 1));
                    }
                });
            }
        }

        const now = new Date();
        const customerList = Object.values(customerStats);

        // Sort all customers by spend to calculate percentile cutoffs
        customerList.sort((a, b) => b.totalSpend - a.totalSpend);
        const vipSpendThreshold = customerList.length > 5
            ? Math.max(8000, customerList[Math.floor(customerList.length * 0.15)]?.totalSpend || 8000)
            : 5000;

        // 5. Segment classification
        const segments = {
            vip: [],
            regular: [],
            at_risk: [],
            new: [],
            dormant: []
        };

        let totalSegmentRevenue = 0;

        for (const cust of customerList) {
            const daysSinceLastPurchase = cust.lastPurchaseDate
                ? Math.floor((now - cust.lastPurchaseDate) / (1000 * 60 * 60 * 24))
                : 999;

            const daysSinceFirstPurchase = cust.firstPurchaseDate
                ? Math.floor((now - cust.firstPurchaseDate) / (1000 * 60 * 60 * 24))
                : 999;

            const aov = cust.billCount > 0 ? +(cust.totalSpend / cust.billCount).toFixed(2) : 0;
            cust.daysSinceLastPurchase = daysSinceLastPurchase;
            cust.averageOrderValue = aov;
            cust.totalSpend = +cust.totalSpend.toFixed(2);
            totalSegmentRevenue += cust.totalSpend;

            // Top purchased items
            cust.topFavoriteItems = Object.entries(cust.itemsSummary)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, count]) => `${name} (${count})`);

            // RFM Logic:
            if (cust.totalSpend >= vipSpendThreshold && cust.billCount >= 2) {
                cust.segment = 'VIP';
                cust.segmentBadge = '🌟 VIP Customer';
                cust.color = 'amber';
                segments.vip.push(cust);
            } else if (daysSinceFirstPurchase <= 14 && cust.billCount <= 2) {
                cust.segment = 'New';
                cust.segmentBadge = '🌱 New Customer';
                cust.color = 'emerald';
                segments.new.push(cust);
            } else if (daysSinceLastPurchase <= 30 && cust.billCount >= 3) {
                cust.segment = 'Regular';
                cust.segmentBadge = '🔄 Loyal Regular';
                cust.color = 'blue';
                segments.regular.push(cust);
            } else if (daysSinceLastPurchase > 30 && daysSinceLastPurchase <= 90 && cust.billCount >= 2) {
                cust.segment = 'At Risk';
                cust.segmentBadge = '⚠️ At Risk (Win Back)';
                cust.color = 'rose';
                segments.at_risk.push(cust);
            } else {
                cust.segment = 'Dormant';
                cust.segmentBadge = '💤 Dormant';
                cust.color = 'slate';
                segments.dormant.push(cust);
            }
        }

        // 6. Pre-crafted WhatsApp Campaign Templates
        const campaignTemplates = {
            vip: {
                title: 'VIP Privilege Reward',
                recommendedDiscount: '10%',
                message: `Dear {customerName}, thank you for being a cherished VIP customer of *${storeName}*! 🌟 Enjoy an exclusive *10% OFF* on your next visit. Valid this week! Looking forward to serving you.`
            },
            regular: {
                title: 'Loyalty Appreciation',
                recommendedDiscount: '5%',
                message: `Hello {customerName}, we love having you shop with us at *${storeName}*! 🛒 Here is a special *5% loyalty token* for your next bill. Visit us today!`
            },
            at_risk: {
                title: 'We Miss You (Win-Back)',
                recommendedDiscount: '10%',
                message: `Hi {customerName}, we haven't seen you at *${storeName}* lately! 😊 We miss you. Show this message to get *10% OFF* on your next bill. Come check out our latest arrivals!`
            },
            new: {
                title: 'Second Purchase Welcome Offer',
                recommendedDiscount: '5%',
                message: `Welcome to the *${storeName}* family, {customerName}! 🎉 Thank you for your recent purchase. Enjoy a flat *₹100 or 5% OFF* on your second order with us.`
            },
            dormant: {
                title: 'Special Re-activation',
                recommendedDiscount: '15%',
                message: `Hello {customerName}! It's been a while since your last visit to *${storeName}*. We have special discounts and new stock waiting for you. Get *15% OFF* this weekend!`
            }
        };

        const segmentStats = {
            totalCustomers: customerList.length,
            totalRevenue: +totalSegmentRevenue.toFixed(2),
            vipCount: segments.vip.length,
            regularCount: segments.regular.length,
            atRiskCount: segments.at_risk.length,
            newCount: segments.new.length,
            dormantCount: segments.dormant.length,
            vipThreshold: vipSpendThreshold
        };

        return {
            success: true,
            summary: segmentStats,
            campaignTemplates,
            segments
        };
    } catch (err) {
        console.error('❌ Customer Segmentation Error:', err);
        throw err;
    }
}

module.exports = {
    analyzeCustomerSegments
};
