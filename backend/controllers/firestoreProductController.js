const { db } = require('../config/firebase');
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');
const { checkAndAlertLowStock } = require('../utils/inventoryAlerts');

// @desc    Get all products
// @route   GET /api/v2/products
exports.getProducts = async (req, res) => {
    try {
        const includeSubusers = req.query.includeSubusers === 'true';
        const products = await fetchUnifiedData(req, 'products', { includeSubuserProducts: includeSubusers });
        res.json(products);
    } catch (err) {
        console.error("❌ Get Products Error:", err.message);
        res.status(500).send("Server Error: " + err.message);
    }
};

// @desc    Get a single product
// @route   GET /api/v2/products/:id
exports.getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const productsRef = getCollection(req, 'products');
        const doc = await productsRef.doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ msg: "Product not found" });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error("Get Product Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a product
// @route   POST /api/v2/products
exports.createProduct = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const productData = {
            ...req.body,
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString()
        };

        const productsRef = getCollection(req, 'products');
        const docRef = await productsRef.add(productData);

        res.json({ id: docRef.id, ...productData });
    } catch (err) {
        console.error("Create Product Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Update a product
// @route   PUT /api/v2/products/:id
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const productsRef = getCollection(req, 'products');
        const productDoc = productsRef.doc(id);

        const doc = await productDoc.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Product not found" });
        }

        const prevData = doc.data() || {};
        await productDoc.update(req.body);

        // Check for low stock alert if quantity was updated
        if (req.body.quantity !== undefined) {
            checkAndAlertLowStock({
                productDoc: { ...prevData, id },
                updatedQuantity: req.body.quantity,
                ownerId: req.user?.ownerId || prevData.ownerId,
                productDocRef: productDoc
            }).catch((err) => console.error('[updateProduct] Low stock check failed:', err.message));
        }

        res.json({ id, ...req.body });
    } catch (err) {
        console.error("Update Product Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a product
// @route   DELETE /api/v2/products/:id
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const productsRef = getCollection(req, 'products');
        const productDoc = productsRef.doc(id);

        await productDoc.delete();
        res.json({ msg: "Product deleted" });
    } catch (err) {
        console.error("Delete Product Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get product by barcode
// @route   GET /api/v2/products/barcode/:barcode
exports.getProductByBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;

        const productsRef = getCollection(req, 'products');

        const snapshot = await productsRef
            .where('imei1', '==', barcode)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ msg: "Product not found" });
        }

        const doc = snapshot.docs[0];

        res.json({ id: doc.id, ...doc.data() });

    } catch (err) {
        console.error("Barcode Search Error:", err.message);
        res.status(500).send("Server Error");
    }
};
