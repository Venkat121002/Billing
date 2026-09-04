
const { db, admin } = require('../config/firebase'); // Firestore instance & Admin for Auth
const axios = require('axios'); // For Identity Platform REST API
const { sendEmail } = require('../utils/emailService');

// Helper: Generate Unique ID
const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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

    // Get Tenant ID from Environment
    const tenantId = process.env.TENANT_ID;
    if (!tenantId) {
        return res.status(500).json({ msg: "Server Configuration Error: TENANT_ID not set" });
    }

    try {
        // 1. Create User in Specific Identity Platform Tenant
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

        const userId = userRecord.uid; // The Firebase UID
        const ownerSaaSId = generateId(); // Generate an internal ID if needed, or just use UID

        // 2. Create Owner Document in: billingSoftware/{TENANT_ID}/owner/{userId}
        const ownerDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(userId);

        const ownerData = {
            firstName,
            lastName,
            email,
            mobile,
            role: 'owner',
            userId: userId,       // The Firebase UID
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

        // 3. Generate Backend Token
        const payload = {
            user: {
                userId: userId,
                ownerId: userId, // Boss is self
                subuserId: null,
                role: 'owner'
            }
        };

        const token = require('jsonwebtoken').sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 360000 }
        );

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

        // 4. Send Welcome Email via Brevo (Non-blocking)
        const welcomeHtml = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h1 style="color: #CA8A04;">Welcome to SwordNex, ${firstName}!</h1>
                <p>Thank you for choosing SwordNex Billing Software for <strong>${businessName}</strong>.</p>
                <p>We are excited to help you manage your business more efficiently. With SwordNex, you can easily handle:</p>
                <ul>
                    <li>Professional Billing & GST Invoices</li>
                    <li>Inventory Management</li>
                    <li>Cashbook & Expense Tracking</li>
                    <li>Credit Management</li>
                    <li>Comprehensive Business Reports</li>
                </ul>
                <p>You can get started right away by exploring your dashboard:</p>
                <a href="https://swordnex-billing.web.app/dashboard" style="display: inline-block; background-color: #CA8A04; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Go to Dashboard</a>
                <p style="margin-top: 20px;">If you have any questions, feel free to reply to this email or contact our support team.</p>
                <p>Best regards,<br>The SwordNex Team</p>
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
    const apiKey = process.env.FB_WEB_API_KEY;

    if (!tenantId || !apiKey) {
        return res.status(500).json({ msg: "Server Configuration Error: TENANT_ID or API_KEY not set" });
    }

    try {
        // 1. Authenticate against Identity Platform Tenant
        const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

        const authResponse = await axios.post(authUrl, {
            email,
            password,
            tenantId,
            returnSecureToken: true
        });

        const { localId: uid } = authResponse.data;

        // 2. Fetch User Data from Production Structure (SwordNexBillingSoftware/{tenantId}/owner/{uid})
        let userDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(uid);
        let userDoc = await userDocRef.get();
        let userData;
        let isSubUser = false;
        let ownerId;

        if (userDoc.exists) {
            console.log("✅ User found in 'owner' collection:", uid);
            userData = userDoc.data();
            ownerId = uid;
        } else {
            console.log("🔍 User not found in 'owner', searching in 'subuser' collection group...");
            // Identify owner by searching in subuser collections (using firebaseUid matching)
            // const subuserQuery = db.collectionGroup('subuser').where('firebaseUid', '==', uid);
            // const subuserSnapshot = await subuserQuery.get();
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

        // 2.5 Enforce Login Type Portal Separation
        if (loginType === 'admin' && isSubUser) {
            return res.status(403).json({ msg: "Team members must log in through the Team Portal." });
        }
        if (loginType === 'team' && !isSubUser) {
            return res.status(403).json({ msg: "Owner accounts must log in through the Admin Portal." });
        }


        // 3. Subscription Check for Sub-users
        let bossData;
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

            // Validate owner's subscription is Active
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

        // 4. Update Last Login
        await userDocRef.update({ lastLogin: new Date().toISOString() });

        // 5. Generate Response & JWT with { userId, ownerId, subuserId, role }
        const payload = {
            user: {
                userId: uid,
                ownerId: ownerId,
                subuserId: isSubUser ? uid : null,
                role: isSubUser ? 'subuser' : 'owner'
            }
        };

        const jwtToken = require('jsonwebtoken').sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

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
                    // Business address
                    street: bossData.address?.street || '',
                    city: bossData.address?.city || '',
                    state: bossData.address?.state || '',
                    pincode: bossData.address?.pincode || '',
                    // GST & Printer settings with subuser fallback
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

        if (err.code === 9) {
            console.error("🔥 Firestore Index Required. Check this link in your terminal or Google Cloud Console for the creation link.");
        }

        // Handle Axios Error Response (e.g. from Identity Platform)
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
// @desc    Update Owner Profile & Business Details
// @route   PUT /api/v2/auth/update-profile
exports.updateProfile = async (req, res) => {
    try {
        const { userId, ownerId, role } = req.user;
        const tenantId = process.env.TENANT_ID;

        console.log(`📡 [Backend] updateProfile: role=${role}, userId=${userId}, ownerId=${ownerId}, tenantId=${tenantId}`);

        if (!tenantId) {
            console.error("❌ [Backend] updateProfile: TENANT_ID is MISSING in process.env");
            return res.status(500).json({ msg: "Server Config Error" });
        }

        const {
            firstName, lastName, mobile,
            businessName, industry, businessType, gstin, pan,
            street, city, state, pincode,
            invoice_prefix, next_invoice_number,
            purchase_gst, purchase_tax_type, sales_gst, sales_tax_type,
            printer_configs, printer_auto_print
        } = req.body;

        const ownerDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(ownerId);
        const ownerDoc = await ownerDocRef.get();

        if (!ownerDoc.exists) {
            console.error(`❌ [Backend] updateProfile: Owner doc NOT FOUND at path: SwordNexBillingSoftware/${tenantId}/owner/${ownerId}`);
            return res.status(404).json({ msg: "Owner record not found" });
        }

        const businessUpdates = {};
        const personalUpdates = {};

        // Personal details apply to the current user (owner or subuser)
        if (firstName) personalUpdates.firstName = firstName;
        if (lastName) personalUpdates.lastName = lastName;
        if (mobile) personalUpdates.mobile = mobile;

        // Subuser-specific settings (GST, Printer)
        const subuserSettings = {};
        if (purchase_gst !== undefined) subuserSettings.purchase_gst = purchase_gst;
        if (purchase_tax_type !== undefined) subuserSettings.purchase_tax_type = purchase_tax_type;
        if (sales_gst !== undefined) subuserSettings.sales_gst = sales_gst;
        if (sales_tax_type !== undefined) subuserSettings.sales_tax_type = sales_tax_type;
        if (printer_configs !== undefined) subuserSettings.printer_configs = printer_configs;
        if (printer_auto_print !== undefined) subuserSettings.printer_auto_print = printer_auto_print;

        // Business details always apply to the owner's document
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

        // If owner, these are business-wide defaults
        if (role === 'owner') {
            if (purchase_gst !== undefined) businessUpdates.purchase_gst = purchase_gst;
            if (purchase_tax_type !== undefined) businessUpdates.purchase_tax_type = purchase_tax_type;
            if (sales_gst !== undefined) businessUpdates.sales_gst = sales_gst;
            if (sales_tax_type !== undefined) businessUpdates.sales_tax_type = sales_tax_type;
            if (printer_configs !== undefined) businessUpdates.printer_configs = printer_configs;
            if (printer_auto_print !== undefined) businessUpdates.printer_auto_print = printer_auto_print;
        }

        // 1. Update Owner Document (for business details and if user is owner)
        if (Object.keys(businessUpdates).length > 0 || role === 'owner') {
            await ownerDocRef.update({ ...businessUpdates, ...(role === 'owner' ? personalUpdates : {}) });
        }

        // 2. Update Subuser Document (if user is subuser)
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
        const tenantId = process.env.TENANT_ID; // From Env for now, or from Token if we stored it

        if (!tenantId) {
            return res.status(500).json({ msg: "Server Config Error" });
        }

        let userData;
        let ownerId;
        let isSubUser = false;

        // 1. Try finding in owner collection
        const ownerDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(userId);
        const ownerDoc = await ownerDocRef.get();

        if (ownerDoc.exists) {
            userData = ownerDoc.data();
            ownerId = userId;
        } else {
            // 2. Try finding in subuser collection group
            // const subuserQuery = db.collectionGroup('subuser').where('firebaseUid', '==', userId);
            // const subuserSnapshot = await subuserQuery.get();

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

        // 3. Fetch boss data for tenant info
        const bossDoc = await db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(ownerId).get();
        const bossData = bossDoc.exists ? bossDoc.data() : userData;

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
                // Business address
                street: bossData.address?.street || '',
                city: bossData.address?.city || '',
                state: bossData.address?.state || '',
                pincode: bossData.address?.pincode || '',
                // GST & Printer settings with subuser fallback
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

