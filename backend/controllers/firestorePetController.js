
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');

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
        console.error("Get Pet Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a pet
// @route   POST /api/v2/pets
exports.createPet = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const {
            customerId,
            customerName,
            customerPhone,
            petName,
            species,
            breed,
            dob,
            lastVaccinationDate,
            notes
        } = req.body;

        const petData = {
            customerId: customerId || "",
            customerName: customerName || "",
            customerPhone: customerPhone || "",
            petName: petName || "",
            species: species || "",
            breed: breed || "",
            dob: dob || "",
            lastVaccinationDate: lastVaccinationDate || "",
            notes: notes || "",
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
        res.status(500).send("Server Error");
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
        res.status(500).send("Server Error");
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
        res.json({ msg: "Pet deleted" });
    } catch (err) {
        console.error("Delete Pet Error:", err.message);
        res.status(500).send("Server Error");
    }
};
