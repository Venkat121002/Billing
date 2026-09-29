
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');

// Helper wrapper to get repair tickets collection reference
const getRepairTicketsCollection = (req) => {
    return getCollection(req, 'repairtickets');
};

// @desc    Get all repair tickets
// @route   GET /api/v2/repair-tickets
exports.getRepairTickets = async (req, res) => {
    try {
        const repairTickets = await fetchUnifiedData(req, 'repairtickets');
        res.json(repairTickets);
    } catch (err) {
        console.error("Get Repair Tickets Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get a single repair ticket
// @route   GET /api/v2/repair-tickets/:id
exports.getRepairTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const repairTicketsRef = getRepairTicketsCollection(req);
        const repairTicketRef = repairTicketsRef.doc(id);

        const doc = await repairTicketRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Repair ticket not found" });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error("Get Repair Ticket Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a repair ticket
// @route   POST /api/v2/repair-tickets
exports.createRepairTicket = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const {
            ticketType,
            customerName,
            customerPhone,
            deviceBrand,
            deviceModel,
            imei,
            issueDescription,
            status,
            estimatedCost,
            finalCost,
            receivedDate,
            promisedDate,
            technician,
            notes
        } = req.body;

        const repairTicketData = {
            ticketType: ticketType || "repair",
            customerName: customerName || "",
            customerPhone: customerPhone || "",
            deviceBrand: deviceBrand || "",
            deviceModel: deviceModel || "",
            imei: imei || "",
            issueDescription: issueDescription || "",
            status: status || "Received",
            estimatedCost: estimatedCost || 0,
            finalCost: finalCost || 0,
            receivedDate: receivedDate || new Date().toISOString(),
            promisedDate: promisedDate || "",
            technician: technician || "",
            notes: notes || "",
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const repairTicketsRef = getRepairTicketsCollection(req);
        const docRef = await repairTicketsRef.add(repairTicketData);

        res.json({ id: docRef.id, ...repairTicketData });
    } catch (err) {
        console.error("Create Repair Ticket Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Update a repair ticket
// @route   PUT /api/v2/repair-tickets/:id
exports.updateRepairTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const repairTicketsRef = getRepairTicketsCollection(req);
        const repairTicketRef = repairTicketsRef.doc(id);

        const doc = await repairTicketRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Repair ticket not found" });
        }

        const updateData = { ...req.body, updatedAt: new Date().toISOString() };

        await repairTicketRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update Repair Ticket Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a repair ticket
// @route   DELETE /api/v2/repair-tickets/:id
exports.deleteRepairTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const repairTicketsRef = getRepairTicketsCollection(req);
        const repairTicketRef = repairTicketsRef.doc(id);

        await repairTicketRef.delete();
        res.json({ msg: "Repair ticket deleted" });
    } catch (err) {
        console.error("Delete Repair Ticket Error:", err.message);
        res.status(500).send("Server Error");
    }
};
