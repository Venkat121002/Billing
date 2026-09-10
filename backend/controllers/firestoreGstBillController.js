const { db } = require('../config/firebase');

const { getCollection } = require('../utils/dbUtils');

// Helper wrapper to get gstBills collection reference
const getGstBillsCollection = (req) => {
    return getCollection(req, 'gstBills');
};

// @desc    Get all gst bills
// @route   GET /api/v2/gst-bills
exports.getGstBills = async (req, res) => {
    try {
        const collectionRef = getGstBillsCollection(req);
        const snapshot = await collectionRef.orderBy('createdAt', 'desc').get();

        const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(docs);
    } catch (err) {
        console.error("Get GST Bills Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a gst bill
// @route   POST /api/v2/gst-bills
exports.createGstBill = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const data = {
            ...req.body,
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString()
        };

        const collectionRef = getGstBillsCollection(req);
        const docRef = await collectionRef.add(data);

        res.json({ id: docRef.id, ...data });
    } catch (err) {
        console.error("Create GST Bill Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Update a gst bill
// @route   PUT /api/v2/gst-bills/:id
exports.updateGstBill = async (req, res) => {
    try {
        const { id } = req.params;
        const collectionRef = getGstBillsCollection(req);
        const docRef = collectionRef.doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Invoice not found" });
        }

        const updateData = {
            ...req.body
        };

        await docRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update GST Bill Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a gst bill
// @route   DELETE /api/v2/gst-bills/:id
exports.deleteGstBill = async (req, res) => {
    try {
        const { id } = req.params;
        const collectionRef = getGstBillsCollection(req);
        const docRef = collectionRef.doc(id);

        await docRef.delete();
        res.json({ msg: "Invoice deleted" });
    } catch (err) {
        console.error("Delete GST Bill Error:", err.message);
        res.status(500).send("Server Error");
    }
};
