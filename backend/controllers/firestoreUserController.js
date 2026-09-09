const { db, admin } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Owner: OwnerModel, SubUser: SubUserModel } = require('../models/mongodb');

// Determine which database to use
const DB_TYPE = process.env.DB_TYPE || 'firestore';

// Helper: Generate Secure ID (matches firestoreAuthController.js)
const generateId = () => crypto.randomBytes(16).toString('hex');

// Plan limits for sub-users
const PLAN_LIMITS = {
    'Trial': 1,
    'Standard': 3,
    'Premium': 6,
    'Free': 0,
    'Basic': 2,
    'Pro': 10,
    'Enterprise': 50
};

// @desc    Create a sub-user
// @route   POST /api/v2/users/create
exports.createSubUser = async (req, res) => {
    try {
        const {
            firstName, lastName, email, password, branch, location,
            subbranchName, subbranchLocation, subbranchAddress, subbranchMobile,
            city, state, pincode, employee_id
        } = req.body;
        const { userId: ownerId } = req.user;
        const tenantId = process.env.TENANT_ID;

        if (!tenantId) {
            return res.status(500).json({ msg: "Server Configuration Error: TENANT_ID not set" });
        }

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ msg: "Please enter all required fields" });
        }

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            const owner = await OwnerModel.findOne({ userId: ownerId, tenantId });
            if (!owner) {
                return res.status(404).json({ msg: "Owner record not found" });
            }

            const rawPlan = owner.subscription?.plan || 'Free';
            const plan = rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1).toLowerCase();
            const limit = PLAN_LIMITS[plan] || 0;
            const additionalUsers = owner.additionalSubUsers || 0;
            const totalLimit = limit + additionalUsers;

            const currentCount = await SubUserModel.countDocuments({ ownerId, tenantId });

            if (currentCount >= totalLimit) {
                return res.status(403).json({
                    msg: "Sub-user limit reached for your plan",
                    limit: limit,
                    additional: additionalUsers,
                    total: totalLimit,
                    current: currentCount
                });
            }

            const existing = await SubUserModel.findOne({ email, tenantId });
            if (existing) {
                return res.status(400).json({ msg: "User with this email already exists" });
            }

            const subUserId = generateId();
            const hashedPassword = await bcrypt.hash(password, 10);

            const subUserData = {
                userId: subUserId,
                ownerId,
                tenantId,
                firstName,
                lastName,
                email,
                password: hashedPassword,
                role: 'subuser',
                branch: branch || '',
                location: location || '',
                subbranchName: subbranchName || '',
                subbranchLocation: subbranchLocation || '',
                subbranchAddress: subbranchAddress || '',
                subbranchMobile: subbranchMobile || '',
                city: city || '',
                state: state || '',
                pincode: pincode || '',
                employee_id: employee_id || '',
                createdAt: new Date().toISOString(),
                status: 'Active'
            };

            await SubUserModel.create(subUserData);

            const { password: _pw, ...safeData } = subUserData;
            return res.json({
                msg: "Sub-user created successfully",
                subUser: { id: subUserId, ...safeData }
            });
        }

        // === FIRESTORE MODE (Original Logic) ===
        // 1. Check Owner/Tenant Plan Limits
        const ownerDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(ownerId);
        const ownerDoc = await ownerDocRef.get();

        if (!ownerDoc.exists) {
            return res.status(404).json({ msg: "Owner record not found" });
        }

        const ownerData = ownerDoc.data();
        const rawPlan = ownerData.subscription?.plan || 'Free';
        const plan = rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1).toLowerCase();
        const limit = PLAN_LIMITS[plan] || 0;
        const additionalUsers = ownerData.additionalSubUsers || 0;
        const totalLimit = limit + additionalUsers;

        // 2. Count existing sub-users (Production Path: billingSoftware/{tenantId}/owner/{ownerId}/subuser)
        const subuserRef = ownerDocRef.collection('subuser');
        const snapshot = await subuserRef.get();
        const currentCount = snapshot.size;

        if (currentCount >= totalLimit) {
            return res.status(403).json({
                msg: "Sub-user limit reached for your plan",
                limit: limit,
                additional: additionalUsers,
                total: totalLimit,
                current: currentCount
            });
        }

        // 3. Create User in Firebase Auth (Tenant context)
        const tenantAuth = admin.auth().tenantManager().authForTenant(tenantId);

        let userRecord;
        try {
            userRecord = await tenantAuth.createUser({
                email: email,
                password: password,
                displayName: `${firstName} ${lastName}`,
                emailVerified: false
            });
        } catch (authError) {
            if (authError.code === 'auth/email-already-exists') {
                return res.status(400).json({ msg: "User with this email already exists" });
            }
            throw authError;
        }

        const subUserId = userRecord.uid;

        // 4. Save sub-user data in Firestore (Production Path and Fields)
        // Path: billingSoftware/{tenantId}/owner/{ownerId}/subuser/{subuserId}
        const subUserData = {
            firstName,
            lastName,
            email,
            role: 'subuser',
            ownerId: ownerId,           // This is the boss UID
            firebaseUid: subUserId,     // Sub-user's UID
            branch: branch || '',
            location: location || '',
            subbranchName: subbranchName || '',
            subbranchLocation: subbranchLocation || '',
            subbranchAddress: subbranchAddress || '',
            subbranchMobile: subbranchMobile || '',
            city: city || '',
            state: state || '',
            pincode: pincode || '',
            employee_id: employee_id || '',
            createdAt: new Date().toISOString(),
            status: 'Active'
        };

        await subuserRef.doc(subUserId).set(subUserData);

        res.json({
            msg: "Sub-user created successfully",
            subUser: {
                id: subUserId,
                ...subUserData
            }
        });

    } catch (err) {
        console.error("Create Sub-User Error:", err.message);
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
};

