const getTransporter = () => {
    const nodemailer = require('nodemailer');
    return nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_PASSWORD
        }
    });
};

const sendEmail = async (to, subject, html) => {
    try {
        const transporter = getTransporter();
        await transporter.sendMail({
            from: '"SwordNex" <noreply@swordnex.com>',
            to,
            subject,
            html
        });
        console.log(`✅ Email sent to ${to}: ${subject}`);
    } catch (error) {
        console.error("❌ Email failed:", error);
    }
};

const initAuth = () => {
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const db = require('../models');
    const crypto = require('crypto');
    const axios = require('axios');
    const { Op } = require('sequelize');

    return {
        bcrypt, jwt, db, crypto, axios, Op,
        User: db.User,
        Tenant: db.Tenant,
        Invoice: db.Invoice,
        Site: db.Site,
        Subscription: db.Subscription
    };
};

// Ensure a usable JWT secret in all environments
const JWT_SECRET = global.JWT_SECRET || (global.JWT_SECRET = (process.env.JWT_SECRET || require('crypto').createHash('sha256').update('SwordNexBilling-Auth').digest('hex')));

exports.register = async (req, res) => {
    const { bcrypt, jwt, User, Tenant } = initAuth();
    const { name, email, password, tenant_name, firebase_tenant_id, firebase_uid } = req.body;

    // Validate Password Strength First
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
        return res.status(400).json({ msg: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.' });
    }

    try {
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create Tenant first
        const tenant = await Tenant.create({
            name: tenant_name,
            firebase_tenant_id: firebase_tenant_id,
            email: email,
            subscription_plan: 'Free',
            subscription_status: 'pending',
            subscription_expiry: null
        });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await User.create({
            name,
            email,
            password: hashedPassword,
            tenant_id: tenant.id,
            firebase_uid: firebase_uid,
            firebase_tenant_id: firebase_tenant_id,
            subscription_status: tenant.subscription_status,
            role: 'TenantAdmin'
        });

        const payload = {
            user: {
                id: user.id,
                role: user.role,
                tenant_id: user.tenant_id
            }
        };

        // Send Welcome Email (Soft fail)
        try {
            await sendEmail(email, "Welcome to SwordNex!", `
                <h1>Welcome to SwordNex!</h1>
                <p>Hi ${name},</p>
                <p>Thank you for signing up. Please verify your details and activate your plan to get started.</p>
                <p>Explore our features and manage your billing easily.</p>
                <br>
                <a href="https://swordnex-softwares.web.app/dashboard" style="background-color: #CA8A04; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
            `);
        } catch (emailErr) {
            console.error("Welcome email failed but registration continued:", emailErr);
        }

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) return res.status(500).json({ msg: 'Token generation failed' });
                res.json({
                    token,
                    subscription_status: tenant.subscription_status || "pending"
                });
            }
        );
    } catch (err) {
        console.error("Registration Error:", err.message);

        // Cleanup if partial success
        if (typeof user !== 'undefined' && user?.destroy) await user.destroy().catch(e => console.error("Cleanup user failed:", e));
        if (typeof tenant !== 'undefined' && tenant?.destroy) await tenant.destroy().catch(e => console.error("Cleanup tenant failed:", e));

        res.status(500).send('Server error: ' + err.message);
    }
};

