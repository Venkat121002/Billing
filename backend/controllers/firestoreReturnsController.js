const { getCollection } = require('../utils/dbUtils');

/**
 * Adjust a single product's stock by `delta` total units.
 * Shared by purchase (negative delta) and sales (positive delta) returns.
 */
async function adjustStock(req, item, direction) {
    if (!item.productId) return;

    const returnQty = Number(item.returnQuantity || 0);
    if (returnQty <= 0) return;

    const productRef = getCollection(req, 'products').doc(String(item.productId));
    const productDoc = await productRef.get();
    if (!productDoc.exists) return;

    const product = productDoc.data();
    const unitMultiplier = Math.max(Number(product.unit || 1) || 1, 1);
    const totalUnitsBefore = Number(product.quantity || 0) * unitMultiplier;

    const newTotalUnits = direction === 'increase'
        ? totalUnitsBefore + returnQty
        : Math.max(totalUnitsBefore - returnQty, 0);

    const newQty = Number((newTotalUnits / unitMultiplier).toFixed(3));
    if (!isNaN(newQty) && isFinite(newQty)) {
        await productRef.update({ quantity: newQty });
    }
}

/**
 * Process Purchase Return — decreases stock, saves a return record.
 * Sequential writes (no batch) so this works identically in MongoDB mode and,
 * later, in a future Firestore mode.
 */
exports.processPurchaseReturn = async (req, res) => {
    try {
        const { vendorId, purchaseInvoiceNo, returnDate, reason, items = [], totals = {}, createdBy } = req.body;

        if (!Array.isArray(items)) {
            return res.status(400).json({ msg: "Items must be an array" });
        }

        const sanitizedItems = JSON.parse(JSON.stringify(items));
        const sanitizedTotals = JSON.parse(JSON.stringify(totals));

        const { id } = await getCollection(req, 'inventory_returns').add({
            type: 'purchase',
            vendorId: vendorId || null,
            purchaseInvoiceNo: purchaseInvoiceNo || "",
            returnDate: returnDate || new Date().toISOString(),
            reason: reason || "",
            items: sanitizedItems,
            totals: sanitizedTotals,
            createdBy: createdBy || null,
            createdAt: new Date().toISOString()
        });

        for (const item of items) {
            await adjustStock(req, item, 'decrease');
        }

        res.status(201).json({ msg: "Purchase return processed successfully", id });
    } catch (err) {
        console.error("Purchase Return FULL ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Process Sales Return — increases stock (unless damaged), saves a return record.
 */
exports.processSalesReturn = async (req, res) => {
    try {
        const { customerId, customerName, salesInvoiceNo, returnDate, reason = "", items = [], totals = {}, createdBy } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ msg: "Items must be a non-empty array" });
        }

        const sanitizedItems = JSON.parse(JSON.stringify(items));
        const sanitizedTotals = JSON.parse(JSON.stringify(totals));

        const { id } = await getCollection(req, 'inventory_returns').add({
            type: 'sales',
            customerId: customerId ? String(customerId) : null,
            customerName: customerName ? String(customerName) : "Walk-in Customer",
            salesInvoiceNo: salesInvoiceNo ? String(salesInvoiceNo) : "",
            returnDate: returnDate || new Date().toISOString(),
            reason: String(reason || ""),
            items: sanitizedItems,
            totals: sanitizedTotals,
            createdBy: createdBy || null,
            createdAt: new Date().toISOString()
        });

        // Damaged goods don't go back into sellable stock.
        const isDamaged = String(reason || "").toLowerCase().includes('damage');
        if (!isDamaged) {
            for (const item of items) {
                await adjustStock(req, item, 'increase');
            }
        }

        res.status(201).json({ msg: "Sales return processed successfully", id });
    } catch (err) {
        console.error("Sales Return FULL ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get all returns for a tenant
 */
exports.getReturns = async (req, res) => {
    try {
        const returnsRef = getCollection(req, 'inventory_returns');
        const snapshot = await returnsRef.get();

        const returns = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json(returns);
    } catch (err) {
        console.error("Get Returns Error:", err);
        res.status(500).json({ msg: "Failed to fetch returns" });
    }
};
