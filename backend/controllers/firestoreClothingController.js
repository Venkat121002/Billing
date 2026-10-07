const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');
const { sendDirectText } = require('../utils/whatsappService');
const platformStore = require('../utils/platformStore');
const { Product, Bill, StoreCredit } = require('../models/mongodb');

// Helper to get collection
const getClothingCol = (req, name) => getCollection(req, name);

// =========================================================================
// Pillar 1: Matrix Auto-Generator (Batch Variant Creator)
// =========================================================================
exports.createMatrixProducts = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const effectiveOwnerId = role === 'owner' ? userId : (ownerId || userId);
        const tenantId = req.user.tenantId || effectiveOwnerId;

        const {
            articleName,
            brand = '',
            category = 'Clothing',
            subCategory = '',
            gender = 'Unisex',
            hsn = '6109',
            purchasePrice = 0,
            price = 0,
            discount = 0,
            gst = 5,
            minStockThreshold = 3,
            variants = [] // [{ size, color, quantity, barcode }]
        } = req.body;

        if (!articleName || !Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({ msg: "Article name and at least one variant are required." });
        }

        const productsCol = getClothingCol(req, 'products');
        const createdProducts = [];
        const baseTimestamp = Date.now();

        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            const size = (v.size || 'Free Size').trim();
            const color = (v.color || 'Standard').trim();
            const variantQty = Number(v.quantity) || 1;
            const variantPrice = Number(v.price) || Number(price);
            const variantPurchasePrice = Number(v.purchasePrice) || Number(purchasePrice);

            // Auto-generate barcode if blank: 12 digits (e.g. 890 + random 9 digits)
            const autoBarcode = v.barcode && String(v.barcode).trim().length > 0
                ? String(v.barcode).trim()
                : `CLO${baseTimestamp.toString().slice(-6)}${String(i + 1).padStart(2, '0')}`;

            const productData = {
                name: `${articleName} - ${size} (${color})`,
                baseArticle: articleName,
                brand,
                category,
                subCategory,
                gender,
                size,
                color,
                barcode: autoBarcode,
                hsn,
                gst: Number(gst) || 5,
                price: variantPrice,
                purchasePrice: variantPurchasePrice,
                quantity: variantQty,
                unit: 'Pcs',
                discount: Number(discount) || 0,
                minStockThreshold: Number(minStockThreshold) || 3,
                reorderLevel: Number(minStockThreshold) || 3,
                tenantId,
                ownerId: effectiveOwnerId,
                createdBy: userId,
                isClothingVariant: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const docRef = await productsCol.add(productData);
            createdProducts.push({ id: docRef.id, ...productData });
        }

        res.status(201).json({
            success: true,
            count: createdProducts.length,
            msg: `Successfully generated ${createdProducts.length} clothing variants with barcodes!`,
            products: createdProducts
        });
    } catch (err) {
        console.error("Create Matrix Products Error:", err);
        res.status(500).json({ msg: "Failed to generate matrix products", error: err.message });
    }
};

// =========================================================================
// Pillar 2: High-Speed POS Digital WhatsApp Bill Dispatch
// =========================================================================
exports.sendBillWhatsApp = async (req, res) => {
    try {
        const {
            customerPhone,
            customerName = 'Valued Customer',
            billNumber = 'N/A',
            items = [],
            grandTotal = 0,
            discountTotal = 0,
            paymentMethod = 'Cash',
            salesmanName = ''
        } = req.body;

        if (!customerPhone) {
            return res.status(400).json({ msg: "Customer phone number is required" });
        }

        const effectiveOwnerId = req.user.role === 'owner' ? req.user.userId : (req.user.ownerId || req.user.userId);
        const owner = await platformStore.getOwner(effectiveOwnerId).catch(() => null);
        const storeName = owner?.companyDetails?.name || owner?.businessName || req.user.businessName || "Our Clothing Store";

        let itemsSummary = '';
        items.forEach((it, idx) => {
            const sizeLabel = it.size ? ` [${it.size}]` : '';
            const colorLabel = it.color ? ` (${it.color})` : '';
            itemsSummary += `${idx + 1}. ${it.name || 'Garment'}${sizeLabel}${colorLabel} x${it.qty || 1} - Rs.${(Number(it.price || 0) * Number(it.qty || 1)).toFixed(2)}\n`;
        });

        const invoiceMessage = `✨ *INVOICE: ${storeName}* ✨
Invoice No: #${billNumber}
Date: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
Customer: ${customerName}
${salesmanName ? `Assisted by: ${salesmanName}\n` : ''}
--- *ITEMS* ---
${itemsSummary}
*Grand Total: Rs. ${Number(grandTotal).toFixed(2)}*
Payment Mode: ${paymentMethod.toUpperCase()}
${discountTotal > 0 ? `Total Savings: Rs. ${Number(discountTotal).toFixed(2)}\n` : ''}
-----------------------
*EXCHANGE POLICY:*
• Size & color exchanges valid within 7 days.
• Original price tag must remain attached.

Thank you for shopping with ${storeName}! Visit us again soon.`;

        const waRes = await sendDirectText({ to: customerPhone, text: invoiceMessage });
        res.json({ success: true, msg: `WhatsApp bill sent to ${customerPhone}`, waRes });
    } catch (err) {
        console.error("Send Bill WhatsApp Error:", err);
        res.status(500).json({ msg: "Failed to dispatch WhatsApp bill", error: err.message });
    }
};