// @desc    Get all sub-users for the owner
// @route   GET /api/v2/users
exports.getSubUsers = async (req, res) => {
    try {
        const { userId: ownerId } = req.user;
        const tenantId = process.env.TENANT_ID;

        if (!tenantId) {
            return res.status(500).json({ msg: "Server Configuration Error" });
        }

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            const subUsers = await SubUserModel.find({ ownerId, tenantId }).sort({ createdAt: -1 });
            return res.json(subUsers.map(doc => {
                const data = doc.toObject();
                const id = data.userId;
                delete data._id;
                delete data.__v;
                delete data.password;
                return { id, ...data };
            }));
        }

        // === FIRESTORE MODE ===
        const subUsersRef = db.collection('SwordNexBillingSoftware')
            .doc(tenantId)
            .collection('owner')
            .doc(ownerId)
            .collection('subuser');

        const snapshot = await subUsersRef.orderBy('createdAt', 'desc').get();

        const subUsers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(subUsers);

    } catch (err) {
        console.error("Get Sub-Users Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
};

// @desc    Update a sub-user
// @route   PUT /api/v2/users/:id
exports.updateSubUser = async (req, res) => {
    try {
        const { id: subUserId } = req.params;
        const { userId: ownerId } = req.user;
        const tenantId = process.env.TENANT_ID;

        if (!tenantId) {
            return res.status(500).json({ msg: "Server Configuration Error" });
        }

        const {
            firstName, lastName, email, branch, location,
            subbranchName, subbranchLocation, subbranchAddress, subbranchMobile,
            city, state, pincode, employee_id, password
        } = req.body;

        const updates = {};
        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
        if (email) updates.email = email;
        if (branch !== undefined) updates.branch = branch;
        if (location !== undefined) updates.location = location;
        if (subbranchName !== undefined) updates.subbranchName = subbranchName;
        if (subbranchLocation !== undefined) updates.subbranchLocation = subbranchLocation;
        if (subbranchAddress !== undefined) updates.subbranchAddress = subbranchAddress;
        if (subbranchMobile !== undefined) updates.subbranchMobile = subbranchMobile;
        if (city !== undefined) updates.city = city;
        if (state !== undefined) updates.state = state;
        if (pincode !== undefined) updates.pincode = pincode;
        if (employee_id !== undefined) updates.employee_id = employee_id;

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            const subUser = await SubUserModel.findOne({ userId: subUserId, ownerId, tenantId });
            if (!subUser) {
                return res.status(404).json({ msg: "Sub-user not found" });
            }

            if (email && email !== subUser.email) {
                const existing = await SubUserModel.findOne({ email, tenantId, userId: { $ne: subUserId } });
                if (existing) {
                    return res.status(400).json({ msg: "Email already in use" });
                }
            }

            const mongoUpdates = { ...updates };
            if (password) {
                mongoUpdates.password = await bcrypt.hash(password, 10);
            }

            if (Object.keys(mongoUpdates).length > 0) {
                await SubUserModel.updateOne(
                    { userId: subUserId, ownerId, tenantId },
                    { $set: { ...mongoUpdates, updatedAt: new Date().toISOString() } }
                );
            }

            return res.json({ msg: "Sub-user updated successfully", subUser: { id: subUserId, ...updates } });
        }

        // === FIRESTORE MODE ===
        const subUserRef = db.collection('SwordNexBillingSoftware')
            .doc(tenantId)
            .collection('owner')
            .doc(ownerId)
            .collection('subuser')
            .doc(subUserId);

        const subUserDoc = await subUserRef.get();
        if (!subUserDoc.exists) {
            return res.status(404).json({ msg: "Sub-user not found" });
        }

        // 1. Update Firebase Auth if email or password changed
        if (email || password) {
            try {
                const tenantAuth = admin.auth().tenantManager().authForTenant(tenantId);
                const authUpdates = {};
                if (email) authUpdates.email = email;
                if (password) authUpdates.password = password;
                if (firstName && lastName) authUpdates.displayName = `${firstName} ${lastName}`;

                await tenantAuth.updateUser(subUserId, authUpdates);
            } catch (authError) {
                console.error("Firebase Auth Update Error:", authError.message);
                if (authError.code === 'auth/email-already-exists') {
                    return res.status(400).json({ msg: "Email already in use" });
                }
                // Continue with Firestore update even if Auth update fails (e.g. if we only update display name)
            }
        }

        // 2. Update Firestore
        if (Object.keys(updates).length > 0) {
            await subUserRef.update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
        }

        res.json({ msg: "Sub-user updated successfully", subUser: { id: subUserId, ...updates } });

    } catch (err) {
        console.error("Update Sub-User Error:", err.message);
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
};

// @desc    Delete a sub-user
// @route   DELETE /api/v2/users/:id
exports.deleteSubUser = async (req, res) => {
    try {
        const { id: subUserId } = req.params;
        const { userId: ownerId } = req.user;
        const tenantId = process.env.TENANT_ID;

        if (!tenantId) {
            return res.status(500).json({ msg: "Server Configuration Error" });
        }

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            const subUser = await SubUserModel.findOne({ userId: subUserId, ownerId, tenantId });
            if (!subUser) {
                return res.status(404).json({ msg: "Sub-user not found" });
            }
            await SubUserModel.deleteOne({ userId: subUserId, ownerId, tenantId });
            return res.json({ msg: "Sub-user deleted successfully" });
        }

        // === FIRESTORE MODE ===
        const subUserRef = db.collection('SwordNexBillingSoftware')
            .doc(tenantId)
            .collection('owner')
            .doc(ownerId)
            .collection('subuser')
            .doc(subUserId);

        const subUserDoc = await subUserRef.get();
        if (!subUserDoc.exists) {
            return res.status(404).json({ msg: "Sub-user not found" });
        }

        // 1. Delete from Firebase Auth
        try {
            const tenantAuth = admin.auth().tenantManager().authForTenant(tenantId);
            await tenantAuth.deleteUser(subUserId);
        } catch (authError) {
            console.error("Firebase Auth Delete Error (proceeding with Firestore delete):", authError.message);
        }

        // 2. Delete from Firestore
        await subUserRef.delete();

        res.json({ msg: "Sub-user deleted successfully" });

    } catch (err) {
        console.error("Delete Sub-User Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
};
