const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const db = require('../models');
let db = {};
try {
    db = require('../models');
} catch (err) {
    console.warn("⚠️ Database models failed to load in authController:", err.message);
}

const User = db.User || {};
const Tenant = db.Tenant || {};
const Invoice = db.Invoice || {};
const Site = db.Site || {};
const Subscription = db.Subscription || {};
const crypto = require('crypto');
const axios = require('axios');
const { Op } = require('sequelize');
const { db: firebaseDb } = require('../config/firebase');

exports.register = async (req, res) => {
    const { name, email, password, tenant_name, firebase_tenant_id, firebase_uid } = req.body;

    try {
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create Tenant first
        const tenant = await Tenant.create({
            name: tenant_name,
            email: email,
            firebase_tenant_id: firebase_tenant_id,
            subscription_plan: 'Trial',
            subscription_status: 'Active',
            subscription_expiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
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
            role: 'TenantAdmin'
        });

        try {
            const tenantDocRef = firebaseDb.collection('BillingSoftware').doc(tenant.id);
            await tenantDocRef.set({
                tenantName: tenant.name,
                tenantEmail: tenant.email,
                createdAt: new Date().toISOString(),
                subscriptionStatus: tenant.subscription_status,
                subscriptionPlan: tenant.subscription_plan
            }, { merge: true });
            await tenantDocRef.collection('owners').doc(user.id).set({
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: new Date().toISOString()
            }, { merge: true });
            console.log('Firestore: BillingSoftware/%s with owners/%s created', tenant.id, user.id);
        } catch (fsErr) {
            console.error('Firestore write failed:', fsErr.message);
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role,
                tenant_id: user.tenant_id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ msg: "Server error: " + err.message });
    }
};

exports.login = async (req, res) => {
    const { email, loginIdentifier, password } = req.body;
    const identifier = loginIdentifier || email;

    console.log("Login attempt for:", identifier);

    try {
        let user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: identifier },
                    { employee_id: identifier }
                ]
            },
            include: [{ model: Tenant }]
        });

        if (!user) {
            console.log("Login Failed: User not found for identifier:", identifier);
            return res.status(400).json({ msg: 'Invalid Credentials (User not found)' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("Login Failed: Password mismatch for:", identifier);
            return res.status(400).json({ msg: 'Invalid Credentials (Password mismatch)' });
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
            process.env.JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    subscription_status: user.Tenant?.subscription_status || "pending"
                });
            }
        );
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ msg: "Server error: " + err.message });
    }
};