// =========================================================================
// Pillar 4: 1-Click Size Exchange & Store Credit Notes
// =========================================================================
exports.processSizeExchange = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const effectiveOwnerId = role === 'owner' ? userId : (ownerId || userId);
        const tenantId = req.user.tenantId || effectiveOwnerId;

        const {
            originalBillNumber = '',
            customerName = 'Customer',
            customerPhone = '',
            returnedItem, // { productId, name, size, color, price, qty }
            replacementItem // { productId, name, size, color, price, qty }
        } = req.body;

        if (!returnedItem || !replacementItem) {
            return res.status(400).json({ msg: "Both returned item and replacement item are required." });
        }

        const productsCol = getClothingCol(req, 'products');

        // 1. Restock returned item (+1 qty)
        if (returnedItem.productId) {
            try {
                const retDocRef = productsCol.doc(returnedItem.productId);
                const retDoc = await retDocRef.get();
                if (retDoc.exists) {
                    const currentQty = Number(retDoc.data().quantity) || 0;
                    await retDocRef.update({
                        quantity: currentQty + (Number(returnedItem.qty) || 1),
                        updatedAt: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.warn("Could not auto-restock returned item:", err.message);
            }
        }

        // 2. Decrement replacement item (-1 qty)
        if (replacementItem.productId) {
            try {
                const repDocRef = productsCol.doc(replacementItem.productId);
                const repDoc = await repDocRef.get();
                if (repDoc.exists) {
                    const currentQty = Number(repDoc.data().quantity) || 0;
                    await repDocRef.update({
                        quantity: Math.max(0, currentQty - (Number(replacementItem.qty) || 1)),
                        updatedAt: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.warn("Could not decrement replacement item:", err.message);
            }
        }

        const retPrice = Number(returnedItem.price) || 0;
        const repPrice = Number(replacementItem.price) || 0;
        const priceDiff = repPrice - retPrice; // >0: customer pays diff; <0: store owes customer credit

        let storeCreditNote = null;
        if (priceDiff < 0) {
            const creditAmount = Math.abs(priceDiff);
            const voucherCode = `CN-${Date.now().toString(36).toUpperCase()}`;

            const creditData = {
                code: voucherCode,
                customerName,
                customerPhone: customerPhone || '',
                amount: creditAmount,
                remainingAmount: creditAmount,
                reason: `Exchange diff: ${returnedItem.name} (${returnedItem.size}) -> ${replacementItem.name} (${replacementItem.size})`,
                originalBillId: originalBillNumber,
                status: 'active',
                expiryDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0], // 90 days validity
                tenantId,
                ownerId: effectiveOwnerId,
                createdBy: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const storeCreditsCol = getClothingCol(req, 'storecredits');
            const scRef = await storeCreditsCol.add(creditData);
            storeCreditNote = { id: scRef.id, ...creditData };
        }

        // Send WhatsApp confirmation to customer if mobile exists
        if (customerPhone) {
            const owner = await platformStore.getOwner(effectiveOwnerId).catch(() => null);
            const storeName = owner?.companyDetails?.name || owner?.businessName || req.user.businessName || "Our Clothing Store";

            let diffText = 'No price difference (Even Exchange)';
            if (priceDiff > 0) diffText = `Balance paid by you: Rs. ${priceDiff}`;
            else if (priceDiff < 0 && storeCreditNote) {
                diffText = `Store Credit Issued: Rs. ${storeCreditNote.amount}\n🎁 Voucher Code: *${storeCreditNote.code}* (Valid for 90 days)`;
            }

            const exchangeText = `🔄 *EXCHANGE RECEIPT: ${storeName}* 🔄
Customer: ${customerName}
Original Bill: #${originalBillNumber || 'N/A'}
Date: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}

• Returned: ${returnedItem.name} [Size: ${returnedItem.size || 'N/A'}, Color: ${returnedItem.color || 'N/A'}]
• Exchanged: ${replacementItem.name} [Size: ${replacementItem.size || 'N/A'}, Color: ${replacementItem.color || 'N/A'}]

${diffText}

Thank you for visiting ${storeName}!`;

            sendDirectText({ to: customerPhone, text: exchangeText })
                .catch(err => console.log('[Exchange WhatsApp Error]:', err.message));
        }

        res.json({
            success: true,
            msg: "Size exchange processed successfully!",
            priceDiff,
            storeCreditNote,
            returnedItem,
            replacementItem
        });
    } catch (err) {
        console.error("Process Size Exchange Error:", err);
        res.status(500).json({ msg: "Failed to process size exchange", error: err.message });
    }
};

// Get active store credits
exports.getStoreCredits = async (req, res) => {
    try {
        const credits = await fetchUnifiedData(req, 'storecredits');
        res.json(credits || []);
    } catch (err) {
        console.error("Get Store Credits Error:", err);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
};

// =========================================================================
// Pillar 5: Dead Stock / Aging Analysis & Nightly Closing Reconciliation
// =========================================================================
exports.getAgingStock = async (req, res) => {
    try {
        const thresholdDays = parseInt(req.query.thresholdDays) || 60;
        const products = await fetchUnifiedData(req, 'products');

        const now = Date.now();
        const agingItems = [];
        let totalInvestedInSlowMovers = 0;

        (products || []).forEach(p => {
            const qty = Number(p.quantity) || 0;
            if (qty <= 0) return; // ignore out of stock

            const createdTime = new Date(p.createdAt || 0).getTime();
            const daysInStock = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));

            if (daysInStock >= thresholdDays) {
                const cost = Number(p.purchasePrice || p.price * 0.6 || 0);
                const holdingValue = cost * qty;
                totalInvestedInSlowMovers += holdingValue;

                // Recommended markdown
                let suggestedDiscount = 20;
                if (daysInStock >= 120) suggestedDiscount = 50;
                else if (daysInStock >= 90) suggestedDiscount = 35;

                agingItems.push({
                    id: p.id || p._id,
                    name: p.name,
                    brand: p.brand || '',
                    size: p.size || 'N/A',
                    color: p.color || 'N/A',
                    category: p.category || 'Clothing',
                    quantity: qty,
                    price: p.price,
                    purchasePrice: cost,
                    holdingValue,
                    daysInStock,
                    suggestedDiscount
                });
            }
        });

        agingItems.sort((a, b) => b.daysInStock - a.daysInStock);

        res.json({
            success: true,
            thresholdDays,
            slowMoversCount: agingItems.length,
            totalHoldingValue: totalInvestedInSlowMovers,
            items: agingItems
        });
    } catch (err) {
        console.error("Get Aging Stock Error:", err);
        res.status(500).json({ msg: "Failed to analyze aging stock", error: err.message });
    }
};

// End-of-Day Closing Calculation
exports.getEodClosing = async (req, res) => {
    try {
        const effectiveOwnerId = req.user.role === 'owner' ? req.user.userId : (req.user.ownerId || req.user.userId);
        const tenantId = req.user.tenantId || effectiveOwnerId;

        const targetDate = req.query.date ? new Date(req.query.date) : new Date();
        const istDateStr = targetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        const start = new Date(`${istDateStr}T00:00:00.000+05:30`).toISOString();
        const end = new Date(`${istDateStr}T23:59:59.999+05:30`).toISOString();

        // Fetch bills for today strictly for this clothing store
        const bills = await Bill.find({
            ownerId: effectiveOwnerId,
            createdAt: { $gte: start, $lte: end }
        }).lean();

        let totalRevenue = 0;
        let cashTotal = 0;
        let upiTotal = 0;
        let cardTotal = 0;
        let otherTotal = 0;
        let totalItemsSold = 0;

        const sizeStats = {};
        const categoryStats = {};
        const staffSales = {};

        bills.forEach(bill => {
            const billTotal = Number(bill.totals?.grandTotal ?? bill.grandTotal ?? bill.total ?? 0);
            totalRevenue += billTotal;

            const method = String(bill.paymentMethod || 'cash').toLowerCase();
            if (method.includes('cash')) cashTotal += billTotal;
            else if (method.includes('upi')) upiTotal += billTotal;
            else if (method.includes('card')) cardTotal += billTotal;
            else otherTotal += billTotal;

            // Salesman attribution
            const staff = bill.salesmanName || bill.salesperson || bill.createdBy || 'Counter 1';
            if (!staffSales[staff]) staffSales[staff] = { name: staff, count: 0, revenue: 0 };
            staffSales[staff].count += 1;
            staffSales[staff].revenue += billTotal;

            (bill.items || []).forEach(it => {
                const qty = Number(it.qty || it.quantity || 1);
                totalItemsSold += qty;

                const size = it.size || 'Standard';
                sizeStats[size] = (sizeStats[size] || 0) + qty;

                const cat = it.category || 'Apparel';
                categoryStats[cat] = (categoryStats[cat] || 0) + qty;
            });
        });

        res.json({
            success: true,
            date: istDateStr,
            totalBills: bills.length,
            totalRevenue,
            totalItemsSold,
            paymentBreakdown: {
                cash: cashTotal,
                upi: upiTotal,
                card: cardTotal,
                other: otherTotal
            },
            sizeStats,
            categoryStats,
            staffLeaderboard: Object.values(staffSales).sort((a, b) => b.revenue - a.revenue)
        });
    } catch (err) {
        console.error("Get EOD Closing Error:", err);
        res.status(500).json({ msg: "Failed to generate EOD closing", error: err.message });
    }
};

// Send EOD Closing WhatsApp Summary to Owner
exports.sendEodWhatsApp = async (req, res) => {
    try {
        const effectiveOwnerId = req.user.role === 'owner' ? req.user.userId : (req.user.ownerId || req.user.userId);
        const owner = await platformStore.getOwner(effectiveOwnerId).catch(() => null);
        const targetPhone = req.body.ownerPhone || owner?.phone || owner?.mobile || req.user.phone;

        if (!targetPhone) {
            return res.status(400).json({ msg: "Store owner phone number is required" });
        }

        const storeName = owner?.companyDetails?.name || owner?.businessName || req.user.businessName || "Clothing Boutique";
        const istDateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

        const {
            totalRevenue = 0,
            totalBills = 0,
            totalItemsSold = 0,
            paymentBreakdown = {},
            topStaff = 'N/A'
        } = req.body;

        const summaryText = `📊 *DAILY CLOSING SUMMARY: ${storeName}* 📊
Date: ${istDateStr}
----------------------------
💰 *Total Revenue: Rs. ${Number(totalRevenue).toFixed(2)}*
🛍️ Invoices Created: ${totalBills}
👗 Garments Sold: ${totalItemsSold} pcs

*PAYMENT COLLECTION:*
• Cash in Drawer: Rs. ${Number(paymentBreakdown.cash || 0).toFixed(2)}
• UPI / QR: Rs. ${Number(paymentBreakdown.upi || 0).toFixed(2)}
• Card: Rs. ${Number(paymentBreakdown.card || 0).toFixed(2)}

🌟 Top Sales Executive: ${topStaff}
----------------------------
Automated EOD Report • SwordNex Billing`;

        const waRes = await sendDirectText({ to: targetPhone, text: summaryText });
        res.json({ success: true, msg: `Closing summary dispatched to ${targetPhone} on WhatsApp!`, waRes });
    } catch (err) {
        console.error("Send EOD WhatsApp Error:", err);
        res.status(500).json({ msg: "Failed to send EOD WhatsApp", error: err.message });
    }
};
