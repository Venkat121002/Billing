// const { db, admin } = require('../config/firebase');


// const { getCollection } = require('../utils/dbUtils');

// /**
//  * Process Purchase Return
//  * Decreases stock and saves return record
//  */
// exports.processPurchaseReturn = async (req, res) => {
//     try {
//         const { vendorId, purchaseInvoiceNo, returnDate, reason, items, totals, createdBy } = req.body;
//         const batch = db.batch();
        
//         // 1. Create Return Record
//         const returnRef = getCollection(req, 'inventory_returns').doc();
//         batch.set(returnRef, {
//             type: 'purchase',
//             vendorId,
//             purchaseInvoiceNo,
//             returnDate,
//             reason,
//             items,
//             totals,
//             createdBy,
//             createdAt: admin.firestore.FieldValue.serverTimestamp()
//         });

//         // 2. Update Stock
//         for (const item of items) {
//             if (!item.productId) continue;
//             const productRef = getCollection(req, 'products').doc(item.productId);
//             const productDoc = await productRef.get();
            
//             if (productDoc.exists) {
//                 const product = productDoc.data();
//                 const unitMultiplier = Number(product.unit) || 1;
//                 const totalUnitsBefore = Number(product.quantity || 0) * unitMultiplier;
                
//                 // Purchase return decreases stock (sending back to vendor)
//                 const newTotalUnits = Math.max(totalUnitsBefore - Number(item.returnQuantity), 0);
//                 const newQty = newTotalUnits / unitMultiplier;
                
//                 batch.update(productRef, { quantity: newQty });
//             }
//         }

//         await batch.commit();
//         res.status(201).json({ msg: "Purchase return processed successfully", id: returnRef.id });
//     } catch (err) {
//         console.error("Purchase Return Error:", err);
//         res.status(500).json({ msg: "Failed to process purchase return" });
//     }
// };

// /**
//  * Process Sales Return
//  * Increases stock and saves return record
//  */
// exports.processSalesReturn = async (req, res) => {
//     try {
//         const { customerId, customerName, salesInvoiceNo, returnDate, reason, items, totals, createdBy } = req.body;
//         const batch = db.batch();
        
//         // 1. Create Return Record
//         const returnRef = getCollection(req, 'inventory_returns').doc();
//         batch.set(returnRef, {
//             type: 'sales',
//             customerId,
//             customerName,
//             salesInvoiceNo,
//             returnDate,
//             reason,
//             items,
//             totals,
//             createdBy,
//             createdAt: admin.firestore.FieldValue.serverTimestamp()
//         });

//         // 2. Update Stock
//         for (const item of items) {
//             if (!item.productId) continue;
//             const productRef = getCollection(req, 'products').doc(item.productId);
//             const productDoc = await productRef.get();
            
//             if (productDoc.exists) {
//                 const product = productDoc.data();
//                 const unitMultiplier = Number(product.unit) || 1;
//                 const totalUnitsBefore = Number(product.quantity || 0) * unitMultiplier;
                
//                 // Sales return increases stock (receiving back from customer)
//                 const newTotalUnits = totalUnitsBefore + Number(item.returnQuantity);
//                 const newQty = newTotalUnits / unitMultiplier;
                
//                 batch.update(productRef, { quantity: newQty });
//             }
//         }

//         await batch.commit();
//         res.status(201).json({ msg: "Sales return processed successfully", id: returnRef.id });
//     } catch (err) {
//         console.error("Sales Return Error:", err);
//         res.status(500).json({ msg: "Failed to process sales return" });
//     }
// };



const { db, admin } = require('../config/firebase');
const { getCollection } = require('../utils/dbUtils');

/**
 * Process Purchase Return
 */
