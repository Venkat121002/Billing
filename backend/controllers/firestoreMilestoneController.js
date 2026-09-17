
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');

// Helper wrapper to get milestones collection reference
const getMilestonesCollection = (req) => {
    return getCollection(req, 'milestones');
};

// @desc    Get all milestones
// @route   GET /api/v2/milestones
exports.getMilestones = async (req, res) => {
    try {
        const milestones = await fetchUnifiedData(req, 'milestones');
        res.json(milestones);
    } catch (err) {
        console.error("Get Milestones Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get a single milestone
// @route   GET /api/v2/milestones/:id
exports.getMilestoneById = async (req, res) => {
    try {
        const { id } = req.params;
        const milestonesRef = getMilestonesCollection(req);
        const milestoneRef = milestonesRef.doc(id);

        const doc = await milestoneRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Milestone not found" });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error("Get Milestone Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a milestone
// @route   POST /api/v2/milestones
exports.createMilestone = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const {
            clientId,
            clientName,
            title,
            description,
            dueDate,
            status,
            amount
        } = req.body;

        const milestoneData = {
            clientId: clientId || "",
            clientName: clientName || "",
            title: title || "",
            description: description || "",
            dueDate: dueDate || "",
            status: status || "Not Started",
            amount: amount || 0,
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const milestonesRef = getMilestonesCollection(req);
        const docRef = await milestonesRef.add(milestoneData);

        res.json({ id: docRef.id, ...milestoneData });
    } catch (err) {
        console.error("Create Milestone Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Update a milestone
// @route   PUT /api/v2/milestones/:id
exports.updateMilestone = async (req, res) => {
    try {
        const { id } = req.params;
        const milestonesRef = getMilestonesCollection(req);
        const milestoneRef = milestonesRef.doc(id);

        const doc = await milestoneRef.get();
        if (!doc.exists) {
            return res.status(404).json({ msg: "Milestone not found" });
        }

        const updateData = { ...req.body, updatedAt: new Date().toISOString() };

        await milestoneRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (err) {
        console.error("Update Milestone Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a milestone
// @route   DELETE /api/v2/milestones/:id
exports.deleteMilestone = async (req, res) => {
    try {
        const { id } = req.params;
        const milestonesRef = getMilestonesCollection(req);
        const milestoneRef = milestonesRef.doc(id);

        await milestoneRef.delete();
        res.json({ msg: "Milestone deleted" });
    } catch (err) {
        console.error("Delete Milestone Error:", err.message);
        res.status(500).send("Server Error");
    }
};
