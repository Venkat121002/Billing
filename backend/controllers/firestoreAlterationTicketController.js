const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');
const { sendDirectText } = require('../utils/whatsappService');
const platformStore = require('../utils/platformStore');

const getAlterationTicketsCollection = (req) => {
    return getCollection(req, 'alterationtickets');
};

// @desc    Get all alteration tickets
// @route   GET /api/v2/alteration-tickets
exports.getAlterationTickets = async (req, res) => {
    try {
        const tickets = await fetchUnifiedData(req, 'alterationtickets');
        const sorted = (tickets || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        res.json(sorted);
    } catch (err) {
        console.error("Get Alteration Tickets Error:", err.message);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
};

// @desc    Get single alteration ticket
// @route   GET /api/v2/alteration-tickets/:id
exports.getAlterationTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const colRef = getAlterationTicketsCollection(req);
        const docRef = colRef.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ msg: "Alteration ticket not found" });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error("Get Alteration Ticket Error:", err.message);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
};

// @desc    Create an alteration ticket
// @route   POST /api/v2/alteration-tickets
exports.createAlterationTicket = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const effectiveOwnerId = role === 'owner' ? userId : (ownerId || userId);
        const tenantId = req.user.tenantId || effectiveOwnerId;

        const {
            customerName,
            customerPhone,
            garmentName,
            barcode,
            brand,
            color,
            size,
            alterationTypes,
            notes,
            promisedDate,
            tailorName,
            charge,
            isPaid,
            status,
            billId
        } = req.body;

        if (!customerName || !garmentName) {
            return res.status(400).json({ msg: "Customer name and garment description are required." });
        }

        // Generate clean sequential/random ticket number (e.g. ALT-8492)
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const ticketNo = req.body.ticketNo || `ALT-${randomNum}`;

        const ticketData = {
            ticketNo,
            customerName: String(customerName).trim(),
            customerPhone: String(customerPhone || '').trim(),
            garmentName: String(garmentName).trim(),
            barcode: barcode || '',
            brand: brand || '',
            color: color || '',
            size: size || '',
            alterationTypes: Array.isArray(alterationTypes) ? alterationTypes : (alterationTypes ? [alterationTypes] : ['Fitting / Alteration']),
            notes: notes || '',
            promisedDate: promisedDate || '',
            tailorName: tailorName || '',
            charge: Number(charge) || 0,
            isPaid: Boolean(isPaid),
            status: status || 'Received',
            billId: billId || '',
            ownerId: effectiveOwnerId,
            tenantId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const colRef = getAlterationTicketsCollection(req);
        const docRef = await colRef.add(ticketData);

        // Send initial WhatsApp confirmation if phone exists
        if (ticketData.customerPhone) {
            const owner = await platformStore.getOwner(effectiveOwnerId).catch(() => null);
            const storeName = owner?.companyDetails?.name || owner?.businessName || req.user.businessName || "Our Clothing Store";
            const text = `Hi ${ticketData.customerName},\n\nWe have received your garment "${ticketData.garmentName}" for alteration at ${storeName}.\n\nTicket No: ${ticketData.ticketNo}\nAlterations: ${ticketData.alterationTypes.join(', ')}\nPromised Date: ${ticketData.promisedDate || 'Soon'}\nCharge: Rs. ${ticketData.charge}\n\nWe will notify you immediately once your fitting is ready for pickup!\n- Team ${storeName}`;

            sendDirectText({ to: ticketData.customerPhone, text })
                .catch(err => console.log('[Alteration WhatsApp Note]:', err.message));
        }

        res.status(201).json({ id: docRef.id, ...ticketData });
    } catch (err) {
        console.error("Create Alteration Ticket Error:", err.message);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
};

// @desc    Update an alteration ticket (status transition, details)
// @route   PUT /api/v2/alteration-tickets/:id
exports.updateAlterationTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const colRef = getAlterationTicketsCollection(req);
        const docRef = colRef.doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Alteration ticket not found" });
        }

        const prevData = doc.data() || {};
        const updateData = { ...req.body, updatedAt: new Date().toISOString() };
        delete updateData._id;
        delete updateData.id;

        await docRef.update(updateData);

        // Automated WhatsApp Trigger when marked 'Ready for Pickup'
        const newStatus = updateData.status;
        const targetPhone = updateData.customerPhone || prevData.customerPhone;
        const customerName = updateData.customerName || prevData.customerName || 'Customer';
        const garment = updateData.garmentName || prevData.garmentName || 'garment';
        const ticketNo = updateData.ticketNo || prevData.ticketNo || id.slice(-6);

        if (newStatus === 'Ready for Pickup' && prevData.status !== 'Ready for Pickup' && targetPhone) {
            const effectiveOwnerId = req.user.role === 'owner' ? req.user.userId : (req.user.ownerId || req.user.userId);
            const owner = await platformStore.getOwner(effectiveOwnerId).catch(() => null);
            const storeName = owner?.companyDetails?.name || owner?.businessName || req.user.businessName || "Our Clothing Store";

            const readyText = `Hello ${customerName},\n\nGreat news! Your altered ${garment} (Ticket #${ticketNo}) is READY for pickup at ${storeName}! ✨\n\nPlease visit our store at your convenience to collect and try it on.\n\nThank you for shopping with us!\n- Team ${storeName}`;

            sendDirectText({ to: targetPhone, text: readyText })
                .then(() => console.log(`[WhatsApp] Ready alert sent to ${targetPhone} for ${ticketNo}`))
                .catch(err => console.error('[WhatsApp Ready Alert Error]:', err.message));
        }

        res.json({ id: doc.id, ...prevData, ...updateData });
    } catch (err) {
        console.error("Update Alteration Ticket Error:", err.message);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
};

// @desc    Explicit 1-Click WhatsApp Notification trigger
// @route   POST /api/v2/alteration-tickets/:id/notify
exports.notifyCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const colRef = getAlterationTicketsCollection(req);
        const docRef = colRef.doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Alteration ticket not found" });
        }

        const data = doc.data();
        if (!data.customerPhone) {
            return res.status(400).json({ msg: "Customer phone number is not available on this ticket" });
        }

        const effectiveOwnerId = req.user.role === 'owner' ? req.user.userId : (req.user.ownerId || req.user.userId);
        const owner = await platformStore.getOwner(effectiveOwnerId).catch(() => null);
        const storeName = owner?.companyDetails?.name || owner?.businessName || req.user.businessName || "Our Clothing Store";

        const text = `Hello ${data.customerName || 'Customer'},\n\nReminder: Your altered ${data.garmentName || 'garment'} (Ticket #${data.ticketNo}) is READY for pickup at ${storeName}.\n\nRemaining Balance: Rs. ${data.isPaid ? '0 (Paid)' : (data.charge || 0)}\n\nLooking forward to seeing you!\n- Team ${storeName}`;

        const waRes = await sendDirectText({ to: data.customerPhone, text });
        res.json({ success: true, msg: "WhatsApp notification dispatched successfully", waRes });
    } catch (err) {
        console.error("Notify Alteration Customer Error:", err.message);
        res.status(500).json({ msg: "Failed to dispatch WhatsApp alert", error: err.message });
    }
};

// @desc    Delete alteration ticket
// @route   DELETE /api/v2/alteration-tickets/:id
exports.deleteAlterationTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const colRef = getAlterationTicketsCollection(req);
        await colRef.doc(id).delete();
        res.json({ success: true, msg: "Alteration ticket deleted" });
    } catch (err) {
        console.error("Delete Alteration Ticket Error:", err.message);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
};
