const { db } = require('../config/firebase');

const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');

// Helper wrapper to get suppliers collection reference
const getSuppliersCollection = (req) => {
    return getCollection(req, 'suppliers');
};

// @desc    Get all suppliers
// @route   GET /api/v2/suppliers
exports.getSuppliers = async (req, res) => {
    try {
        const suppliers = await fetchUnifiedData(req, 'suppliers');
        res.json(suppliers);
    } catch (err) {
        console.error("Get Suppliers Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a supplier
// @route   POST /api/v2/suppliers
exports.createSupplier = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const {
            name,
            company,
            code,
            gst,
            pan,
            mobile,
            email,
            address,
            paymentMode
        } = req.body;

        const supplierData = {
            name: name || "",
            company: company || "",
            code: code || "",
            gst: gst || "",
            pan: pan || "",
            mobile: mobile || "",
            email: email || "",
            address: address || "",
            paymentMode: paymentMode || "Cash",
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const suppliersRef = getSuppliersCollection(req);
        const docRef = await suppliersRef.add(supplierData);

        res.json({ id: docRef.id, ...supplierData });
    } catch (err) {
        console.error("Create Supplier Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Update a supplier
// @route   PUT /api/v2/suppliers/:id
exports.updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const suppliersRef = getSuppliersCollection(req);
        const supplierRef = suppliersRef.doc(id);

        const doc = await supplierRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Supplier not found" });
        }

        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        await supplierRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update Supplier Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a supplier
// @route   DELETE /api/v2/suppliers/:id
exports.deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const suppliersRef = getSuppliersCollection(req);
        const supplierRef = suppliersRef.doc(id);

        await supplierRef.delete();
        res.json({ msg: "Supplier deleted" });
    } catch (err) {
        console.error("Delete Supplier Error:", err.message);
        res.status(500).send("Server Error");
    }
};
