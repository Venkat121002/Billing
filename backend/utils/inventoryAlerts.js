/**
 * Low Stock Inventory Alerts & Summaries
 * Feature 3 of Phase 1 Automation.
 */
const platformStore = require('./platformStore');
const wa = require('./whatsappService');
const { sendEmail } = require('./emailService');
const emailTemplates = require('./emailTemplates');
const { listStoreRecords } = require('./storeRecords');

/**
 * Check if a product has dropped below its minimum stock threshold after a sale,
 * and dispatch an immediate WhatsApp alert to the store owner.
 *
 * Throttled: Only sends once per threshold drop cycle (via lowStockAlertSent).
 * Automatically resets lowStockAlertSent to false when restocked.
 */
async function checkAndAlertLowStock({ productDoc, updatedQuantity, ownerId, productDocRef }) {
    try {
        if (!productDoc || updatedQuantity === undefined) return;

        const threshold = Number(productDoc.minStockThreshold !== undefined 
            ? productDoc.minStockThreshold 
            : (productDoc.reorderLevel || 5));

        const qty = Number(updatedQuantity);

        // If restocked above threshold, re-arm the alert
        if (qty > threshold) {
            if (productDoc.lowStockAlertSent) {
                if (productDocRef && typeof productDocRef.update === 'function') {
                    await productDocRef.update({ lowStockAlertSent: false });
                } else if (typeof productDoc.save === 'function') {
                    productDoc.lowStockAlertSent = false;
                    await productDoc.save();
                } else if (productDoc.update) {
                    await productDoc.update({ lowStockAlertSent: false });
                }
            }
            return;
        }

        // If at or below threshold and not yet alerted
        if (qty <= threshold && !productDoc.lowStockAlertSent) {
            const actualOwnerId = ownerId || productDoc.ownerId;
            const owner = await platformStore.getOwner(actualOwnerId);
            const ownerMobile = owner?.mobile || owner?.phone;
            const storeName = owner?.companyDetails?.name || owner?.businessName || 'Your Store';
            const ownerName = owner?.firstName || owner?.name || 'Owner';

            if (ownerMobile && wa.normalizePhone(ownerMobile)) {
                await wa.sendTemplate({
                    to: ownerMobile,
                    type: 'LOW_STOCK_ALERT',
                    data: {
                        owner_name: ownerName,
                        store_name: storeName,
                        product_name: productDoc.name || 'Unnamed Product',
                        current_stock: String(qty),
                        threshold: String(threshold),
                        unit: productDoc.unit || 'units'
                    }
                }).catch((err) => {
                    console.error('[inventoryAlerts] WhatsApp alert error:', err.message);
                });
            } else {
                console.log(`[inventoryAlerts] Low stock alert skipped for ${productDoc.name}: Owner has no valid mobile.`);
            }

            // Mark alert sent in DB
            if (productDocRef && typeof productDocRef.update === 'function') {
                await productDocRef.update({ lowStockAlertSent: true });
            } else if (typeof productDoc.save === 'function') {
                productDoc.lowStockAlertSent = true;
                await productDoc.save();
            } else if (productDoc.update) {
                await productDoc.update({ lowStockAlertSent: true });
            }
        }
    } catch (err) {
        console.error('[inventoryAlerts] Error in checkAndAlertLowStock:', err.message);
    }
}

/**
 * Runs a daily scan of low-stock products and emails each owner a summary of
 * their own store. `ownerId` limits the run to that one store (the owner's
 * manual trigger); without it every store is processed (the scheduled job).
 */
async function runDailyLowStockSummary(now = new Date(), { ownerId: onlyOwnerId } = {}) {
    const summary = { ownersChecked: 0, emailsSent: 0, skippedNoEmail: 0, lowStockTotal: 0 };
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

    try {
        const owners = onlyOwnerId
            ? [await platformStore.getOwner(onlyOwnerId)].filter(Boolean)
            : await platformStore.listOwners();

        for (const owner of owners) {
            summary.ownersChecked += 1;
            // Business records carry the owner's userId, not the Mongo _id.
            const ownerId = owner.userId || owner._id?.toString();
            const email = owner.email;
            const storeName = owner.companyDetails?.name || owner.businessName || 'Your Store';
            const ownerName = owner.firstName || owner.name || 'Owner';

            // Query low-stock products for this owner
            const products = await listStoreRecords(ownerId, 'products');

            const lowStockItems = (products || []).filter((p) => {
                const threshold = Number(p.minStockThreshold !== undefined ? p.minStockThreshold : (p.reorderLevel || 5));
                const qty = Number(p.quantity || 0);
                return threshold > 0 && qty <= threshold;
            });

            if (lowStockItems.length === 0) continue;

            summary.lowStockTotal += lowStockItems.length;

            if (!email) {
                summary.skippedNoEmail += 1;
                continue;
            }

            const template = emailTemplates.lowStockSummary({
                storeName,
                ownerName,
                date: dateStr,
                items: lowStockItems.map((p) => ({
                    name: p.name || 'Product',
                    category: p.category || '',
                    quantity: Number(p.quantity || 0),
                    unit: p.unit || '',
                    minStockThreshold: Number(p.minStockThreshold !== undefined ? p.minStockThreshold : (p.reorderLevel || 5))
                }))
            });

            await sendEmail({
                to: email,
                ...template
            }).catch((err) => {
                console.error(`[inventoryAlerts] Failed sending low stock email to ${email}:`, err.message);
            });

            summary.emailsSent += 1;
        }
    } catch (err) {
        console.error('[inventoryAlerts] Error in runDailyLowStockSummary:', err);
    }

    return summary;
}

module.exports = {
    checkAndAlertLowStock,
    runDailyLowStockSummary
};
