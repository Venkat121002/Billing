const { db, admin } = require('../config/firebase');
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');
const { instance: razorpay, enabled: razorpayEnabled } = require('../config/razorpay');
const crypto = require('crypto');
const { TRIAL_DAYS, addDays } = require('../utils/subscription');

// MongoDB models
const { Owner: OwnerModel, SubscriptionDetail: SubscriptionDetailModel } = require('../models/mongodb');

// Determine which database to use
const DB_TYPE = process.env.DB_TYPE || 'mongodb';

// Billing Plans Configuration
const PLANS = {
    standard: {
        monthly: 1,
        yearly: 1, // Adjust logic if needed (e.g., 10 * 12 * discount) - Matching frontend hardcoded for now
        threeyear: 7999
    },
    premium: {
        monthly: 1,
        yearly: 1,
        threeyear: 12999
    },
    additional_users: {
        unitPrice: 15
    }
};

// @desc    Create Razorpay Order for Subscription
// @route   POST /api/v2/billing/create-order
exports.createSubscriptionOrder = async (req, res) => {
    try {
        if (!razorpayEnabled) {
            return res.status(503).json({ msg: "Payments are not configured on this server." });
        }

        const { plan, billingCycle } = req.body;

        if (!PLANS[plan]) {
            return res.status(400).json({ msg: "Invalid plan selected" });
        }

        let amount = 0;
        if (plan === 'additional_users') {
            const count = parseInt(req.body.count) || 1;
            amount = PLANS.additional_users.unitPrice * count;
        } else {
            if (billingCycle === 'monthly') amount = PLANS[plan].monthly;
            else if (billingCycle === 'yearly') amount = PLANS[plan].yearly;
            else if (billingCycle === '3years') amount = PLANS[plan].threeyear;
        }

        // Note: Frontend seems to have specific logic (10/mo, 11/yr??). 
        // I will trust the PLAN constants I defined above which mirror the initial view of the file or standard logic.
        // For safety, let's log what we are processing.
        console.log(`Creating order for ${plan} - ${billingCycle}: ${amount}`);

        const ownerIdTag = req.ownerId ? req.ownerId.slice(0, 5) : 'unknown';
        const options = {
            amount: amount * 100, // Amount in paise
            currency: "INR",
            receipt: `rcpt_${Date.now().toString().slice(-10)}_${ownerIdTag}`, // Safe receipt ID
            notes: {
                ownerId: req.ownerId || 'no_owner',
                plan,
                billingCycle: billingCycle || 'one-time',
                count: req.body.count || 0
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (err) {
        console.error("Create Order Error:", err);
        res.status(500).send("Server Error");
    }
};

const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { sendEmail } = require('../utils/emailService');

// @desc    Verify Razorpay Payment & Update Subscription
// @route   POST /api/v2/billing/verify-payment
exports.verifySubscriptionPayment = async (req, res) => {
    try {
        if (!razorpayEnabled) {
            return res.status(503).json({ msg: "Payments are not configured on this server." });
        }

        const { paymentId, orderId, signature } = req.body;
        const tenantId = process.env.TENANT_ID;

        // 1. Verify Signature
        const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(orderId + "|" + paymentId)
            .digest('hex');

        if (generated_signature !== signature) {
            return res.status(400).json({ msg: "Payment verification failed" });
        }

        // 1b. Take plan/cycle/amount from the order WE created, never from the browser
        //     (otherwise someone could pay for the cheapest plan and claim the 3-year one).
        const order = await razorpay.orders.fetch(orderId);
        if (order.notes?.ownerId !== req.ownerId || order.status !== 'paid') {
            return res.status(400).json({ msg: "Payment verification failed" });
        }
        const plan = order.notes.plan;
        const billingCycle = order.notes.billingCycle;
        req.body.count = order.notes.count;
        req.body.amount = order.amount / 100; // rupees (matches what the app has always stored)

        // 2. Calculate Dates
        const startDate = new Date();
        // Unused days (trial or current plan) carry over: the new period is appended after them.
        let periodBase = startDate;
        if (plan !== 'additional_users' && DB_TYPE === 'mongodb') {
            const current = await OwnerModel.findOne({ userId: req.user.userId, tenantId }).lean();
            const currentEnd = current?.subscription?.endDate ? new Date(current.subscription.endDate) : null;
            if (currentEnd && currentEnd > startDate) periodBase = currentEnd;
        }
        const endDate = new Date(periodBase);

        if (billingCycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
        else if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
        else if (billingCycle === '3years') endDate.setFullYear(endDate.getFullYear() + 3);

        let ownerEmail, ownerName;

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            const owner = await OwnerModel.findOne({ userId: req.user.userId, tenantId });
            const ownerData = owner ? owner.toObject() : {};
            ownerEmail = ownerData.email || req.user.email;
            ownerName = ownerData.firstName || ownerData.companyDetails?.name || "Valued Customer";

            // 3. Update Tenant Subscription or Additional Users
            if (plan === 'additional_users') {
                const count = parseInt(req.body.count) || 0;
                await OwnerModel.updateOne(
                    { userId: req.user.userId, tenantId },
                    {
                        $inc: { additionalSubUsers: count },
                        $set: { lastPaymentId: paymentId, lastOrderId: orderId }
                    }
                );
            } else {
                await OwnerModel.updateOne(
                    { userId: req.user.userId, tenantId },
                    {
                        $set: {
                            'subscription.plan': plan,
                            'subscription.status': 'Active',
                            'subscription.startDate': startDate.toISOString(),
                            'subscription.endDate': endDate.toISOString(),
                            'subscription.billingCycle': billingCycle,
                            'subscription.paymentId': paymentId,
                            'subscription.orderId': orderId,
                            'subscription.amount': req.body.amount || 0,
                            'subscription.paymentMethod': 'razorpay',
                            'subscription.check': 'active' // legacy/compatibility
                        }
                    }
                );
            }

            // 4. Add Subscription History
            await SubscriptionDetailModel.create({
                tenantId,
                ownerId: req.user.userId,
                plan,
                billingCycle,
                amount: req.body.amount || 0,
                paymentId,
                orderId,
                signature,
                paymentMethod: 'razorpay',
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                createdAt: new Date().toISOString(),
                createdBy: req.user.userId
            });

        } else {
            // === FIRESTORE MODE (Original Logic) ===
            const batch = db.batch();
            // Path: SwordNexBillingSoftware/{TENANT_ID}/owner/{UID}
            const ownerDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(req.user.userId);

            // Fetch Key User Details for Email/PDF
            const ownerDoc = await ownerDocRef.get();
            const ownerData = ownerDoc.exists ? ownerDoc.data() : {};
            ownerEmail = ownerData.email || req.user.email; // Fallback if email not in doc
            ownerName = ownerData.name || ownerData.username || "Valued Customer";

            // 3. Update Tenant Subscription or Additional Users
            if (plan === 'additional_users') {
                const count = parseInt(req.body.count) || 0;
                batch.update(ownerDocRef, {
                    'additionalSubUsers': admin.firestore.FieldValue.increment(count),
                    'lastPaymentId': paymentId,
                    'lastOrderId': orderId
                });
            } else {
                batch.update(ownerDocRef, {
                    'subscription.plan': plan,
                    'subscription.status': 'Active',
                    'subscription.startDate': startDate.toISOString(),
                    'subscription.endDate': endDate.toISOString(),
                    'subscription.billingCycle': billingCycle,
                    'subscription.paymentId': paymentId,
                    'subscription.orderId': orderId,
                    'subscription.amount': req.body.amount || 0,
                    'subscription.paymentMethod': 'razorpay',
                    'subscription.check': 'active' // legacy/compatibility
                });
            }

            // 4. Add Subscription History
            const subHistoryRef = ownerDocRef.collection('subscriptiondetails').doc();
            batch.set(subHistoryRef, {
                plan,
                billingCycle,
                amount: req.body.amount || 0,
                paymentId,
                orderId,
                signature,
                paymentMethod: 'razorpay',
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                createdAt: new Date().toISOString(),
                createdBy: req.user.userId
            });

            await batch.commit();
        }

        // 5. Send Email with PDF Invoice
        if (ownerEmail) {
            try {
                const invoiceData = {
                    invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
                    ownerName,
                    ownerEmail,
                    plan,
                    billingCycle,
                    amount: req.body.amount || 0, // rupees
                    paymentId,
                    startDate: startDate.toLocaleDateString(),
                    endDate: endDate.toLocaleDateString()
                };

                const pdfBuffer = await generateInvoicePDF(invoiceData);

                const emailSubject = `Subscription Successful - ${plan} Plan`;
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Successful!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p>Dear ${ownerName},</p>
                            <p>Your subscription was successful! Thank you for choosing SwordNex Billing Software.</p>
                            
                            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0; font-weight: bold; color: #374151;">Subscription Details:</p>
                                <table style="width: 100%; margin-top: 10px; font-size: 14px;">
                                    <tr><td style="padding: 5px 0; color: #6b7280;">Plan</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${plan.toUpperCase()}</td></tr>
                                    <tr><td style="padding: 5px 0; color: #6b7280;">Amount Paid</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">₹${invoiceData.amount.toLocaleString()}</td></tr>
                                    <tr><td style="padding: 5px 0; color: #6b7280;">Start Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${invoiceData.startDate}</td></tr>
                                    <tr><td style="padding: 5px 0; color: #6b7280;">End Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${invoiceData.endDate}</td></tr>
                                </table>
                            </div>
                            
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://swordnex-billing.web.app/login" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login and Continue</a>
                            </div>
                            
                            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Please find your invoice attached for your records.</p>
                            <p style="margin-top: 20px;">Best regards,<br>The SwordNex Team</p>
                        </div>
                    </div>
                `;

                await sendEmail({
                    to: ownerEmail,
                    subject: emailSubject,
                    htmlContent: emailHtml,
                    attachment: {
                        filename: `Invoice_${invoiceData.invoiceNo}.pdf`,
                        content: pdfBuffer
                    }
                });
                console.log(`Invoice email sent to ${ownerEmail}`);
            } catch (emailErr) {
                console.error("Failed to send subscription email:", emailErr.message);
                // Don't fail the verification response if email fails
            }
        }

        res.json({ msg: "Subscription updated successfully" });

    } catch (err) {
        console.error("Verify Payment Error:", err);
        res.status(500).send("Server Error");
    }
};

// @desc    Activate Free Trial
// @route   POST /api/v2/billing/activate-trial
exports.activateTrial = async (req, res) => {
    try {
        const tenantId = process.env.TENANT_ID;
        if (!req.user || !req.user.userId) {
            return res.status(400).json({ msg: "User ID missing. Please re-login." });
        }

        const userId = req.user.userId;
        console.log(`[DEBUG] activateTrial: DB_TYPE=${DB_TYPE}, TenantID=${tenantId}, UserID=${userId}`);

        let data, ownerEmail, ownerName;

        // === MONGODB MODE ===
        if (DB_TYPE === 'mongodb') {
            const owner = await OwnerModel.findOne({ userId, tenantId });

            if (!owner) {
                console.error(`[ERROR] activateTrial: Owner NOT FOUND in MongoDB`);
                return res.status(404).json({
                    msg: "Owner record not found",
                    database: 'mongodb',
                    tenantId,
                    userId
                });
            }

            if (owner.trialUsed) {
                return res.status(400).json({ msg: "Trial already used" });
            }

            // Prevent if already on a paid plan
            if (owner.subscription && owner.subscription.status === 'Active' &&
                owner.subscription.plan !== 'Trial' &&
                owner.subscription.plan !== 'Basic') {
                return res.status(400).json({ msg: "Active subscription exists" });
            }

            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + TRIAL_DAYS);

            await OwnerModel.updateOne(
                { userId, tenantId },
                {
                    $set: {
                        'subscription.plan': 'Trial',
                        'subscription.status': 'Active',
                        'subscription.startDate': startDate.toISOString(),
                        'subscription.endDate': endDate.toISOString(),
                        'trialUsed': true
                    }
                }
            );

            ownerEmail = owner.email;
            ownerName = owner.firstName || owner.companyDetails?.name || "User";

        } else {
            // === FIRESTORE MODE ===
            const ownerDocRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(userId);
            console.log(`[DEBUG] activateTrial: Path=${ownerDocRef.path}`);

            const doc = await ownerDocRef.get();

            if (!doc.exists) {
                console.error(`[ERROR] activateTrial: Document NOT FOUND at ${ownerDocRef.path}`);
                return res.status(404).json({
                    msg: "Owner record not found",
                    path: ownerDocRef.path,
                    tenantId,
                    userId
                });
            }

            data = doc.data();
            if (data.trialUsed) {
                return res.status(400).json({ msg: "Trial already used" });
            }

            // Prevent if already on a paid plan
            if (data.subscription && data.subscription.status === 'Active' &&
                data.subscription.plan !== 'Trial' &&
                data.subscription.plan !== 'Basic') {
                return res.status(400).json({ msg: "Active subscription exists" });
            }

            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + TRIAL_DAYS);

            await ownerDocRef.update({
                'subscription.plan': 'Trial',
                'subscription.status': 'Active',
                'subscription.startDate': startDate.toISOString(),
                'subscription.endDate': endDate.toISOString(),
                'trialUsed': true
            });

            ownerEmail = data.email || req.user.email;
            ownerName = data.name || "User";
        }

        // Send Welcome Email
        if (ownerEmail) {
            try {
                const startDate = new Date();
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + TRIAL_DAYS);

                const emailSubject = `Free Trial Successful - SwordNex`;
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #CA8A04, #A16207); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Free Trial Successful!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p>Dear ${ownerName},</p>
                            <p>Your free trial was successful! Thank you for choosing SwordNex Billing Software.</p>

                            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0; font-weight: bold; color: #374151;">Subscription Details:</p>
                                <table style="width: 100%; margin-top: 10px; font-size: 14px;">
                                    <tr><td style="padding: 5px 0; color: #6b7280;">Plan</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">TRIAL (${TRIAL_DAYS} Days)</td></tr>
                                    <tr><td style="padding: 5px 0; color: #6b7280;">Amount</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">Free</td></tr>
                                    <tr><td style="padding: 5px 0; color: #6b7280;">Start Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${startDate.toLocaleDateString()}</td></tr>
                                    <tr><td style="padding: 5px 0; color: #6b7280;">End Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${endDate.toLocaleDateString()}</td></tr>
                                </table>
                            </div>

                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://swordnex-billing.web.app/login" style="display: inline-block; background-color: #CA8A04; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login and Continue</a>
                            </div>

                            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Explore all premium features immediately. If you have any questions, feel free to reply to this email.</p>
                            <p style="margin-top: 20px;">Best regards,<br>The SwordNex Team</p>
                        </div>
                    </div>
                `;

                await sendEmail({
                    to: ownerEmail,
                    subject: emailSubject,
                    htmlContent: emailHtml
                });
                console.log(`Trial welcome email sent to ${ownerEmail}`);
            } catch (emailErr) {
                console.error("Failed to send trial email:", emailErr.message);
            }
        }

        res.json({ msg: "Trial activated successfully" });

    } catch (err) {
        console.error("Activate Trial Error:", err);
        res.status(500).send("Server Error");
    }
};

// @desc    Get all bills
// @route   GET /api/v2/billing/bills
exports.getBills = async (req, res) => {
    try {
        const bills = await fetchUnifiedData(req, 'bills');
        res.json(bills);
    } catch (err) {
        console.error("Get Bills Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a bill
// @route   POST /api/v2/billing/bills
exports.createBill = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const billData = {
            ...req.body,
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString()
        };

        const collectionRef = getCollection(req, 'bills');
        const docRef = await collectionRef.add(billData);

        res.json({ id: docRef.id, ...billData });
    } catch (err) {
        console.error("Create Bill Error:", err.message);
        res.status(500).send("Server Error");
    }
};


// @desc    Get all GST bills
// @route   GET /api/v2/billing/gst-bills
exports.getGSTBills = async (req, res) => {
    try {
        const bills = await fetchUnifiedData(req, 'gstBills');
        res.json(bills);
    } catch (err) {
        console.error("Get GST Bills Error:", err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a GST bill
// @route   POST /api/v2/billing/gst-bills
exports.createGSTBill = async (req, res) => {
    try {
        const { userId, role, ownerId } = req.user;
        const billData = {
            ...req.body,
            ownerId: role === 'owner' ? userId : ownerId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            isGST: true
        };

        const collectionRef = getCollection(req, 'gstBills');
        const docRef = await collectionRef.add(billData);

        res.json({ id: docRef.id, ...billData });
    } catch (err) {
        console.error("Create GST Bill Error:", err.message);
        res.status(500).send("Server Error");
    }
};


// @desc    Record Payment Success (Stub/Legacy)
// @route   POST /api/v2/billing/payment-success
exports.paymentSuccess = async (req, res) => {
    try {
        console.log("Payment Success Record:", req.body);
        res.json({ msg: "Payment recorded" });
    } catch (err) {
        console.error("Payment Success Error:", err);
        res.status(500).send("Server Error");
    }
};


// @desc    Test Email Notification
// @route   POST /api/v2/billing/test-email
exports.testEmail = async (req, res) => {
    try {
        const { email, name, type } = req.body;
        if (!email) return res.status(400).json({ msg: "Email is required" });

        const testName = name || "Test User";
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + TRIAL_DAYS);

        let emailSubject, emailHtml;

        if (type === 'paid') {
            emailSubject = `Subscription Successful - Premium Plan (TEST)`;
            emailHtml = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Successful! (TEST)</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>Dear ${testName},</p>
                        <p>This is a <b>TEST EMAIL</b> to verify your configuration. Your subscription was successful!</p>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <table style="width: 100%; margin-top: 10px; font-size: 14px;">
                                <tr><td style="padding: 5px 0; color: #6b7280;">Plan</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">PREMIUM (TEST)</td></tr>
                                <tr><td style="padding: 5px 0; color: #6b7280;">Amount Paid</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">₹999 (TEST)</td></tr>
                                <tr><td style="padding: 5px 0; color: #6b7280;">Start Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${startDate.toLocaleDateString()}</td></tr>
                                <tr><td style="padding: 5px 0; color: #6b7280;">End Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${endDate.toLocaleDateString()}</td></tr>
                            </table>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://swordnex-billing.web.app/login" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login and Continue</a>
                        </div>
                    </div>
                </div>
            `;
        } else {
            emailSubject = `Free Trial Successful - SwordNex (TEST)`;
            emailHtml = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #CA8A04, #A16207); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Free Trial Successful! (TEST)</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>Dear ${testName},</p>
                        <p>This is a <b>TEST EMAIL</b>. Your free trial was successful!</p>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <table style="width: 100%; margin-top: 10px; font-size: 14px;">
                                <tr><td style="padding: 5px 0; color: #6b7280;">Plan</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">TRIAL (TEST)</td></tr>
                                <tr><td style="padding: 5px 0; color: #6b7280;">Amount</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">Free (TEST)</td></tr>
                                <tr><td style="padding: 5px 0; color: #6b7280;">Start Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${startDate.toLocaleDateString()}</td></tr>
                                <tr><td style="padding: 5px 0; color: #6b7280;">End Date</td><td style="padding: 5px 0; font-weight: bold; text-align: right;">${endDate.toLocaleDateString()}</td></tr>
                            </table>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://swordnex-billing.web.app/login" style="display: inline-block; background-color: #CA8A04; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login and Continue</a>
                        </div>
                    </div>
                </div>
            `;
        }

        await sendEmail({
            to: email,
            subject: emailSubject,
            htmlContent: emailHtml
        });

        res.json({ msg: "Test email sent successfully", to: email });
    } catch (err) {
        console.error("Test Email Error:", err);
        res.status(500).json({ msg: "Failed to send test email", error: err.message });
    }
};
