
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');

// Helper
const getSalesmenCollection = (req) => {
    return getCollection(req, 'salesmen');
};


// 🔹 GET ALL SALESMEN
exports.getSalesmen = async (req, res) => {
    try {
        const salesmen = await fetchUnifiedData(req, 'salesmen');
        res.json(salesmen);
    } catch (err) {
        console.error("Get Salesmen Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
};


// 🔹 CREATE SALESMAN (FIXED)
exports.createSalesman = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;

        const {
            salesmanId,
            name,
            mobile,
            role: salesmanRole,
            status
        } = req.body;

        // ✅ VALIDATION
        if (!salesmanId || !name) {
            return res.status(400).json({
                msg: "Salesman ID and Name are required"
            });
        }

        const salesmenRef = getSalesmenCollection(req);

        // ✅ CHECK DUPLICATE
        const existingDoc = await salesmenRef.doc(salesmanId).get();
        if (existingDoc.exists) {
            return res.status(409).json({
                msg: `Salesman ID '${salesmanId}' already exists`
            });
        }

        // ✅ DATA
        const salesmanData = {
            salesmanId,
            name,
            mobile: mobile || "",
            role: salesmanRole || "Salesman",
            status: status || "Active",
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // ✅ IMPORTANT FIX → USE DOC(salesmanId)
        await salesmenRef.doc(salesmanId).set(salesmanData);

        res.status(201).json({
            msg: "Salesman created successfully",
            data: salesmanData
        });

    } catch (err) {
        console.error("Create Salesman Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
};


// 🔹 UPDATE SALESMAN
exports.updateSalesman = async (req, res) => {
    try {
        const { id } = req.params;

        const salesmenRef = getSalesmenCollection(req);
        const salesmanRef = salesmenRef.doc(id);

        const doc = await salesmanRef.get();

        if (!doc.exists) {
            return res.status(404).json({ msg: "Salesman not found" });
        }

        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        await salesmanRef.update(updateData);

        res.json({
            msg: "Salesman updated",
            id,
            ...updateData
        });

    } catch (err) {
        console.error("Update Salesman Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
};


// 🔹 DELETE SALESMAN
exports.deleteSalesman = async (req, res) => {
    try {
        const { id } = req.params;

        const salesmenRef = getSalesmenCollection(req);

        const doc = await salesmenRef.doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Salesman not found" });
        }

        await salesmenRef.doc(id).delete();

        res.json({ msg: "Salesman deleted successfully" });

    } catch (err) {
        console.error("Delete Salesman Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
};
