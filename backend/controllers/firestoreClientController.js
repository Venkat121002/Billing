
const { db } = require('../config/firebase');
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');

// @desc    Get all clients
// @route   GET /api/v2/clients
exports.getClients = async (req, res) => {
    try {
        const clients = await fetchUnifiedData(req, 'clients');
        res.json(clients);
    } catch (err) {
        console.error("Get Clients Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a client (with billing/service details if provided)
// @route   POST /api/v2/clients
exports.createClient = async (req, res) => {
    try {

        const {
            // Client Information
            companyName,
            contactPerson,
            email,
            mobile,
            companyWebsite,
            industry,
            address,

            // Project Overview
            projectName,
            projectType,
            communication,
            budget,
            deadline,

            // Current Setup
            existingWebsite,
            domainStatus,
            hostingStatus,

            // Requirements
            requirements,
            referenceWebsites,
            notes
        } = req.body;

        const { userId, role, ownerId } = req.user;

        const clientData = {
            // Client Information
            name: companyName, // Map for UI consistency (inventory expects 'name')
            companyName: companyName,
            contactPerson: contactPerson || "",
            email: email || "",
            mobile: mobile || "",
            phone: mobile || "", // Backward compatibility
            companyWebsite: companyWebsite || "",
            industry: industry || "",
            address: address || "",

            // Project Overview
            projectName: projectName || "",
            projectType: projectType || "",
            communication: communication || "",
            budget: budget || "",
            deadline: deadline || null,

            // Current Setup
            existingWebsite: existingWebsite || "",
            domainStatus: domainStatus === true, // Ensure boolean
            hostingStatus: hostingStatus === true, // Ensure boolean

            // Requirements (Save as strings to match frontend input)
            requirements: requirements || "",
            referenceWebsites: referenceWebsites || "",
            notes: notes || "",

            // System Fields
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

    const clientsRef = getCollection(req, 'clients');
    const docRef = await clientsRef.add(clientData);

    res.json({ id: docRef.id, ...clientData });
} catch (err) {
    console.error("Create Client Error:", err.message);
    res.status(500).send("Server Error");
}
};

// @desc    Update a client
// @route   PUT /api/v2/clients/:id
exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const clientsRef = getCollection(req, 'clients');
        const clientRef = clientsRef.doc(id);

        const doc = await clientRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Client not found" });
        }

        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        await clientRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update Client Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get a single client
// @route   GET /api/v2/clients/:id
exports.getClientById = async (req, res) => {
    try {
        const { id } = req.params;
        const clientsRef = getCollection(req, 'clients');
        const clientRef = clientsRef.doc(id);

        const doc = await clientRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Client not found" });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error("Get Client Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a client
// @route   DELETE /api/v2/clients/:id
exports.deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        const clientsRef = getCollection(req, 'clients');
        const clientRef = clientsRef.doc(id);

        await clientRef.delete();
        res.json({ msg: "Client deleted" });
    } catch (err) {
        console.error("Delete Client Error:", err.message);
        res.status(500).send("Server Error");
    }
};
