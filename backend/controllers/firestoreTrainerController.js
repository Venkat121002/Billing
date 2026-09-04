
const { db } = require('../config/firebase');
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');

// Helper wrapper to get trainers collection reference
const getTrainersCollection = (req) => {
    return getCollection(req, 'trainers');
};

// @desc    Get all trainers
// @route   GET /api/v2/trainers
exports.getTrainers = async (req, res) => {
    try {
        const trainers = await fetchUnifiedData(req, 'trainers');
        res.json(trainers);
    } catch (err) {
        console.error("Get Trainers Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get a single trainer
// @route   GET /api/v2/trainers/:id
exports.getTrainerById = async (req, res) => {
    try {
        const { id } = req.params;
        const trainersRef = getTrainersCollection(req);
        const trainerRef = trainersRef.doc(id);

        const doc = await trainerRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Trainer not found" });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error("Get Trainer Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a trainer
// @route   POST /api/v2/trainers
exports.createTrainer = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const {
            name,
            mobile,
            email,
            address,
            specialization,
            salary,
            code, // Employee ID or Trainer Code
            pan,
            paymentMode
        } = req.body;

        const trainerData = {
            name: name || "",
            mobile: mobile || "",
            email: email || "",
            address: address || "",
            specialization: specialization || "",
            salary: salary || 0,
            code: code || "",
            pan: pan || "",
            paymentMode: paymentMode || "Cash",
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const trainersRef = getTrainersCollection(req);
        const docRef = await trainersRef.add(trainerData);

        res.json({ id: docRef.id, ...trainerData });
    } catch (err) {
        console.error("Create Trainer Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Update a trainer
// @route   PUT /api/v2/trainers/:id
exports.updateTrainer = async (req, res) => {
    try {
        const { id } = req.params;
        const trainersRef = getTrainersCollection(req);
        const trainerRef = trainersRef.doc(id);

        const doc = await trainerRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Trainer not found" });
        }

        const updateData = { ...req.body, updatedAt: new Date().toISOString() };

        await trainerRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update Trainer Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a trainer
// @route   DELETE /api/v2/trainers/:id
exports.deleteTrainer = async (req, res) => {
    try {
        const { id } = req.params;
        const trainersRef = getTrainersCollection(req);
        const trainerRef = trainersRef.doc(id);

        await trainerRef.delete();
        res.json({ msg: "Trainer deleted" });
    } catch (err) {
        console.error("Delete Trainer Error:", err.message);
        res.status(500).send("Server Error");
    }
};
