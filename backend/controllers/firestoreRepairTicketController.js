
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');
const { sendDirectText } = require('../utils/whatsappService');

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

        // Automated WhatsApp Notification on Ticket Creation
        if (repairTicketData.customerPhone) {
            const storeName = req.user?.businessName || req.user?.name || "SwordNex Mobile Service";
            const ticketShortId = docRef.id.slice(-6).toUpperCase();
            const device = [repairTicketData.deviceBrand, repairTicketData.deviceModel].filter(Boolean).join(' ') || 'your device';
            const message = `Hi ${repairTicketData.customerName || 'there'},

Thank you for bringing in your ${device}. We have received it safely at ${storeName} and our team will begin the inspection shortly.

Job ID: ${ticketShortId}
Issue noted: ${repairTicketData.issueDescription || 'General inspection and repair'}
Estimated cost: Rs. ${repairTicketData.estimatedCost || 0}
Expected ready by: ${repairTicketData.promisedDate || 'We will update you soon'}

We will keep you updated at every step. Feel free to call or message us anytime if you have questions.

- Team ${storeName}`;

            sendDirectText({ to: repairTicketData.customerPhone, text: message })
                .catch(err => console.error('[WhatsApp Repair Ticket Created Error]:', err.message));
        }

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

        const prevData = doc.data() || {};
        const updateData = { ...req.body, updatedAt: new Date().toISOString() };
        delete updateData._id;
        delete updateData.id;

        await repairTicketRef.update(updateData);

        // Automated WhatsApp lifecycle notification if status changed
        if (updateData.status && updateData.status !== prevData.status && (updateData.customerPhone || prevData.customerPhone)) {
            const customerPhone = updateData.customerPhone || prevData.customerPhone;
            const customerName = updateData.customerName || prevData.customerName || 'Customer';
            const deviceBrand = updateData.deviceBrand || prevData.deviceBrand || '';
            const deviceModel = updateData.deviceModel || prevData.deviceModel || '';
            const storeName = req.user?.businessName || req.user?.name || "SwordNex Mobile Service";
            const ticketShortId = id.slice(-6).toUpperCase();

            const device = [deviceBrand, deviceModel].filter(Boolean).join(' ') || 'your device';
            let statusMessage = '';
            if (updateData.status === 'In Progress') {
                statusMessage = `Hi ${customerName},

Just a quick update on your ${device} (Job ID: ${ticketShortId}).

Our technician has started working on it and the repair is now in progress. We are carefully diagnosing the issue and sourcing any parts needed.

We will let you know as soon as it is ready for pickup. Thank you for your patience!

- Team ${storeName}`;
            } else if (updateData.status === 'Completed') {
                const finalAmount = updateData.finalCost || prevData.finalCost || updateData.estimatedCost || prevData.estimatedCost || 0;
                statusMessage = `Hi ${customerName},

Great news! Your ${device} has been successfully repaired and is ready for pickup.

Job ID: ${ticketShortId}
Total amount: Rs. ${finalAmount}

You can collect it from our store during working hours. Please bring this message or quote your Job ID when you arrive.

Thank you for trusting ${storeName} with your device!

- Team ${storeName}`;
            } else if (updateData.status === 'Delivered') {
                statusMessage = `Hi ${customerName},

Your ${device} has been handed over to you successfully. We hope you are happy with the service!

If you notice anything or need any further help, please do not hesitate to reach out. We are always here for you.

Thank you for choosing ${storeName}. See you next time!

- Team ${storeName}`;
            }

            if (statusMessage) {
                sendDirectText({ to: customerPhone, text: statusMessage })
                    .catch(err => console.error('[WhatsApp Repair Status Update Error]:', err.message));
            }
        }

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

// @desc    Manually trigger or preview WhatsApp lifecycle alert for a ticket
// @route   POST /api/v2/repair-tickets/:id/send-whatsapp
exports.sendWhatsAppUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const repairTicketsRef = getRepairTicketsCollection(req);
        const doc = await repairTicketsRef.doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Repair ticket not found" });
        }

        const ticket = doc.data();
        const customerPhone = ticket.customerPhone;
        if (!customerPhone) {
            return res.status(400).json({ msg: "No customer phone number on this ticket" });
        }

        const customerName = ticket.customerName || 'Customer';
        const deviceBrand = ticket.deviceBrand || '';
        const deviceModel = ticket.deviceModel || '';
        const device = [deviceBrand, deviceModel].filter(Boolean).join(' ') || 'your device';
        const storeName = req.user?.businessName || req.user?.name || "SwordNex Mobile Service";
        const ticketShortId = id.slice(-6).toUpperCase();
        const status = req.body.status || ticket.status || 'Received';

        let message = '';
        if (status === 'Received') {
            message = `Hi ${customerName},

Thank you for bringing in your ${device}. We have received it safely at ${storeName} and our team will begin the inspection shortly.

Job ID: ${ticketShortId}
Issue noted: ${ticket.issueDescription || 'General inspection and repair'}
Estimated cost: Rs. ${ticket.estimatedCost || 0}
Expected ready by: ${ticket.promisedDate || 'We will update you soon'}

We will keep you updated at every step. Feel free to call or message us anytime if you have questions.

- Team ${storeName}`;
        } else if (status === 'In Progress') {
            message = `Hi ${customerName},

Just a quick update on your ${device} (Job ID: ${ticketShortId}).

Our technician has started working on it and the repair is now in progress. We are carefully diagnosing the issue and sourcing any parts needed.

We will let you know as soon as it is ready for pickup. Thank you for your patience!

- Team ${storeName}`;
        } else if (status === 'Completed') {
            const finalAmount = ticket.finalCost || ticket.estimatedCost || 0;
            message = `Hi ${customerName},

Great news! Your ${device} has been successfully repaired and is ready for pickup.

Job ID: ${ticketShortId}
Total amount: Rs. ${finalAmount}

You can collect it from our store during working hours. Please bring this message or quote your Job ID when you arrive.

Thank you for trusting ${storeName} with your device!

- Team ${storeName}`;
        } else if (status === 'Delivered') {
            message = `Hi ${customerName},

Your ${device} has been handed over to you successfully. We hope you are happy with the service!

If you notice anything or need any further help, please do not hesitate to reach out. We are always here for you.

Thank you for choosing ${storeName}. See you next time!

- Team ${storeName}`;
        } else {
            message = `Hi ${customerName},

This is an update regarding your ${device} at ${storeName} (Job ID: ${ticketShortId}).

Current status: ${status}

If you have any questions, feel free to reply to this message.

- Team ${storeName}`;
        }

        const waResult = await sendDirectText({ to: customerPhone, text: message });
        res.json({
            success: true,
            status,
            message,
            waResult,
            customerPhone
        });
    } catch (err) {
        console.error("Send WhatsApp Update Error:", err.message);
        res.status(500).json({ msg: err.message || "Failed to send WhatsApp message" });
    }
};
