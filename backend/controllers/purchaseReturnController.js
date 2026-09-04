const admin = require('firebase-admin');
const db = admin.firestore();

// @route   POST /purchase-return
exports.createPurchaseReturn = async (req, res) => {
  try {
    const { vendorId, items, totals, inventoryUpdates, vendorUpdate, reason, returnDate, createdBy } = req.body;
    const batch = db.batch();

    // 1. Save Purchase Return Record (Pass-through)
    const returnRef = db.collection('purchase_returns').doc();
    batch.set(returnRef, {
      vendorId, items, totals, reason, returnDate, createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Update Inventory with pre-calculated stock levels
    inventoryUpdates.forEach(update => {
      const prodRef = db.collection('products').doc(update.productId);
      batch.update(prodRef, { quantity: update.newQuantity });
    });

    // 3. Update Vendor Balance with pre-calculated due
    const vendorRef = db.collection('suppliers').doc(vendorUpdate.vendorId);
    batch.update(vendorRef, { balance: vendorUpdate.newBalance });

    await batch.commit();
    res.status(201).json({ success: true, msg: "Return saved and stock updated via Firebase" });
  } catch (err) {
    res.status(500).json({ msg: err.message || "Internal Server Error" });
  }
};

// @route   GET /purchase-return
exports.getAllReturns = async (req, res) => {
  try {
    const returns = await PurchaseReturn.find()
      .populate('vendorId', 'name company mobile')
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
};

// @route   GET /purchase-return/:id
exports.getReturnById = async (req, res) => {
  try {
    const pReturn = await PurchaseReturn.findById(req.params.id)
      .populate('vendorId', 'name company mobile address gst');
    if (!pReturn) return res.status(404).json({ msg: "Return not found" });
    res.json(pReturn);
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
};