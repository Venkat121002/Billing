const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');
const { sendDirectText } = require('../utils/whatsappService');

// Helper wrapper to get pet services collection reference
const getPetServicesCollection = (req) => {
    return getCollection(req, 'pet_services');
};

// @desc    Get all pet service tickets
// @route   GET /api/v2/pet-services
exports.getPetServices = async (req, res) => {
    try {
        const services = await fetchUnifiedData(req, 'pet_services');
        res.json(services);
    } catch (err) {
        console.error("Get Pet Services Error:", err.message);
        res.status(500).send("Server Error: " + err.message);
    }
};

// @desc    Get single pet service ticket
// @route   GET /api/v2/pet-services/:id
exports.getPetServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const ref = getPetServicesCollection(req).doc(id);
        const doc = await ref.get();
        if (!doc.exists) return res.status(404).json({ msg: "Service ticket not found" });
        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error("Get Pet Service By ID Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create pet service ticket
// @route   POST /api/v2/pet-services
exports.createPetService = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const {
            petId,
            petName,
            species,
            breed,
            customerName,
            customerPhone,
            serviceType,
            status,
            cost,
            groomer,
            specialInstructions,
            scheduledDate,
            notes
        } = req.body;

        const effectiveStatus = status || 'Checked-In';
        const serviceData = {
            petId: petId || '',
            petName: petName || 'Pet',
            species: species || 'Dog',
            breed: breed || '',
            customerName: customerName || 'Pet Parent',
            customerPhone: customerPhone || '',
            serviceType: serviceType || 'Full Grooming & Spa',
            status: effectiveStatus,
            cost: Number(cost) || 0,
            groomer: groomer || '',
            specialInstructions: specialInstructions || '',
            scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
            readyAt: '',
            completedAt: '',
            notes: notes || '',
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const ref = getPetServicesCollection(req);
        const docRef = await ref.add(serviceData);
        const newTicket = { id: docRef.id, ...serviceData };

        // Auto send check-in WhatsApp notification if phone provided
        if (serviceData.customerPhone) {
            try {
                const storeName = req.user?.businessName || req.user?.name || "Our Pet Care Team";
                const shortId = docRef.id.slice(-6).toUpperCase();
                const checkInMsg = `Hi ${serviceData.customerName},

We have checked in ${serviceData.petName} for ${serviceData.serviceType} at ${storeName}. Our groomers are taking wonderful care of your pet!

Ticket ID: ${shortId}
Estimated Amount: Rs. ${serviceData.cost}

We will send you another update the moment ${serviceData.petName} is fresh, groomed, and ready for pickup.

- Team ${storeName}`;

                await sendDirectText({ to: serviceData.customerPhone, text: checkInMsg });
            } catch (waErr) {
                console.warn("[pet-service] Check-in WhatsApp notification failed:", waErr.message);
            }
        }

        res.json(newTicket);
    } catch (err) {
        console.error("Create Pet Service Error:", err.message);
        res.status(500).send("Server Error: " + err.message);
    }
};

// @desc    Update pet service ticket (status, cost, notes)
// @route   PUT /api/v2/pet-services/:id
exports.updatePetService = async (req, res) => {
    try {
        const { id } = req.params;
        const ref = getPetServicesCollection(req).doc(id);
        const doc = await ref.get();
        if (!doc.exists) return res.status(404).json({ msg: "Service ticket not found" });

        const prevData = doc.data();
        const updateData = { ...req.body, updatedAt: new Date().toISOString() };

        if (updateData.status === 'Ready-For-Pickup' && !prevData.readyAt) {
            updateData.readyAt = new Date().toISOString();
        }
        if (updateData.status === 'Completed' && !prevData.completedAt) {
            updateData.completedAt = new Date().toISOString();
        }

        await ref.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update Pet Service Error:", err.message);
        res.status(500).send("Server Error: " + err.message);
    }
};

// @desc    Delete pet service ticket
// @route   DELETE /api/v2/pet-services/:id
exports.deletePetService = async (req, res) => {
    try {
        const { id } = req.params;
        const ref = getPetServicesCollection(req).doc(id);
        await ref.delete();
        res.json({ msg: "Service ticket deleted" });
    } catch (err) {
        console.error("Delete Pet Service Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Send WhatsApp status update for pet service ticket
// @route   POST /api/v2/pet-services/:id/send-status-whatsapp
exports.sendStatusWhatsApp = async (req, res) => {
    try {
        const { id } = req.params;
        const { status: targetStatus, customMessage } = req.body;

        const ref = getPetServicesCollection(req).doc(id);
        const doc = await ref.get();
        if (!doc.exists) return res.status(404).json({ msg: "Service ticket not found" });

        const ticket = doc.data();
        const status = targetStatus || ticket.status || 'Checked-In';
        const customerPhone = ticket.customerPhone;
        const customerName = ticket.customerName || "Pet Parent";
        const petName = ticket.petName || "your pet";
        const serviceType = ticket.serviceType || "Grooming & Spa";
        const storeName = req.user?.businessName || req.user?.name || "Our Pet Care Team";
        const shortId = id.slice(-6).toUpperCase();
        const cost = ticket.cost || 0;

        let message = customMessage;

        if (!message) {
            if (status === 'Checked-In' || status === 'Booked') {
                message = `Hi ${customerName},

We have checked in ${petName} for ${serviceType} at ${storeName}. Our groomers will take great care of your pet!

Ticket ID: ${shortId}
Estimated Amount: Rs. ${cost}

We will notify you the moment ${petName} is ready for pickup.

- Team ${storeName}`;
            } else if (status === 'In-Progress') {
                message = `Hi ${customerName},

Your pet ${petName} is currently in our grooming session (${serviceType}) at ${storeName}. 

Everything is going smoothly and we will let you know as soon as the session is complete!

- Team ${storeName}`;
            } else if (status === 'Ready-For-Pickup') {
                message = `Hi ${customerName},

Wonderful news! ${petName} is fresh, clean, smelling great, and ready for pickup at ${storeName}!

Ticket ID: ${shortId}
Total Amount: Rs. ${cost}

You can collect your pet anytime during our store hours. Please quote Ticket ID ${shortId} when you arrive.

Thank you for trusting ${storeName}!

- Team ${storeName}`;
            } else if (status === 'Completed') {
                message = `Hi ${customerName},

Thank you for bringing ${petName} to ${storeName} for ${serviceType}!

We hope ${petName} enjoyed the session. We look forward to seeing you both again soon!

- Team ${storeName}`;
            } else {
                message = `Hi ${customerName},

This is an update regarding ${petName}'s service (${serviceType}) at ${storeName}.

Current status: ${status}

If you have any questions, feel free to reply to this message.

- Team ${storeName}`;
            }
        }

        let waResult = null;
        if (customerPhone) {
            try {
                waResult = await sendDirectText({ to: customerPhone, text: message });
            } catch (err) {
                console.warn("[pet-service] Direct WhatsApp send error:", err.message);
            }
        }

        const cleanPhone = String(customerPhone || '').replace(/\D/g, '');
        const webPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const whatsappWebUrl = customerPhone
            ? `https://wa.me/${webPhone}?text=${encodeURIComponent(message)}`
            : null;

        res.json({
            success: true,
            sent: !!waResult?.messageId,
            messageId: waResult?.messageId || null,
            mode: waResult?.mode || 'web-link',
            whatsappWebUrl,
            message
        });
    } catch (err) {
        console.error("Send Status WhatsApp Error:", err.message);
        res.status(500).json({ msg: "Failed to send WhatsApp message: " + err.message });
    }
};