exports.login = async (req, res) => {
    const { bcrypt, jwt, User, Tenant, Op, db, axios } = initAuth();
    const { email, loginIdentifier, password } = req.body;
    const identifier = loginIdentifier || email;

    console.log("Login attempt for:", identifier);

    try {
        let potentialUsers = await User.findAll({
            where: {
                [Op.or]: [
                    { email: identifier },
                    { employee_id: identifier }
                ]
            },
            include: [{ model: Tenant }]
        });

        if (!potentialUsers || potentialUsers.length === 0) {
            console.log("User not found in DB");
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        let user = null;
        for (const potentialUser of potentialUsers) {
            const isMatch = await bcrypt.compare(password, potentialUser.password);
            if (isMatch) {
                user = potentialUser;
                break;
            }
        }

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // 🟢 SYNC FIREBASE UID IF MISSING 🟢
        if (!user.firebase_uid) {
            try {
                const admin = require('firebase-admin');
                if (!admin.apps.length) admin.initializeApp();
                const fbUser = await admin.auth().getUserByEmail(user.email);
                user.firebase_uid = fbUser.uid;
                await user.save();
                console.log("Synced Firebase UID for user:", user.email);
            } catch (syncErr) {
                console.warn("Failed to sync Firebase UID during login:", syncErr.message);
            }
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role,
                tenant_id: user.tenant_id,
                site_id: user.site_id
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: 360000 },
            async (err, token) => {
                if (err) return res.status(500).json({ msg: 'Token generation failed' });
                try {
                    const UserSession = db.UserSession;

                    // 🌍 Get Location from IP
                    let locationName = "Unknown";
                    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

                    try {
                        if (ip && ip !== '::1' && ip !== '127.0.0.1') {
                            const geoRes = await axios.get(`http://ip-api.com/json/${ip}`);
                            if (geoRes.data && geoRes.data.status === 'success') {
                                locationName = `${geoRes.data.city}, ${geoRes.data.regionName}, ${geoRes.data.country}`;
                            }
                        }
                    } catch (geoErr) {
                        console.error("GeoIP Fetch Failed:", geoErr.message);
                    }

                    await UserSession.create({
                        user_id: user.id,
                        tenant_id: user.tenant_id,
                        ip_address: ip,
                        device_info: req.headers['user-agent'],
                        location_name: locationName
                    });
                } catch (sessionErr) {
                    console.error("Session Log Error:", sessionErr);
                }

                res.json({
                    token,
                    subscription_status: user.Tenant?.subscription_status || "pending"
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.googleLogin = async (req, res) => {
    const { bcrypt, jwt, User, Tenant, db, Site, axios } = initAuth();
    const { email, name, googleId, photoURL, firebase_tenant_id } = req.body;
    console.log("Google Login Request:", { email });

    if (!email) {
        return res.status(400).json({ msg: "Email is required from Google provider" });
    }

    try {
        let user = await User.findOne({
            where: { email },
            include: [{ model: Tenant }]
        });

        if (user) {
            // User exists, login

            // 🟢 SYNC FIREBASE UID IF MISSING 🟢
            if (!user.firebase_uid && googleId) {
                try {
                    user.firebase_uid = googleId;
                    await user.save();
                    console.log("Synced Firebase UID for existing Google user:", email);
                } catch (saveErr) {
                    console.error("Failed to save firebase_uid for Google user:", saveErr);
                }
            }
            const payload = {
                user: {
                    id: user.id,
                    role: user.role,
                    tenant_id: user.tenant_id,
                    site_id: user.site_id
                }
            };

            jwt.sign(
                payload,
                JWT_SECRET,
                { expiresIn: 360000 },
                async (err, token) => {
                    if (err) return res.status(500).json({ msg: 'Token generation failed' });

                    // 🌍 Record Session for Google Login
                    try {
                        const UserSession = db.UserSession;
                        let locationName = "Unknown";
                        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

                        try {
                            if (ip && ip !== '::1' && ip !== '127.0.0.1') {
                                const geoRes = await axios.get(`http://ip-api.com/json/${ip}`);
                                if (geoRes.data && geoRes.data.status === 'success') {
                                    locationName = `${geoRes.data.city}, ${geoRes.data.regionName}, ${geoRes.data.country}`;
                                }
                            }
                        } catch (geoErr) {
                            console.error("GeoIP Fetch Failed:", geoErr.message);
                        }

                        await UserSession.create({
                            user_id: user.id,
                            tenant_id: user.tenant_id,
                            ip_address: ip,
                            device_info: req.headers['user-agent'],
                            location_name: locationName
                        });
                    } catch (sessionErr) {
                        console.error("Session Log Error (Google):", sessionErr);
                    }

                    const userResponse = user.toJSON ? user.toJSON() : user;
                    res.json({
                        token,
                        user: userResponse,
                        subscription_status: user.Tenant?.subscription_status || "pending"
                    });
                }
            );
        } else {
            // Create New User & Tenant
            const t = await db.sequelize.transaction();
            try {
                const displayName = name || email.split('@')[0];

                const tenant = await Tenant.create({
                    name: `${displayName}'s Business`,
                    firebase_tenant_id: firebase_tenant_id,
                    email: email,
                    subscription_plan: 'Free',
                    subscription_status: 'pending', // Auto-activate trial
                    subscription_expiry: null
                }, { transaction: t });

                const site = await Site.create({
                    tenant_id: tenant.id,
                    name: "Main Site",
                    domain: "main"
                }, { transaction: t });

                const salt = await bcrypt.genSalt(10);
                // Dummy password for Google users
                const hashedPassword = await bcrypt.hash(googleId + Date.now(), salt);

                user = await User.create({
                    tenant_id: tenant.id,
                    site_id: site.id,
                    name: displayName,
                    email: email,
                    password: hashedPassword,
                    role: 'TenantAdmin'
                }, { transaction: t });

                await t.commit();

                // Send Welcome Email
                await sendEmail(email, "Welcome to SwordNex!", `
                    <h1>Welcome to SwordNex!</h1>
                    <p>Hi ${displayName},</p>
                    <p>Thank you for signing up via Google. Please choose a plan to continue.</p>
                    <a href="https://swordnex-softwares.web.app/dashboard">Go to Dashboard</a>
                `);

                const payload = {
                    user: {
                        id: user.id,
                        role: user.role,
                        tenant_id: user.tenant_id,
                        site_id: user.site_id
                    }
                };

                jwt.sign(
                    payload,
                    JWT_SECRET,
                    { expiresIn: 360000 },
                    async (err, token) => {
                        if (err) return res.status(500).json({ msg: 'Token generation failed' });

                        // 🌍 Record Session for Google Signup
                        try {
                            const UserSession = db.UserSession;
                            let locationName = "Unknown";
                            const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

                            try {
                                if (ip && ip !== '::1' && ip !== '127.0.0.1') {
                                    const geoRes = await axios.get(`http://ip-api.com/json/${ip}`);
                                    if (geoRes.data && geoRes.data.status === 'success') {
                                        locationName = `${geoRes.data.city}, ${geoRes.data.regionName}, ${geoRes.data.country}`;
                                    }
                                }
                            } catch (geoErr) {
                                console.error("GeoIP Fetch Failed:", geoErr.message);
                            }

                            await UserSession.create({
                                user_id: user.id,
                                tenant_id: user.tenant_id,
                                ip_address: ip,
                                device_info: req.headers['user-agent'],
                                location_name: locationName
                            });
                        } catch (sessionErr) {
                            console.error("Session Log Error (Google Signup):", sessionErr);
                        }

                        res.json({
                            token,
                            user,
                            subscription_status: tenant.subscription_status || "pending"
                        });
                    }
                );
            } catch (error) {
                await t.rollback();
                console.error("Transaction Error:", error);
                res.status(500).json({ msg: "Server Error during Google Registration: " + error.message });
            }
        }
    } catch (err) {
        console.error("Google Login Error:", err.message);
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { User, crypto } = initAuth();
        const { email } = req.body;

        console.log(`Password reset requested for: ${email}`);

        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.warn(`User not found for password reset: ${email}`);
            return res.status(404).json({ msg: "User not found" });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.reset_password_token = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.reset_password_expires = Date.now() + 3600000; // 1 hour

        await user.save();

        const origin = req.headers.origin || "https://swordnex-softwares.web.app"; // Fallback URL
        const resetUrl = `${origin}/forgot-password?oobCode=${resetToken}`;

        await sendEmail(user.email, "Password Reset Request", `
            <h1>Password Reset Request</h1>
            <p>You requested a password reset. Please click the link below to reset your password:</p>
            <a href="${resetUrl}" style="background-color: #CA8A04; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
        `);

        res.json({ msg: "Email sent" });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
};

exports.resetPassword = async (req, res) => {
    const { User, crypto, Op, bcrypt } = initAuth();
    const { token, password } = req.body;

    try {
        const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            where: {
                reset_password_token: resetPasswordToken,
                reset_password_expires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ msg: "Invalid or expired token" });
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            return res.status(400).json({ msg: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        user.reset_password_token = null;
        user.reset_password_expires = null;

        // Update Firebase Password
        try {
            const admin = require('firebase-admin');
            if (!admin.apps.length) {
                admin.initializeApp();
            }

            let firebaseUid = user.firebase_uid;

            // If UID is missing locally, try to find by email
            if (!firebaseUid) {
                try {
                    const firebaseUser = await admin.auth().getUserByEmail(user.email);
                    firebaseUid = firebaseUser.uid;

                    // Save the found UID for future use
                    user.firebase_uid = firebaseUid;
                } catch (e) {
                    console.log("User not found in Firebase by email either.");
                }
            }

            if (firebaseUid) {
                await admin.auth().updateUser(firebaseUid, {
                    password: password
                });
                console.log(`Firebase password updated for UID: ${firebaseUid}`);
            }
        } catch (firebaseError) {
            console.error("Failed to update Firebase password:", firebaseError);
            // Non-blocking
        }

        await user.save();

        res.json({ msg: "Password updated successfully" });
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.updateSubscription = async (req, res) => {
    const { User, Tenant } = initAuth();
    const { plan, billingCycle, paymentId, amount } = req.body;
    const userId = req.user.id;

    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        const tenant = await Tenant.findByPk(user.tenant_id);
        if (!tenant) {
            return res.status(404).json({ msg: "Tenant not found" });
        }

        let expiryDate = new Date();
        if (billingCycle === 'monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else if (billingCycle === 'yearly') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else if (billingCycle === '3years') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 3);
        }

        tenant.subscription_plan = plan.charAt(0).toUpperCase() + plan.slice(1);
        tenant.subscription_status = 'Active';
        tenant.subscription_expiry = expiryDate;
        await tenant.save();

        await sendEmail(user.email, `Welcome to SwordNex ${tenant.subscription_plan} Plan!`, `
            <h1>Welcome to SwordNex!</h1>
            <p>Thank you for subscribing to the <strong>${tenant.subscription_plan}</strong> plan.</p>
            <p>Your subscription is now active and valid until <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
            <p>You can now access all the features included in your plan.</p>
            <br>
            <p>Payment ID: ${paymentId}</p>
            <p>Amount Paid: ₹${amount}</p>
            <br>
            <a href="https://swordnex-softwares.web.app/dashboard" style="background-color: #CA8A04; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
        `);

        res.json({ msg: "Subscription updated successfully", tenant });

    } catch (err) {
        console.error("Update Subscription Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.deleteAccount = async (req, res) => {
    const { User, Tenant, Invoice, Site, Subscription, db } = initAuth();
    const userId = req.user.id;
    const t = await db.sequelize.transaction();

    try {
        const user = await User.findByPk(userId);
        if (!user) {
            await t.rollback();
            return res.status(404).json({ msg: "User not found" });
        }

        const tenantId = user.tenant_id;
        const tenant = await Tenant.findByPk(tenantId);

        if (!tenant) {
            await t.rollback();
            return res.status(404).json({ msg: "Tenant not found" });
        }

        await Invoice.destroy({ where: { tenant_id: tenantId }, transaction: t });
        await Site.destroy({ where: { tenant_id: tenantId }, transaction: t });
        await Subscription.destroy({ where: { tenant_id: tenantId }, transaction: t });
        await User.destroy({ where: { tenant_id: tenantId }, transaction: t });

        await tenant.destroy({ transaction: t });

        await t.commit();
        res.json({ msg: "Account deleted successfully" });

    } catch (err) {
        await t.rollback();
        console.error("Delete Account Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.startTrial = async (req, res) => {
    const { User, Tenant } = initAuth();
    const userId = req.user.id;
    try {
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ msg: "User not found" });

        const tenant = await Tenant.findByPk(user.tenant_id);
        if (!tenant) return res.status(404).json({ msg: "Tenant not found" });

        if (tenant.subscription_status !== 'pending' && tenant.subscription_plan !== 'Free' && tenant.subscription_plan !== 'Trial') {
            // Allow re-activating trial if plan is 'Trial' but status weird, but generally only if pending or Free
            if (tenant.subscription_status !== 'pending' && tenant.subscription_plan !== 'Free') {
                return res.status(400).json({ msg: "Trial already active or plan selected" });
            }
        }

        tenant.subscription_status = 'Active';
        tenant.subscription_plan = 'Trial';
        tenant.subscription_expiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        await tenant.save();

        await sendEmail(user.email, "SwordNex Free Trial Activation", `
            <h1>Your Free Trial is Active!</h1>
            <p>You have successfully activated your 15-day free trial.</p>
            <p>Enjoy full access to SwordNex features.</p>
            <br>
            <a href="https://swordnex-softwares.web.app/dashboard">Go to Dashboard</a>
        `);

        res.json({ msg: "Trial started successfully", tenant });
    } catch (err) {
        console.error("Start Trial Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.saveOnboardingDetails = async (req, res) => {
    const { User, Tenant } = initAuth();
    const { job_title, company_size, discovery_source } = req.body;
    const userId = req.user.id;

    try {
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ msg: "User not found" });

        if (job_title) user.job_title = job_title;
        if (discovery_source) user.discovery_source = discovery_source;
        await user.save();

        if (company_size) {
            const tenant = await Tenant.findByPk(user.tenant_id);
            if (tenant) {
                tenant.company_size = company_size;
                await tenant.save();
            }
        }

        res.json({ msg: "Onboarding details saved successfully" });
    } catch (err) {
        console.error("Onboarding Error:", err);
        res.status(500).send("Server Error");
    }
};
exports.updateProfile = async (req, res) => {
    const { User, Tenant } = initAuth();
    const { businessName, phone, gstin, pan, address, industry } = req.body;
    const userId = req.user.id;

    try {
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ msg: "User not found" });

        const tenant = await Tenant.findByPk(user.tenant_id);
        if (!tenant) return res.status(404).json({ msg: "Tenant not found" });

        // Update fields
        if (businessName) tenant.name = businessName;
        if (phone) tenant.phone = phone;
        if (gstin) tenant.gstin = gstin;
        if (pan) tenant.pan_number = pan;
        if (industry) tenant.industry = industry;
        if (address) {
            // Store address as JSON string
            tenant.address = JSON.stringify(address);
        }

        await tenant.save();

        res.json({ msg: "Profile updated successfully", tenant });

    } catch (err) {
        console.error("Update Profile Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.superAdminLogin = async (req, res) => {
    const { User, Tenant, db, bcrypt, jwt } = initAuth();
    const { email } = req.body;
    const ALLOWED_ADMIN_EMAILS = ["najbudeendeen@gmail.com", "sabilling@swordnex.com"];

    if (!ALLOWED_ADMIN_EMAILS.includes(email)) {
        return res.status(403).json({ msg: "Access Denied: Not a Super Admin" });
    }

    try {
        let user = await User.findOne({ where: { email } });

        if (!user) {
            const t = await db.sequelize.transaction();
            try {
                const tenant = await Tenant.create({
                    name: "System Admin",
                    email: email,
                    subscription_plan: "Premium",
                    subscription_status: "Active"
                }, { transaction: t });

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash("SystemAdmin123!", salt);

                user = await User.create({
                    name: "Super Admin",
                    email: email,
                    password: hashedPassword,
                    role: 'Superadmin',
                    tenant_id: tenant.id
                }, { transaction: t });

                await t.commit();
            } catch (e) {
                await t.rollback();
                throw e;
            }
        } else {
            if (user.role !== 'Superadmin') {
                user.role = 'Superadmin';
                await user.save();
            }
        }

        const payload = {
            user: {
                id: user.id,
                role: 'Superadmin',
                tenant_id: user.tenant_id
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) return res.status(500).json({ msg: 'Token generation failed' });
                res.json({ token, user });
            }
        );

    } catch (err) {
        console.error("Super Admin Login Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.logout = async (req, res) => {
    const { db } = initAuth();
    const userId = req.user.id;

    try {
        const UserSession = db.UserSession;
        // Update all active sessions for this user to have a logout time
        await UserSession.update(
            { logout_time: new Date() },
            {
                where: {
                    user_id: userId,
                    logout_time: null
                }
            }
        );

        res.json({ msg: "Logged out successfully" });
    } catch (err) {
        console.error("Logout Error:", err);
        res.status(500).send("Server Error");
    }
};
