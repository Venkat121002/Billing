const { db } = require('../config/firebase');

const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');

// Transaction helper (centralized in dbUtils)
const getTransactionsCollection = (req) => {
    return getCollection(req, 'transactions');
};


// @desc    Get all transactions
// @route   GET /api/v2/cashbook
exports.getTransactions = async (req, res) => {
    try {
        const records = await fetchUnifiedData(req, 'cashbook');
        res.json(records);
    } catch (err) {
        console.error("Get Cashbook Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a transaction
// @route   POST /api/v2/cashbook
exports.createTransaction = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const data = {
            ...req.body,
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString()
        };

        const collectionRef = getTransactionsCollection(req);
        const docRef = await collectionRef.add(data);

        res.json({ id: docRef.id, ...data });
    } catch (err) {
        console.error("Create Cashbook Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Update a transaction
// @route   PUT /api/v2/cashbook/:id
exports.updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const collectionRef = getTransactionsCollection(req);
        const docRef = collectionRef.doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Transaction not found" });
        }

        const updateData = {
            ...req.body
        };

        await docRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update Cashbook Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a transaction
// @route   DELETE /api/v2/cashbook/:id
exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const collectionRef = getTransactionsCollection(req);
        const docRef = collectionRef.doc(id);

        await docRef.delete();
        res.json({ msg: "Transaction deleted" });
    } catch (err) {
        console.error("Delete Cashbook Error:", err.message);
        res.status(500).send("Server Error");
    }
};
