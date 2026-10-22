const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');
const { manualMessage, storeNameFor } = require('../utils/customerWhatsApp');
const crypto = require('crypto');
const { db } = require('../config/firebase');
const { Pet } = require('../models/mongodb');

// Helper wrapper to get pets collection reference
const getPetsCollection = (req) => {
    return getCollection(req, 'pets');
};

// @desc    Get all pets
// @route   GET /api/v2/pets
exports.getPets = async (req, res) => {
    try {
        const pets = await fetchUnifiedData(req, 'pets');
        res.json(pets);
    } catch (err) {
        console.error("Get Pets Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get a single pet
// @route   GET /api/v2/pets/:id
exports.getPetById = async (req, res) => {
    try {
        const { id } = req.params;
        const petsRef = getPetsCollection(req);
        const petRef = petsRef.doc(id);

        const doc = await petRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Pet not found" });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error("Get Pet By ID Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a pet
// @route   POST /api/v2/pets
exports.createPet = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const body = req.body;

        const petData = {
            customerId: body.customerId || "",
            customerName: body.customerName || "",
            customerPhone: body.customerPhone || "",
            petName: body.petName || "",
            species: body.species || "Dog",
            breed: body.breed || "",
            gender: body.gender || "Male",
            microchipId: body.microchipId || "",
            weightKg: body.weightKg || "",
            dob: body.dob || "",
            // Vaccination & Deworming
            vaccineName: body.vaccineName || "Rabies Booster",
            lastVaccinationDate: body.lastVaccinationDate || "",
            nextVaccineDate: body.nextVaccineDate || "",
            dewormingDate: body.dewormingDate || "",
            nextDewormingDate: body.nextDewormingDate || "",
            vaccineHistory: Array.isArray(body.vaccineHistory) ? body.vaccineHistory : [],
            // Food & Refill Automation
            foodBrand: body.foodBrand || "",
            packSizeKg: Number(body.packSizeKg) || 0,
            dailyConsumptionGrams: Number(body.dailyConsumptionGrams) || 0,
            lastFoodPurchaseDate: body.lastFoodPurchaseDate || "",
            nextFoodRefillDate: body.nextFoodRefillDate || "",
            notes: body.notes || "",
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const petsRef = getPetsCollection(req);
        const docRef = await petsRef.add(petData);

        res.json({ id: docRef.id, ...petData });
    } catch (err) {
        console.error("Create Pet Error:", err.message);
        res.status(500).send("Server Error: " + err.message);
    }
};

// @desc    Update a pet
// @route   PUT /api/v2/pets/:id
exports.updatePet = async (req, res) => {
    try {
        const { id } = req.params;
        const petsRef = getPetsCollection(req);
        const petRef = petsRef.doc(id);

        const doc = await petRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Pet not found" });
        }

        const updateData = { ...req.body, updatedAt: new Date().toISOString() };
        await petRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update Pet Error:", err.message);
        res.status(500).send("Server Error: " + err.message);
    }
};

// @desc    Delete a pet
// @route   DELETE /api/v2/pets/:id
exports.deletePet = async (req, res) => {
    try {
        const { id } = req.params;
        const petsRef = getPetsCollection(req);
        const petRef = petsRef.doc(id);

        await petRef.delete();
        res.json({ msg: "Pet deleted successfully" });
    } catch (err) {
        console.error("Delete Pet Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get pets with due vaccination, deworming, or food refill reminders
// @route   GET /api/v2/pets/reminders/due
exports.getDueReminders = async (req, res) => {
    try {
        const pets = await fetchUnifiedData(req, 'pets');
        const today = new Date();
        const next7Days = new Date();
        next7Days.setDate(today.getDate() + 7);

        const isDateDue = (dateStr) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return false;
            return d <= next7Days; // overdue or within next 7 days
        };

        const vaccineDue = [];
        const dewormingDue = [];
        const refillDue = [];

        pets.forEach(pet => {
            if (isDateDue(pet.nextVaccineDate)) {
                vaccineDue.push(pet);
            }
            if (isDateDue(pet.nextDewormingDate)) {
                dewormingDue.push(pet);
            }
            if (isDateDue(pet.nextFoodRefillDate)) {
                refillDue.push(pet);
            }
        });

        res.json({
            vaccineDue,
            dewormingDue,
            refillDue,
            totalDue: vaccineDue.length + dewormingDue.length + refillDue.length
        });
    } catch (err) {
        console.error("Get Due Reminders Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// Helper: prepare a WhatsApp reminder for the store to send from its own
// WhatsApp (no platform send: see utils/customerWhatsApp.js).
async function sendPetWhatsApp(req, pet, defaultMessage, customMessage, phoneOverride) {
    const message = typeof customMessage === 'string' && customMessage.trim()
        ? customMessage.slice(0, 2000)
        : defaultMessage;
    const phone = phoneOverride || req.body?.phone || pet.customerPhone;

    if (!phone) {
        return { sent: false, reason: "No phone number on file for pet owner", message };
    }

    const result = manualMessage(phone, message);
    // whatsappWebUrl / sent kept for the existing Pets screen.
    return { ...result, sent: false, whatsappWebUrl: result.whatsappLink, phone };
}

// @desc    Send automated WhatsApp vaccination reminder
// @route   POST /api/v2/pets/:id/send-vaccine-reminder
exports.sendVaccineReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const { customMessage, phone } = req.body;

        const petsRef = getPetsCollection(req);
        const petDoc = await petsRef.doc(id).get();
        if (!petDoc.exists) return res.status(404).json({ msg: "Pet not found" });

        const pet = petDoc.data();
        const storeName = await storeNameFor(req);
        const customerName = pet.customerName || "Pet Parent";
        const petName = pet.petName || "your pet";
        const vaccine = pet.vaccineName || "Annual Vaccination";
        const dueDate = pet.nextVaccineDate || "this week";

        const defaultMessage = `Hi ${customerName},

This is a friendly reminder from ${storeName} that ${petName}'s ${vaccine} is due on ${dueDate}.

Staying on schedule keeps ${petName} healthy and protected against critical diseases. Feel free to reply to this message to book a quick vaccination appointment!

- Team ${storeName}`;

        const result = await sendPetWhatsApp(req, pet, defaultMessage, customMessage, phone);
        if (phone && !pet.customerPhone) {
            try {
                await getPetsCollection(req).doc(id).update({ customerPhone: phone });
            } catch { /* ignore */ }
        }
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Send Vaccine Reminder Error:", err.message);
        res.status(500).json({ msg: "Failed to send reminder: " + err.message });
    }
};

// @desc    Send automated WhatsApp deworming reminder
// @route   POST /api/v2/pets/:id/send-deworming-reminder
exports.sendDewormingReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const { customMessage, phone } = req.body;

        const petsRef = getPetsCollection(req);
        const petDoc = await petsRef.doc(id).get();
        if (!petDoc.exists) return res.status(404).json({ msg: "Pet not found" });

        const pet = petDoc.data();
        const storeName = await storeNameFor(req);
        const customerName = pet.customerName || "Pet Parent";
        const petName = pet.petName || "your pet";
        const dueDate = pet.nextDewormingDate || "this week";

        const defaultMessage = `Hi ${customerName},

Just a gentle reminder from ${storeName} that ${petName}'s scheduled deworming is due on ${dueDate}.

Routine deworming prevents digestive issues and keeps your pet active and playful. Drop by our store or reply here to arrange the deworming dose!

- Team ${storeName}`;

        const result = await sendPetWhatsApp(req, pet, defaultMessage, customMessage, phone);
        if (phone && !pet.customerPhone) {
            try {
                await getPetsCollection(req).doc(id).update({ customerPhone: phone });
            } catch { /* ignore */ }
        }
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Send Deworming Reminder Error:", err.message);
        res.status(500).json({ msg: "Failed to send reminder: " + err.message });
    }
};

// @desc    Send automated WhatsApp food refill reminder
// @route   POST /api/v2/pets/:id/send-refill-reminder
exports.sendFoodRefillReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const { customMessage, phone } = req.body;

        const petsRef = getPetsCollection(req);
        const petDoc = await petsRef.doc(id).get();
        if (!petDoc.exists) return res.status(404).json({ msg: "Pet not found" });

        const pet = petDoc.data();
        const storeName = await storeNameFor(req);
        const customerName = pet.customerName || "Pet Parent";
        const petName = pet.petName || "your pet";
        const food = pet.foodBrand ? `${pet.foodBrand}${pet.packSizeKg ? ` (${pet.packSizeKg}kg)` : ''}` : "pet food";
        const refillDate = pet.nextFoodRefillDate || "soon";

        const defaultMessage = `Hi ${customerName},

Hope ${petName} is doing great! Based on ${petName}'s feeding schedule, your supply of ${food} from ${storeName} is likely running low around ${refillDate}.

Would you like us to reserve a fresh bag for pickup or arrange home delivery? Just reply with YES and we'll take care of it for you!

- Team ${storeName}`;

        const result = await sendPetWhatsApp(req, pet, defaultMessage, customMessage, phone);
        if (phone && !pet.customerPhone) {
            try {
                await getPetsCollection(req).doc(id).update({ customerPhone: phone });
            } catch { /* ignore */ }
        }
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Send Food Refill Reminder Error:", err.message);
        res.status(500).json({ msg: "Failed to send refill reminder: " + err.message });
    }
};

// @desc    Create (or return) the pet's shareable passport token. Staff only.
// @route   POST /api/v2/pets/:id/passport-link
exports.createPassportLink = async (req, res) => {
    try {
        const ref = getPetsCollection(req).doc(req.params.id);
        const doc = await ref.get();
        if (!doc.exists) return res.status(404).json({ msg: "Pet not found" });

        let token = doc.data().passportToken;
        if (!token) {
            token = crypto.randomBytes(18).toString('base64url');
            await ref.update({ passportToken: token });
        }
        res.json({ token });
    } catch (err) {
        console.error("Create Passport Link Error:", err.message);
        res.status(500).json({ msg: "Could not create the passport link" });
    }
};

// Find a pet by its passport token, across every store (the token is the only
// credential, like a dues pay link). MongoDB or Firestore.
async function findPetByPassportToken(token) {
    if (!token || token.length < 20) return null;
    if ((process.env.DB_TYPE || 'mongodb') === 'mongodb') {
        return Pet.findOne({ passportToken: String(token) }).lean();
    }
    const prefix = `SwordNexBillingSoftware/${process.env.TENANT_ID}/`;
    const snap = await db.collectionGroup('pets').where('passportToken', '==', String(token)).limit(5).get();
    const hit = snap.docs.find((d) => d.ref.path.startsWith(prefix));
    return hit ? { _id: hit.id, ...hit.data() } : null;
}

// @desc    Public/Sharable Pet Passport profile (No login required).
//          Looked up by an unguessable passport token, never by record id, and
//          without the owner's phone number or private notes.
// @route   GET /api/v2/pets/public-passport/:token
exports.getPublicPassport = async (req, res) => {
    try {
        const pet = await findPetByPassportToken(req.params.id);
        if (!pet) {
            return res.status(404).json({ msg: "Pet record not found" });
        }

        res.json({
            id: req.params.id,
            petName: pet.petName || "Unnamed Pet",
            species: pet.species || "Dog",
            breed: pet.breed || "Mixed Breed",
            gender: pet.gender || "Male",
            dob: pet.dob || "",
            weightKg: pet.weightKg || "",
            microchipId: pet.microchipId || "",
            customerName: String(pet.customerName || "Pet Parent").split(' ')[0],
            vaccineName: pet.vaccineName || "Rabies Booster",
            lastVaccinationDate: pet.lastVaccinationDate || "",
            nextVaccineDate: pet.nextVaccineDate || "",
            dewormingDate: pet.dewormingDate || "",
            nextDewormingDate: pet.nextDewormingDate || "",
            vaccineHistory: pet.vaccineHistory || [],
            foodBrand: pet.foodBrand || "",
            updatedAt: pet.updatedAt || pet.createdAt
        });
    } catch (err) {
        console.error("Get Public Passport Error:", err.message);
        res.status(500).json({ msg: "Error fetching pet passport" });
    }
};