exports.processPurchaseReturn = async (req, res) => {
    try {
        const { vendorId, purchaseInvoiceNo, returnDate, reason, items = [], totals = {}, createdBy } = req.body;

        // ✅ Validation
        if (!Array.isArray(items)) {
            return res.status(400).json({ msg: "Items must be an array" });
        }

        const batch = db.batch();

        // Strip undefined fields which crash Firestore
        const sanitizedItems = JSON.parse(JSON.stringify(items));
        const sanitizedTotals = JSON.parse(JSON.stringify(totals));

        // 1. Create Return Record
        const returnRef = getCollection(req, 'inventory_returns').doc();
        batch.set(returnRef, {
            type: 'purchase',
            vendorId: vendorId || null,
            purchaseInvoiceNo: purchaseInvoiceNo || "",
            returnDate,
            reason,
            items: sanitizedItems,
            totals: sanitizedTotals,
            createdBy,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update Stock
        for (const item of items) {
            if (!item.productId) continue;

            const returnQty = Number(item.returnQuantity || 0);

            const productRef = getCollection(req, 'products').doc(String(item.productId));
            const productDoc = await productRef.get();

            if (productDoc.exists) {
                const product = productDoc.data();

                const unitMultiplier = Number(product.unit || 1) || 1;
                const totalUnitsBefore = Number(product.quantity || 0) * unitMultiplier;

                const newTotalUnits = Math.max(totalUnitsBefore - returnQty, 0);
                const newQty = newTotalUnits / unitMultiplier;

                if (!isNaN(newQty) && isFinite(newQty)) {
                    batch.update(productRef, { quantity: newQty });
                }
            }
        }

        await batch.commit();

        res.status(201).json({
            msg: "Purchase return processed successfully",
            id: returnRef.id
        });

    } catch (err) {
        console.error("Purchase Return FULL ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};


/**
 * Process Sales Return
 */
exports.processSalesReturn = async (req, res) => {
    try {
        const { customerId, customerName, salesInvoiceNo, returnDate, reason = "", items = [], totals = {}, createdBy } = req.body;

        // ✅ Validation
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ msg: "Items must be a non-empty array" });
        }

        const batch = db.batch();

        // Strip undefined fields to prevent 500 error
        const sanitizedItems = JSON.parse(JSON.stringify(items));
        const sanitizedTotals = JSON.parse(JSON.stringify(totals));

        // 1. Create Return Record
        const returnRef = getCollection(req, 'inventory_returns').doc();
        batch.set(returnRef, {
            type: 'sales',
            customerId: customerId ? String(customerId) : null,
            customerName: customerName ? String(customerName) : "Walk-in Customer",
            salesInvoiceNo: salesInvoiceNo ? String(salesInvoiceNo) : "",
            returnDate: returnDate || new Date().toISOString(),
            reason: String(reason || ""),
            items: sanitizedItems,
            totals: sanitizedTotals,
            createdBy: createdBy || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update Stock (Only if NOT damaged)
        const isDamaged = String(reason || "").toLowerCase().includes('damage');
        
        if (!isDamaged) {
            for (const item of items) {
                if (!item.productId) continue;

                const returnQty = Number(item.returnQuantity || 0);
                if (returnQty <= 0) continue;

                const productRef = getCollection(req, 'products').doc(String(item.productId));
                const productDoc = await productRef.get();

                if (productDoc.exists) {
                    const product = productDoc.data();
                    
                    // Safely handle unit multipliers
                    const unitMultiplier = Math.max(Number(product.unit || 1), 1);
                    const totalUnitsBefore = Number(product.quantity || 0) * unitMultiplier;

                    const newTotalUnits = totalUnitsBefore + returnQty;
                    const newQty = Number((newTotalUnits / unitMultiplier).toFixed(3));

                    if (!isNaN(newQty) && isFinite(newQty)) {
                        batch.update(productRef, { quantity: newQty });
                    }
                }
            }
        }

        await batch.commit();

        res.status(201).json({
            msg: "Sales return processed successfully",
            id: returnRef.id
        });

    } catch (err) {
        console.error("❌ Sales Return FULL ERROR:", err.message);
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