const { db } = require('../config/firebase');
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');

// @desc    Get all customers
// @route   GET /api/v2/customers
exports.getCustomers = async (req, res) => {
    try {
        const customers = await fetchUnifiedData(req, 'customers');
        res.json(customers);
    } catch (err) {
        console.error("Get Customers Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a customer (with billing details if provided)
// @route   POST /api/v2/customers
exports.createCustomer = async (req, res) => {
    try {

        const {
            name,
            mobile,
            email,
            address,
            gstin, // Added GSTIN
            products, // Array of products bought: [{ name, quantity, gst, totalamount, ... }]
            paymentamount,
            changeamount,
            totalamount,
            date
        } = req.body;

        const { userId, role, ownerId } = req.user;
        // Basic Customer Info
        const customerData = {
            name: name || "",
            mobile: mobile || "",
            email: email || "",
            address: address || "",
            gstin: gstin || "", // Store GSTIN
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // If billing details are present, store them. 
        // We can store them as 'lastTransaction' or append to a 'history' subcollection/array.
        // Based on user request "store the customer details", we'll put them in the doc for now.
        if (products && products.length > 0) {
            customerData.lastTransaction = {
                products,
                paymentamount,
                changeamount,
                totalamount,
                date: date || new Date().toISOString()
            };
            // Also store these at root level if that's what user implied, 
            // but keeping them structured is better. 
            // We'll flatten them as requested to be safe:
            customerData.products = products;
            customerData.paymentamount = paymentamount;
            customerData.changeamount = changeamount;
            customerData.totalamount = totalamount;
            customerData.date = date || new Date().toISOString();
        }

        const customersRef = getCollection(req, 'customers');
        const docRef = await customersRef.add(customerData);

        res.json({ id: docRef.id, ...customerData });
    } catch (err) {
        console.error("Create Customer Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Update a customer
// @route   PUT /api/v2/customers/:id
exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customersRef = getCollection(req, 'customers');
        const customerRef = customersRef.doc(id);

        const doc = await customerRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Customer not found" });
        }

        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        await customerRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update Customer Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get a single customer
// @route   GET /api/v2/customers/:id
exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const customersRef = getCollection(req, 'customers');
        const customerRef = customersRef.doc(id);

        const doc = await customerRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Customer not found" });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error("Get Customer Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a customer
// @route   DELETE /api/v2/customers/:id
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customersRef = getCollection(req, 'customers');
        const customerRef = customersRef.doc(id);

        await customerRef.delete();
        res.json({ msg: "Customer deleted" });
    } catch (err) {
        console.error("Delete Customer Error:", err.message);
        res.status(500).send("Server Error");
    }
};

