const { db } = require('../config/firebase');

const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');

// Helper wrapper to get credit_customers collection reference
const getCreditCollection = (req) => {
    return getCollection(req, 'credit_customers');
};

// @desc    Get all credit customers
// @route   GET /api/v2/credit
exports.getCredits = async (req, res) => {
    try {
        const credits = await fetchUnifiedData(req, 'credit_customers');
        res.json(credits);
    } catch (err) {
        console.error("Get Credit Records Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create/Add a credit record (Customer)
// @route   POST /api/v2/credit
exports.createCredit = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const data = {
            ...req.body,
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const collectionRef = getCreditCollection(req);
        const docRef = await collectionRef.add(data);

        res.json({ id: docRef.id, ...data });
    } catch (err) {
        console.error("Create Credit Record Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Update a credit record
// @route   PUT /api/v2/credit/:id
exports.updateCredit = async (req, res) => {
    try {
        const { id } = req.params;
        const collectionRef = getCreditCollection(req);
        const docRef = collectionRef.doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Record not found" });
        }

        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        await docRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update Credit Record Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a credit record
// @route   DELETE /api/v2/credit/:id
exports.deleteCredit = async (req, res) => {
    try {
        const { id } = req.params;
        const collectionRef = getCreditCollection(req);
        const docRef = collectionRef.doc(id);

        await docRef.delete();
        res.json({ msg: "Record deleted" });
    } catch (err) {
        console.error("Delete Credit Record Error:", err.message);
        res.status(500).send("Server Error");
    }
};