exports.superAdminLogin = async (req, res) => {
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
            process.env.JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user });
            }
        );

    } catch (err) {
        console.error("Super Admin Login Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.startTrial = async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ msg: "User not found" });

        const tenant = await Tenant.findByPk(user.tenant_id);
        if (!tenant) return res.status(404).json({ msg: "Tenant not found" });

        tenant.subscription_status = 'Active';
        tenant.subscription_plan = 'Trial';
        tenant.subscription_expiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        await tenant.save();

        // Send Welcome Email
        try {
            const emailPayload = {
                sender: { name: "SwordNex", email: "noreply@swordnex.in" },
                to: [{ email: user.email }],
                subject: `Free Trial Successful - SwordNex`,
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #CA8A04, #A16207); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Free Trial Successful!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p>Dear ${user.name},</p>
                            <p>Your free trial was successful! Thank you for choosing SwordNex Billing Software.</p>
                            
                            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0; font-weight: bold; color: #374151;">Subscription Details:</p>
                                <table style="width: 100%; margin-top: 10px; font-size: 14px;">
                                    <tr><td style="padding: 5px 0; color: #6b7280;">Plan</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">TRIAL (15 Days)</td></tr>
                                    <tr><td style="padding: 5px 0; color: #6b7280;">Amount</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">Free</td></tr>
                                    <tr><td style="padding: 5px 0; color: #6b7280;">Start Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${new Date().toLocaleDateString()}</td></tr>
                                    <tr><td style="padding: 5px 0; color: #6b7280;">End Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${tenant.subscription_expiry.toLocaleDateString()}</td></tr>
                                </table>
                            </div>
                            
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://swordnex-billing.web.app/login" style="display: inline-block; background-color: #CA8A04; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login and Continue</a>
                            </div>
                            
                            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Best regards,<br>The SwordNex Team</p>
                        </div>
                    </div>
                `
            };
            await axios.post("https://api.brevo.com/v3/smtp/email", emailPayload, {
                headers: {
                    "api-key": process.env.BREVO_API_KEY,
                    "content-type": "application/json"
                }
            });
        } catch (emailErr) {
            console.error("Trial email failed:", emailErr.message);
        }

        res.json({ msg: "Trial started successfully", tenant });
    } catch (err) {
        console.error("Start Trial Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.saveOnboardingDetails = async (req, res) => {
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
    const { businessName, phone, gstin, pan, address } = req.body;
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
        if (address) {
            // Store address as JSON string
            tenant.address = typeof address === 'string' ? address : JSON.stringify(address);
        }

        await tenant.save();

        res.json({ msg: "Profile updated successfully", tenant });

    } catch (err) {
        console.error("Update Profile Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.logout = async (req, res) => {
    res.json({ msg: "Logged out successfully" });
};

exports.googleLogin = async (req, res) => {
    const { email, name, googleId, photoURL } = req.body;
    console.log("Google Login Request:", { email, name, googleId, photoURL });

    if (!email) {
        return res.status(400).json({ msg: "Email is required from Google provider" });
    }

    try {
        let user = await User.findOne({ where: { email } });

        if (user) {
            // User exists, generate token
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
                process.env.JWT_SECRET,
                { expiresIn: 360000 },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token, user });
                }
            );
        } else {
            // Create Tenant and User
            const t = await db.sequelize.transaction();

            try {
                // Fallback for name if missing
                const displayName = name || email.split('@')[0];

                const tenant = await Tenant.create({
                    name: `${displayName}'s Business`,
                    email: email,
                    subscription_plan: 'Trial',
                    subscription_status: 'Active',
                    subscription_expiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
                }, { transaction: t });

                const site = await db.Site.create({
                    tenant_id: tenant.id,
                    name: "Main Site",
                    domain: "main"
                }, { transaction: t });

                const salt = await bcrypt.genSalt(10);
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
                    process.env.JWT_SECRET,
                    { expiresIn: 360000 },
                    (err, token) => {
                        if (err) throw err;
                        res.json({ token, user });
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
    const { email } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        // Generate token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and save to DB
        user.reset_password_token = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.reset_password_expires = Date.now() + 3600000; // 1 hour

        await user.save();

        // Create reset URL
        const resetUrl = `${req.headers.origin}/forgot-password?oobCode=${resetToken}`;

        // Send email via Brevo
        const emailPayload = {
            sender: { name: "SwordNex", email: "noreply@swordnex.in" },
            to: [{ email: user.email }],
            subject: "Password Reset Request",
            htmlContent: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset. Please click the link below to reset your password:</p>
                <a href="${resetUrl}" style="background-color: #CA8A04; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not request this, please ignore this email.</p>
            `
        };

        await axios.post("https://api.brevo.com/v3/smtp/email", emailPayload, {
            headers: {
                "api-key": process.env.BREVO_API_KEY,
                "content-type": "application/json"
            }
        });

        res.json({ msg: "Email sent" });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;

    try {
        // Hash token to match DB
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

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Clear reset token
        user.reset_password_token = null;
        user.reset_password_expires = null;

        await user.save();

        res.json({ msg: "Password updated successfully" });
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
};

exports.updateSubscription = async (req, res) => {
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

        // Calculate expiry
        let expiryDate = new Date();
        if (billingCycle === 'monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else if (billingCycle === 'yearly') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else if (billingCycle === '3years') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 3);
        }

        // Update Tenant
        tenant.subscription_plan = plan.charAt(0).toUpperCase() + plan.slice(1); // Capitalize (standard -> Standard)
        tenant.subscription_status = 'Active';
        tenant.subscription_expiry = expiryDate;
        await tenant.save();

        // Send Activation Email via Brevo
        const emailPayload = {
            sender: { name: "SwordNex", email: "noreply@swordnex.in" },
            to: [{ email: user.email }],
            subject: `Subscription Successful - ${tenant.subscription_plan} Plan`,
            htmlContent: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Successful!</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>Dear ${user.name},</p>
                        <p>Your subscription was successful! Thank you for choosing SwordNex Billing Software.</p>
                        
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; font-weight: bold; color: #374151;">Subscription Details:</p>
                            <table style="width: 100%; margin-top: 10px; font-size: 14px;">
                                <tr><td style="padding: 5px 0; color: #6b7280;">Plan</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${tenant.subscription_plan.toUpperCase()}</td></tr>
                                <tr><td style="padding: 5px 0; color: #6b7280;">Amount Paid</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">₹${amount}</td></tr>
                                <tr><td style="padding: 5px 0; color: #6b7280;">Start Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${new Date().toLocaleDateString()}</td></tr>
                                <tr><td style="padding: 5px 0; color: #6b7280;">End Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${expiryDate.toLocaleDateString()}</td></tr>
                            </table>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://swordnex-billing.web.app/login" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login and Continue</a>
                        </div>
                        
                        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Payment ID: ${paymentId}</p>
                        <p style="margin-top: 20px;">Best regards,<br>The SwordNex Team</p>
                    </div>
                </div>
            `
        };

        await axios.post("https://api.brevo.com/v3/smtp/email", emailPayload, {
            headers: {
                "api-key": process.env.BREVO_API_KEY,
                "content-type": "application/json"
            }
        });

        res.json({ msg: "Subscription updated successfully", tenant });

    } catch (err) {
        console.error("Update Subscription Error:", err);
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
};

exports.deleteAccount = async (req, res) => {
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

        // Delete related data
        await Invoice.destroy({ where: { tenant_id: tenantId }, transaction: t });
        await Site.destroy({ where: { tenant_id: tenantId }, transaction: t });
        await Subscription.destroy({ where: { tenant_id: tenantId }, transaction: t });
        await User.destroy({ where: { tenant_id: tenantId }, transaction: t });

        // Delete Tenant
        await tenant.destroy({ transaction: t });

        await t.commit();
        res.json({ msg: "Account deleted successfully" });

    } catch (err) {
        await t.rollback();
        console.error("Delete Account Error:", err);
        res.status(500).json({ msg: "Server Error: " + err.message });
    }
};
