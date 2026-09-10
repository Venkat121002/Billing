
const { db, admin } = require('../config/firebase');
const axios = require('axios');
const { sendEmail } = require('../utils/emailService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB models
const { Owner: OwnerModel, SubUser: SubUserModel } = require('../models/mongodb');

// Determine which database to use
const DB_TYPE = process.env.DB_TYPE || 'mongodb';

// Helper: Generate Secure ID
const generateId = () => {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
};

// @desc    Register Owner & Create Tenant
// @route   POST /api/v2/auth/register
exports.register = async (req, res) => {
    const {
        businessName, businessType, industry, subIndustry, employees,
        firstName, lastName, email, mobile, password,
        street, city, state, pincode, country,
        gstin, pan, plan
    } = req.body;

    if (!businessName || !email || !firstName || !password) {
        return res.status(400).json({ msg: "Please enter required fields" });
    }

    const tenantId = process.env.TENANT_ID;
    if (!tenantId) {
        return res.status(500).json({ msg: "Server Configuration Error: TENANT_ID not set" });
    }

    try {
        let userId;

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            const existingUser = await OwnerModel.findOne({ email, tenantId });
            if (existingUser) {
                return res.status(400).json({ msg: "User already exists" });
            }

            userId = generateId();
            const hashedPassword = await bcrypt.hash(password, 10);

            const ownerData = {
                userId,
                tenantId,
                firstName,
                lastName,
                email,
                mobile,
                password: hashedPassword,
                role: 'owner',
                companyDetails: {
                    name: businessName,
                    type: businessType || '',
                    industry: industry || '',
                    subIndustry: subIndustry || '',
                    employees: employees || '',
                    email: email,
                    gstin: gstin || '',
                    pan: pan || ''
                },
                address: {
                    street: street || '',
                    city: city || '',
                    state: state || '',
                    pincode: pincode || '',
                    country: country || 'India'
                },
                subscription: {
                    plan: plan || 'Free',
                    status: 'Active',
                    startDate: null,
                    endDate: null
                },
                createdAt: new Date().toISOString(),
                lastLogin: null
            };

            await OwnerModel.create(ownerData);

        } else {
            // === FIRESTORE MODE ===
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
                    return res.status(400).json({ msg: "User already exists in this Tenant" });
                }
                throw authError;
            }

            userId = userRecord.uid;
            const ownerDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(userId);

            const ownerData = {
                firstName,
                lastName,
                email,
                mobile,
                role: 'owner',
                userId: userId,
                companyDetails: {
                    name: businessName,
                    type: businessType || '',
                    industry: industry || '',
                    subIndustry: subIndustry || '',
                    employees: employees || '',
                    email: email,
                    gstin: gstin || '',
                    pan: pan || ''
                },
                address: {
                    street: street || '',
                    city: city || '',
                    state: state || '',
                    pincode: pincode || '',
                    country: country || ''
                },
                subscription: {
                    plan: plan || null,
                    status: 'Inactive',
                    startDate: null,
                    endDate: null
                },
                createdAt: new Date().toISOString(),
                lastLogin: null
            };

            await ownerDocRef.set(ownerData);
        }

        // Generate JWT Token
        const payload = {
            user: {
                userId: userId,
                ownerId: userId,
                subuserId: null,
                role: 'owner'
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: {
                userId,
                ownerId: userId,
                role: 'owner',
                firstName,
                lastName,
                email
            }
        });

        // Send Welcome Email (Non-blocking)
        const welcomeHtml = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h1 style="color: #CA8A04;">Welcome to SwordNex, ${firstName}!</h1>
                <p>Thank you for choosing SwordNex Billing Software for <strong>${businessName}</strong>.</p>
            </div>
        `;

        sendEmail({
            to: email,
            subject: "Welcome to SwordNex!",
            htmlContent: welcomeHtml
        }).catch(emailErr => {
            console.error("❌ Failed to send welcome email:", emailErr.message);
        });

    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).json({ msg: "Server error: " + err.message });
    }
};

// @desc    Login User
// @route   POST /api/v2/auth/login
exports.login = async (req, res) => {
    const { email, password, loginType } = req.body;

    if (!email || !password) {
        return res.status(400).json({ msg: "Please enter email and password" });
    }

    const tenantId = process.env.TENANT_ID;

    if (!tenantId) {
        return res.status(500).json({ msg: "Server Configuration Error: TENANT_ID not set" });
    }

    try {
        let uid, userData, isSubUser = false, ownerId, bossData;

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            // Try to find owner first
            let user = await OwnerModel.findOne({ email, tenantId });

            if (user) {
                // Verify password
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.status(401).json({ msg: "Authentication failed: INVALID_PASSWORD" });
                }

                uid = user.userId;
                ownerId = uid;
                userData = user.toObject();
                bossData = userData;

            } else {
                // Try to find subuser
                user = await SubUserModel.findOne({ email, tenantId });

                if (!user) {
                    return res.status(401).json({ msg: "Authentication failed: EMAIL_NOT_FOUND" });
                }

                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.status(401).json({ msg: "Authentication failed: INVALID_PASSWORD" });
                }

                uid = user.userId;
                ownerId = user.ownerId;
                isSubUser = true;
                userData = user.toObject();

                // Fetch boss data
                const boss = await OwnerModel.findOne({ userId: ownerId, tenantId });
                if (!boss) {
                    return res.status(403).json({ msg: "Owner account not found. Access denied." });
                }
                bossData = boss.toObject();

                // Check subscription
                const subStatus = bossData.subscription?.status || 'Inactive';
                const subEndDate = bossData.subscription?.endDate ? new Date(bossData.subscription.endDate) : null;
                const now = new Date();

                if (subStatus !== 'Active' || (subEndDate && subEndDate < now)) {
                    return res.status(403).json({
                        msg: "Owner's subscription has expired or is inactive. Access denied.",
                        subscriptionStatus: subStatus
                    });
                }
            }

            // Enforce Login Type Portal Separation
            if (loginType === 'admin' && isSubUser) {
                return res.status(403).json({ msg: "Team members must log in through the Team Portal." });
            }
            if (loginType === 'team' && !isSubUser) {
                return res.status(403).json({ msg: "Owner accounts must log in through the Admin Portal." });
            }

            // Update Last Login
            if (isSubUser) {
                await SubUserModel.updateOne({ userId: uid, tenantId }, { lastLogin: new Date().toISOString() });
            } else {
                await OwnerModel.updateOne({ userId: uid, tenantId }, { lastLogin: new Date().toISOString() });
            }

        } else {
            // === FIRESTORE MODE (Original Logic) ===
            const apiKey = process.env.FB_WEB_API_KEY;
            if (!apiKey) {
                return res.status(500).json({ msg: "Server Configuration Error: API_KEY not set" });
            }

            const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

            const authResponse = await axios.post(authUrl, {
                email,
                password,
                tenantId,
                returnSecureToken: true
            });

            uid = authResponse.data.localId;

            let userDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(uid);
            let userDoc = await userDocRef.get();

            if (userDoc.exists) {
                userData = userDoc.data();
                ownerId = uid;
            } else {
                const ownersSnapshot = await db
                    .collection('SwordNexBillingSoftware')
                    .doc(tenantId)
                    .collection('owner')
                    .get();

                let found = false;

                for (const owner of ownersSnapshot.docs) {
                    const subSnap = await owner.ref
                        .collection('subuser')
                        .where('firebaseUid', '==', uid)
                        .get();

                    if (!subSnap.empty) {
                        const subuserDoc = subSnap.docs[0];
                        userData = subuserDoc.data();
                        isSubUser = true;
                        ownerId = userData.ownerId;
                        userDocRef = subuserDoc.ref;
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    return res.status(401).json({ msg: "User record not found in system." });
                }
            }

            // Enforce Login Type Portal Separation
            if (loginType === 'admin' && isSubUser) {
                return res.status(403).json({ msg: "Team members must log in through the Team Portal." });
            }
            if (loginType === 'team' && !isSubUser) {
                return res.status(403).json({ msg: "Owner accounts must log in through the Admin Portal." });
            }

            // Subscription Check for Sub-users
            if (isSubUser) {
                if (!ownerId) {
                    console.error("❌ Sub-user missing ownerId:", uid);
                    return res.status(401).json({ msg: "Sub-user record is incomplete (missing owner association)." });
                }

                const bossDoc = await db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(ownerId).get();
                if (!bossDoc.exists) {
                    console.error("❌ Owner account not found for sub-user:", ownerId);
                    return res.status(403).json({ msg: "Owner account not found. Access denied." });
                }
                bossData = bossDoc.data();

                const subStatus = bossData.subscription?.status || 'Inactive';
                const subEndDate = bossData.subscription?.endDate ? new Date(bossData.subscription.endDate) : null;
                const now = new Date();

                if (subStatus !== 'Active' || (subEndDate && subEndDate < now)) {
                    return res.status(403).json({
                        msg: "Owner's subscription has expired or is inactive. Access denied.",
                        subscriptionStatus: subStatus
                    });
                }
            } else {
                bossData = userData;
            }

            if (!bossData) {
                console.error("❌ No bossData available for UID:", uid);
                return res.status(500).json({ msg: "Internal Server Error: Missing tenant context." });
            }

            // Update Last Login
            await userDocRef.update({ lastLogin: new Date().toISOString() });
        }

        // Generate JWT Token
        const payload = {
            user: {
                userId: uid,
                ownerId: ownerId,
                subuserId: isSubUser ? uid : null,
                role: isSubUser ? 'subuser' : 'owner'
            }
        };

        const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token: jwtToken,
            user: {
                userId: uid,
                ownerId,
                subuserId: isSubUser ? uid : null,
                role: isSubUser ? 'subuser' : 'owner',
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: userData.email,
                mobile: isSubUser ? userData.subbranchMobile || '' : userData.mobile || '',
                Tenant: {
                    ...(bossData.companyDetails || {}),
                    subscription_status: bossData.subscription?.status || 'Inactive',
                    subscription_plan: bossData.subscription?.plan || 'Free',
                    subscription_expiry: bossData.subscription?.endDate || null,
                    street: bossData.address?.street || '',
                    city: bossData.address?.city || '',
                    state: bossData.address?.state || '',
                    pincode: bossData.address?.pincode || '',
                    purchase_gst: userData.purchase_gst !== undefined ? userData.purchase_gst : (bossData.purchase_gst || 0),
                    purchase_tax_type: userData.purchase_tax_type !== undefined ? userData.purchase_tax_type : (bossData.purchase_tax_type || 'exclusive'),
                    sales_gst: userData.sales_gst !== undefined ? userData.sales_gst : (bossData.sales_gst || 0),
                    sales_tax_type: userData.sales_tax_type !== undefined ? userData.sales_tax_type : (bossData.sales_tax_type || 'exclusive'),
                    printer_configs: userData.printer_configs !== undefined ? userData.printer_configs : (bossData.printer_configs || []),
                    printer_auto_print: userData.printer_auto_print !== undefined ? userData.printer_auto_print : (bossData.printer_auto_print || false)
                }
            }
        });

    } catch (err) {
        console.error("Login Error Full:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));

        if (err.response && err.response.data) {
            const errorData = err.response.data;
            const errorMessage = errorData.error && errorData.error.message ? errorData.error.message : "Authentication Failed";
            return res.status(401).json({ msg: "Authentication failed: " + errorMessage });
        }
        res.status(500).json({ msg: "Server error during login: " + err.message });
    }
};

// @desc    Update Owner Profile & Business Details
// @route   PUT /api/v2/auth/update-profile
exports.updateProfile = async (req, res) => {
    try {
        const { userId, ownerId, role } = req.user;
        const tenantId = process.env.TENANT_ID;

        if (!tenantId) {
            return res.status(500).json({ msg: "Server Config Error: TENANT_ID not set" });
        }

        const {
            firstName, lastName, mobile,
            businessName, industry, businessType, gstin, pan,
            street, city, state, pincode,
            invoice_prefix, next_invoice_number,
            purchase_gst, purchase_tax_type, sales_gst, sales_tax_type,
            printer_configs, printer_auto_print
        } = req.body;

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            const owner = await OwnerModel.findOne({ userId: ownerId, tenantId });
            if (!owner) {
                return res.status(404).json({ msg: "Owner record not found" });
            }

            const businessUpdates = {};
            const personalUpdates = {};

            if (firstName) personalUpdates.firstName = firstName;
            if (lastName) personalUpdates.lastName = lastName;
            if (mobile) personalUpdates.mobile = mobile;

            const subuserSettings = {};
            if (purchase_gst !== undefined) subuserSettings.purchase_gst = purchase_gst;
            if (purchase_tax_type !== undefined) subuserSettings.purchase_tax_type = purchase_tax_type;
            if (sales_gst !== undefined) subuserSettings.sales_gst = sales_gst;
            if (sales_tax_type !== undefined) subuserSettings.sales_tax_type = sales_tax_type;
            if (printer_configs !== undefined) subuserSettings.printer_configs = printer_configs;
            if (printer_auto_print !== undefined) subuserSettings.printer_auto_print = printer_auto_print;

            if (businessName || industry || businessType || gstin || pan) {
                businessUpdates.companyDetails = {
                    ...(owner.companyDetails || {}),
                    ...(businessName && { name: businessName }),
                    ...(industry && { industry }),
                    ...(businessType && { type: businessType }),
                    ...(gstin && { gstin }),
                    ...(pan && { pan })
                };
            }

            if (street || city || state || pincode) {
                businessUpdates.address = {
                    ...(owner.address || {}),
                    ...(street && { street }),
                    ...(city && { city }),
                    ...(state && { state }),
                    ...(pincode && { pincode })
                };
            }

            if (invoice_prefix !== undefined || next_invoice_number !== undefined) {
                businessUpdates.invoiceSettings = {
                    ...(owner.invoiceSettings || {}),
                    ...(invoice_prefix !== undefined && { prefix: invoice_prefix }),
                    ...(next_invoice_number !== undefined && { sequence: next_invoice_number })
                };
                if (invoice_prefix !== undefined) businessUpdates.invoice_prefix = invoice_prefix;
                if (next_invoice_number !== undefined) businessUpdates.next_invoice_number = next_invoice_number;
            }

            if (role === 'owner') {
                if (purchase_gst !== undefined) businessUpdates.purchase_gst = purchase_gst;
                if (purchase_tax_type !== undefined) businessUpdates.purchase_tax_type = purchase_tax_type;
                if (sales_gst !== undefined) businessUpdates.sales_gst = sales_gst;
                if (sales_tax_type !== undefined) businessUpdates.sales_tax_type = sales_tax_type;
                if (printer_configs !== undefined) businessUpdates.printer_configs = printer_configs;
                if (printer_auto_print !== undefined) businessUpdates.printer_auto_print = printer_auto_print;

                await OwnerModel.updateOne(
                    { userId: ownerId, tenantId },
                    { $set: { ...businessUpdates, ...personalUpdates } }
                );
            } else if (role === 'subuser') {
                if (Object.keys(businessUpdates).length > 0) {
                    await OwnerModel.updateOne(
                        { userId: ownerId, tenantId },
                        { $set: businessUpdates }
                    );
                }
                await SubUserModel.updateOne(
                    { userId, tenantId },
                    { $set: { ...personalUpdates, ...subuserSettings } }
                );
            }

            return res.json({ msg: "Profile updated successfully", businessUpdates, personalUpdates, subuserSettings });
        }

        // === FIRESTORE MODE ===
        const ownerDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(ownerId);
        const ownerDoc = await ownerDocRef.get();

        if (!ownerDoc.exists) {
            return res.status(404).json({ msg: "Owner record not found" });
        }

        const businessUpdates = {};
        const personalUpdates = {};

        if (firstName) personalUpdates.firstName = firstName;
        if (lastName) personalUpdates.lastName = lastName;
        if (mobile) personalUpdates.mobile = mobile;

        const subuserSettings = {};
        if (purchase_gst !== undefined) subuserSettings.purchase_gst = purchase_gst;
        if (purchase_tax_type !== undefined) subuserSettings.purchase_tax_type = purchase_tax_type;
        if (sales_gst !== undefined) subuserSettings.sales_gst = sales_gst;
        if (sales_tax_type !== undefined) subuserSettings.sales_tax_type = sales_tax_type;
        if (printer_configs !== undefined) subuserSettings.printer_configs = printer_configs;
        if (printer_auto_print !== undefined) subuserSettings.printer_auto_print = printer_auto_print;

        if (businessName || industry || businessType || gstin || pan) {
            businessUpdates.companyDetails = {
                ...(ownerDoc.data().companyDetails || {}),
                ...(businessName && { name: businessName }),
                ...(industry && { industry }),
                ...(businessType && { type: businessType }),
                ...(gstin && { gstin }),
                ...(pan && { pan })
            };
        }

        if (street || city || state || pincode) {
            businessUpdates.address = {
                ...(ownerDoc.data().address || {}),
                ...(street && { street }),
                ...(city && { city }),
                ...(state && { state }),
                ...(pincode && { pincode })
            };
        }

        if (invoice_prefix !== undefined || next_invoice_number !== undefined) {
            businessUpdates.invoiceSettings = {
                ...(ownerDoc.data().invoiceSettings || {}),
                ...(invoice_prefix !== undefined && { prefix: invoice_prefix }),
                ...(next_invoice_number !== undefined && { sequence: next_invoice_number })
            };
            if (invoice_prefix !== undefined) businessUpdates.invoice_prefix = invoice_prefix;
            if (next_invoice_number !== undefined) businessUpdates.next_invoice_number = next_invoice_number;
        }

        if (role === 'owner') {
            if (purchase_gst !== undefined) businessUpdates.purchase_gst = purchase_gst;
            if (purchase_tax_type !== undefined) businessUpdates.purchase_tax_type = purchase_tax_type;
            if (sales_gst !== undefined) businessUpdates.sales_gst = sales_gst;
            if (sales_tax_type !== undefined) businessUpdates.sales_tax_type = sales_tax_type;
            if (printer_configs !== undefined) businessUpdates.printer_configs = printer_configs;
            if (printer_auto_print !== undefined) businessUpdates.printer_auto_print = printer_auto_print;
        }

        if (Object.keys(businessUpdates).length > 0 || role === 'owner') {
            await ownerDocRef.update({ ...businessUpdates, ...(role === 'owner' ? personalUpdates : {}) });
        }

        if (role === 'subuser') {
            const subUserRef = ownerDocRef.collection('subuser').doc(userId);
            const updates = { ...personalUpdates, ...subuserSettings };
            if (Object.keys(updates).length > 0) {
                await subUserRef.update(updates);
            }
        }

        res.json({ msg: "Profile updated successfully", businessUpdates, personalUpdates, subuserSettings });

    } catch (err) {
        console.error("Update Profile Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
};

// @desc    Get Current User & Tenant Details
// @route   GET /api/v2/auth/me
exports.getMe = async (req, res) => {
    try {
        const { userId } = req.user;
        const tenantId = process.env.TENANT_ID;

        if (!tenantId) {
            return res.status(500).json({ msg: "Server Config Error" });
        }

        let userData;
        let ownerId;
        let isSubUser = false;
        let bossData;

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            let user = await OwnerModel.findOne({ userId, tenantId });

            if (user) {
                userData = user.toObject();
                ownerId = userId;
                bossData = userData;
            } else {
                user = await SubUserModel.findOne({ userId, tenantId });
                if (!user) {
                    return res.status(404).json({ msg: "User account not found" });
                }
                userData = user.toObject();
                isSubUser = true;
                ownerId = userData.ownerId;

                const boss = await OwnerModel.findOne({ userId: ownerId, tenantId });
                bossData = boss ? boss.toObject() : userData;
            }

            delete userData.password;
            if (bossData) delete bossData.password;

        } else {
            // === FIRESTORE MODE ===
            const ownerDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(userId);
            const ownerDoc = await ownerDocRef.get();

            if (ownerDoc.exists) {
                userData = ownerDoc.data();
                ownerId = userId;
            } else {
                const ownersSnapshot = await db
                    .collection('SwordNexBillingSoftware')
                    .doc(tenantId)
                    .collection('owner')
                    .get();

                let found = false;

                for (const owner of ownersSnapshot.docs) {
                    const subSnap = await owner.ref
                        .collection('subuser')
                        .where('firebaseUid', '==', userId)
                        .get();

                    if (!subSnap.empty) {
                        const subuserDoc = subSnap.docs[0];
                        userData = subuserDoc.data();
                        isSubUser = true;
                        ownerId = userData.ownerId;
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    return res.status(404).json({ msg: "User account not found" });
                }
            }

            const bossDoc = await db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(ownerId).get();
            bossData = bossDoc.exists ? bossDoc.data() : userData;
        }

        if (!bossData) {
            return res.status(500).json({ msg: "Internal Server Error: Missing tenant context." });
        }

        res.json({
            userId,
            ownerId,
            subuserId: isSubUser ? userId : null,
            role: userData.role,
            ...userData,
            Tenant: {
                ...(bossData.companyDetails || {}),
                subscription_status: bossData.subscription?.status || 'Inactive',
                subscription_plan: bossData.subscription?.plan || 'Free',
                subscription_expiry: bossData.subscription?.endDate || null,
                street: bossData.address?.street || '',
                city: bossData.address?.city || '',
                state: bossData.address?.state || '',
                pincode: bossData.address?.pincode || '',
                purchase_gst: userData.purchase_gst !== undefined ? userData.purchase_gst : (bossData.purchase_gst || 0),
                purchase_tax_type: userData.purchase_tax_type !== undefined ? userData.purchase_tax_type : (bossData.purchase_tax_type || 'exclusive'),
                sales_gst: userData.sales_gst !== undefined ? userData.sales_gst : (bossData.sales_gst || 0),
                sales_tax_type: userData.sales_tax_type !== undefined ? userData.sales_tax_type : (bossData.sales_tax_type || 'exclusive'),
                printer_configs: userData.printer_configs !== undefined ? userData.printer_configs : (bossData.printer_configs || []),
                printer_auto_print: userData.printer_auto_print !== undefined ? userData.printer_auto_print : (bossData.printer_auto_print || false)
            }
        });

    } catch (err) {
        console.error("GetMe Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
};

// All models, for the delete-account cascade
const mongoModels = require('../models/mongodb');

// @desc    Logout (JWT is stateless — this just records the time, best-effort)
// @route   POST /api/v2/auth/logout
exports.logout = async (req, res) => {
    try {
        const { userId, role } = req.user;
        const tenantId = process.env.TENANT_ID;
        const Model = role === 'subuser' ? SubUserModel : OwnerModel;
        await Model.updateOne({ userId, tenantId }, { $set: { lastLogout: new Date().toISOString() } });
    } catch (err) {
        console.error("Logout Error:", err.message);
    }
    res.json({ msg: "Logged out" });
};

// @desc    Delete the current account (and, for an owner, all of its tenant data)
// @route   DELETE /api/v2/auth/delete-account
exports.deleteAccount = async (req, res) => {
    try {
        const { userId, role } = req.user;
        const tenantId = process.env.TENANT_ID;

        if (role === 'subuser') {
            await SubUserModel.deleteOne({ userId, tenantId });
            return res.json({ msg: "Account deleted" });
        }

        // Owner: cascade delete everything scoped to this owner.
        const ownedModels = [
            mongoModels.SubUser, mongoModels.Product, mongoModels.Customer,
            mongoModels.GstBill, mongoModels.Bill, mongoModels.Transaction,
            mongoModels.Credit, mongoModels.Supplier, mongoModels.Trainer,
            mongoModels.Client, mongoModels.Salesman, mongoModels.InventoryReturn,
            mongoModels.SubscriptionDetail
        ];
        await Promise.all(
            ownedModels.map(M => M.deleteMany({ tenantId, ownerId: userId }))
        );
        await OwnerModel.deleteOne({ userId, tenantId });

        res.json({ msg: "Account deleted" });
    } catch (err) {
        console.error("DeleteAccount Error:", err.message);
        res.status(500).json({ msg: "Server error: " + err.message });
    }
};

// @desc    Start a password-reset flow (always responds the same, no email enumeration)
// @route   POST /api/v2/auth/forgot-password
exports.forgotPassword = async (req, res) => {
    const { email } = req.body || {};
    const tenantId = process.env.TENANT_ID;
    const genericMsg = { msg: "If that email exists, a reset link has been sent." };

    try {
        if (!email) return res.status(400).json({ msg: "Email is required" });

        const user =
            (await OwnerModel.findOne({ email, tenantId })) ||
            (await SubUserModel.findOne({ email, tenantId }));

        if (user) {
            const token = jwt.sign(
                { email, tenantId, purpose: 'pwreset' },
                process.env.JWT_SECRET,
                { expiresIn: '30m' }
            );
            const base = process.env.FRONTEND_URL || 'http://localhost:5173';
            const link = `${base}/forgot-password?oobCode=${token}`;
            console.log('[forgot-password] reset link for', email, '→', link);
            await sendEmail({
                to: email,
                subject: 'Reset your SwordNex password',
                html: `<p>We received a request to reset your password. This link is valid for 30 minutes:</p>
                       <p><a href="${link}">${link}</a></p>
                       <p>If you didn't request this, you can ignore this email.</p>`
            }).catch(e => console.error('forgot-password email failed:', e.message));
        }

        res.json(genericMsg);
    } catch (err) {
        console.error("ForgotPassword Error:", err.message);
        res.json(genericMsg);
    }
};

// @desc    Complete a password reset
// @route   POST /api/v2/auth/reset-password
exports.resetPassword = async (req, res) => {
    const { token, password } = req.body || {};

    try {
        if (!token || !password) {
            return res.status(400).json({ msg: "Token and new password are required" });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ msg: "Password must be at least 6 characters" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
            return res.status(400).json({ msg: "Reset link is invalid or has expired" });
        }
        if (decoded.purpose !== 'pwreset') {
            return res.status(400).json({ msg: "Invalid reset token" });
        }

        const { email, tenantId } = decoded;
        const hash = await bcrypt.hash(password, 10);

        const owner = await OwnerModel.findOne({ email, tenantId });
        if (owner) {
            await OwnerModel.updateOne({ _id: owner._id }, { $set: { password: hash } });
        } else {
            const sub = await SubUserModel.findOne({ email, tenantId });
            if (!sub) return res.status(400).json({ msg: "Account not found" });
            await SubUserModel.updateOne({ _id: sub._id }, { $set: { password: hash } });
        }

        res.json({ msg: "Password updated successfully" });
    } catch (err) {
        console.error("ResetPassword Error:", err.message);
        res.status(500).json({ msg: "Server Error" });
    }
};
