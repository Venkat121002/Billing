const { db, admin } = require('../config/firebase');
const { getCollection, fetchUnifiedData } = require('../utils/dbUtils');
const cashfree = require('../config/cashfree');
const crypto = require('crypto');
const { TRIAL_DAYS, addDays } = require('../utils/subscription');

// MongoDB models
const { Owner: OwnerModel, SubscriptionDetail: SubscriptionDetailModel } = require('../models/mongodb');
const planStore = require('../utils/planStore');

// Determine which database to use
const DB_TYPE = process.env.DB_TYPE || 'mongodb';

// Per-seat add-on price is not part of the Free/Standard/Premium plan config
// (superadmin doesn't manage it yet) — Standard/Premium prices themselves
// come from the Plan collection, set on the superadmin Plans page.
const ADDITIONAL_USER_UNIT_PRICE = 15;

// @desc    Create Cashfree Order for Subscription
// @route   POST /api/v2/billing/create-order
exports.createSubscriptionOrder = async (req, res) => {
    let orderId;
    try {
        if (!cashfree.enabled) {
            return res.status(503).json({ msg: "Payments are not configured on this server." });
        }

        const { plan, billingCycle } = req.body;

        let amount = 0;
        let count = 0;
        if (plan === 'additional_users') {
            count = req.body.count == null ? 1 : Number(req.body.count);
            if (!Number.isSafeInteger(count) || count < 1) {
                return res.status(400).json({ msg: "Enter a valid number of additional users." });
            }
            amount = ADDITIONAL_USER_UNIT_PRICE * count;
        } else {
            if (!['standard', 'premium'].includes(plan)) {
                return res.status(400).json({ msg: "Invalid plan selected" });
            }
            if (!['monthly', 'yearly'].includes(billingCycle)) {
                return res.status(400).json({ msg: "Invalid billing cycle" });
            }

            const planDoc = await planStore.getPlan(plan);
            amount = planDoc ? (billingCycle === 'monthly' ? planDoc.monthly : planDoc.yearly) : 0;

            if (!(amount > 0)) {
                return res.status(400).json({ msg: "This plan isn't available for purchase yet. Please contact support." });
            }
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ msg: "The selected purchase amount is invalid." });
        }

        console.log(`Creating Cashfree order for ${plan} - ${billingCycle}: ₹${amount}`);

        // Fetch user/owner details for prefill
        const ownerId = req.user?.userId || req.ownerId;
        if (!ownerId) return res.status(401).json({ msg: "Please sign in to purchase a subscription." });
        let ownerDoc = null;
        if (DB_TYPE === 'mongodb') {
            ownerDoc = await OwnerModel.findOne({ userId: ownerId, tenantId: process.env.TENANT_ID }).lean();
        } else {
            const doc = await db.collection('SwordNexBillingSoftware').doc(process.env.TENANT_ID).collection('owner').doc(ownerId).get();
            if (doc.exists) ownerDoc = doc.data();
        }
        if (!ownerDoc) return res.status(404).json({ msg: "Account owner record not found." });

        const customerPhone = ownerDoc?.phone || ownerDoc?.mobile || ownerDoc?.companyDetails?.phone || '9999999999';
        const customerEmail = ownerDoc?.email || req.user?.email || 'billing@swordnex.com';
        const customerName = ownerDoc?.firstName || ownerDoc?.name || ownerDoc?.companyDetails?.name || 'SwordNex User';

        const safeOwnerTag = String(ownerId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
        orderId = `sub_${Date.now().toString().slice(-8)}_${safeOwnerTag}_${Math.random().toString(36).slice(2, 6)}`;

        await paymentStore.createPayment({
            tenantId: process.env.TENANT_ID,
            ownerId: String(ownerId),
            kind: 'subscription',
            plan,
            billingCycle: billingCycle || 'one-time',
            count,
            amount,
            orderId,
            status: 'created'
        });

        const order = await cashfree.createOrder({
            orderId,
            orderAmount: amount,
            orderCurrency: 'INR',
            customerDetails: {
                customer_id: String(ownerId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50),
                customer_phone: customerPhone,
                customer_email: customerEmail,
                customer_name: customerName
            },
            orderNote: `${plan === 'additional_users' ? 'Additional Users' : plan} (${billingCycle || 'one-time'})`,
            orderTags: {
                ownerId: String(ownerId),
                plan: String(plan),
                billingCycle: String(billingCycle || 'one-time'),
                count: String(count)
            }
        });

        res.json({
            orderId: order.order_id,
            paymentSessionId: order.payment_session_id,
            amount: order.order_amount,
            currency: order.order_currency,
            environment: cashfree.environment
        });

    } catch (err) {
        console.error("Create Cashfree Order Error:", err.response?.data || err.message);
        if (orderId) {
            try {
                await paymentStore.markFailed(orderId, 'Order creation failed');
            } catch (storeErr) {
                console.error('[cashfree subscription] failed to mark order creation as failed:', storeErr.message);
            }
        }
        res.status(500).json({ msg: err.response?.data?.message || "Could not initiate payment order." });
    }
};

const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { sendEmail } = require('../utils/emailService');
const emailTemplates = require('../utils/emailTemplates');
const { sendInvoicePdf, sendInvoiceText } = require('../utils/whatsappNotify');
const billDelivery = require('../utils/billDelivery');
const platformStore = require('../utils/platformStore');
const { normalizePhone } = require('../utils/whatsappService');
const paymentStore = require('../utils/paymentStore');

// @desc    Verify Cashfree Payment & Update Subscription
// @route   POST /api/v2/billing/verify-payment
exports.verifySubscriptionPayment = async (req, res) => {
    try {
        if (!cashfree.enabled) {
            return res.status(503).json({ msg: "Payments are not configured on this server." });
        }

        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ msg: "Order ID is required for verification." });
        }

        const payment = await paymentStore.findPayment(orderId);
        if (payment && (payment.kind !== 'subscription' || payment.ownerId !== req.user.userId)) {
            return res.status(403).json({ msg: "Payment verification failed: Account mismatch." });
        }

        const order = await cashfree.getOrder(orderId);
        if (!order) {
            return res.status(404).json({ msg: "Order not found on payment gateway." });
        }
        if (!payment && order.order_tags?.ownerId !== req.user.userId) {
            return res.status(403).json({ msg: "Payment verification failed: Account mismatch." });
        }

        const payments = await cashfree.getOrderPayments(orderId);
        const successfulPayment = payments.find((p) => p.payment_status === 'SUCCESS');

        if (order.order_status !== 'PAID' || !successfulPayment) {
            return res.status(400).json({ msg: `Payment not completed yet (status: ${order.order_status}).` });
        }

        const result = await exports.settleSubscriptionOrder(orderId, order, successfulPayment);
        if (!result) return res.status(400).json({ msg: "Payment could not be reconciled. Contact support with the order ID." });
        res.json({ msg: "Subscription updated successfully" });

    } catch (err) {
        console.error("Verify Payment Error:", err);
        res.status(500).send("Server Error");
    }
};

exports.settleSubscriptionOrder = async (orderId, order, successfulPayment) => {
    const tags = order?.order_tags || {};
    let payment = await paymentStore.findPayment(orderId);
    if (!payment) {
        if (order?.order_status !== 'PAID' || successfulPayment?.payment_status !== 'SUCCESS' ||
            !tags.ownerId || !['standard', 'premium', 'additional_users'].includes(tags.plan)) return null;

        const billingCycle = tags.billingCycle || 'one-time';
        const count = Number(tags.count || 0);
        const amount = Number(order.order_amount);
        if ((tags.plan === 'additional_users' && (!Number.isSafeInteger(count) || count < 1 || amount !== ADDITIONAL_USER_UNIT_PRICE * count)) ||
            (tags.plan !== 'additional_users' && !['monthly', 'yearly'].includes(billingCycle)) ||
            !Number.isFinite(amount) || amount <= 0) return null;

        let priorHistory;
        if (DB_TYPE === 'mongodb') {
            priorHistory = await SubscriptionDetailModel.findOne({
                tenantId: process.env.TENANT_ID, ownerId: tags.ownerId, orderId
            }).lean();
        } else {
            const ownerRef = db.collection('SwordNexBillingSoftware').doc(process.env.TENANT_ID)
                .collection('owner').doc(tags.ownerId);
            const ownerDoc = await ownerRef.get();
            if (!ownerDoc.exists) return null;
            const history = await ownerRef.collection('subscriptiondetails')
                .where('orderId', '==', orderId).limit(1).get();
            priorHistory = history.empty ? null : history.docs[0].data();
            if (priorHistory) {
                await ownerRef.update({
                    processedCashfreeOrderIds: admin.firestore.FieldValue.arrayUnion(orderId)
                });
            }
        }
        if (DB_TYPE === 'mongodb' && priorHistory) {
            await OwnerModel.updateOne(
                { userId: tags.ownerId, tenantId: process.env.TENANT_ID },
                { $addToSet: { processedCashfreeOrderIds: orderId } }
            );
        }

        try {
            payment = await paymentStore.createPayment({
                tenantId: process.env.TENANT_ID,
                ownerId: tags.ownerId,
                kind: 'subscription',
                plan: tags.plan,
                billingCycle,
                count,
                amount,
                orderId,
                status: priorHistory ? 'paid' : 'created',
                paymentId: priorHistory ? String(successfulPayment.cf_payment_id || order.cf_order_id || orderId) : undefined,
                paidAt: priorHistory ? new Date().toISOString() : undefined
            });
        } catch (err) {
            if (err.code !== 11000 && err.code !== 6 && err.code !== 'already-exists') throw err;
            payment = await paymentStore.findPayment(orderId);
            if (!payment) throw err;
        }
    }
    if (payment.kind !== 'subscription') return null;
    if (payment.status === 'paid') return { payment, applied: false };

    const amount = Number(order?.order_amount);
    const successfulAmount = successfulPayment?.payment_amount == null
        ? amount
        : Number(successfulPayment.payment_amount);
    const expectedAmount = Number(payment.amount);
    if (order?.order_status !== 'PAID' ||
        !successfulPayment || successfulPayment.payment_status !== 'SUCCESS' ||
        tags.ownerId !== payment.ownerId ||
        tags.plan !== payment.plan ||
        tags.billingCycle !== (payment.billingCycle || 'one-time') ||
        Number(tags.count || 0) !== Number(payment.count || 0) ||
        !Number.isFinite(amount) || Math.abs(amount - expectedAmount) >= 0.01 ||
        !Number.isFinite(successfulAmount) || Math.abs(successfulAmount - expectedAmount) >= 0.01) {
        console.error('[cashfree subscription] order metadata or amount mismatch:', orderId);
        return null;
    }

    const tenantId = payment.tenantId;
    const ownerId = payment.ownerId;
    const plan = payment.plan;
    const billingCycle = payment.billingCycle || 'one-time';
    const count = Number(payment.count || 0);
    const paymentId = String(successfulPayment.cf_payment_id || order.cf_order_id || orderId);
    const startDate = new Date();
    let periodBase = startDate;
    let invoiceStartDate = startDate;
    let invoiceEndDate;
    let ownerEmail;
    let ownerName;
    let applied = false;

    if (DB_TYPE === 'mongodb') {
        const owner = await OwnerModel.findOne({ userId: ownerId, tenantId }).lean();
        if (!owner) throw new Error(`Subscription owner not found for Cashfree order ${orderId}`);
        const currentEnd = owner.subscription?.endDate ? new Date(owner.subscription.endDate) : null;
        if (plan !== 'additional_users' && currentEnd && currentEnd > startDate) periodBase = currentEnd;
        const endDate = new Date(periodBase);
        if (billingCycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
        else if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
        else if (billingCycle === '3years') endDate.setFullYear(endDate.getFullYear() + 3);
        invoiceEndDate = endDate;

        const update = {
            $addToSet: { processedCashfreeOrderIds: orderId },
            $set: { lastPaymentId: paymentId, lastOrderId: orderId }
        };
        if (plan === 'additional_users') {
            update.$inc = { additionalSubUsers: count };
        } else {
            Object.assign(update.$set, {
                'subscription.plan': plan,
                'subscription.status': 'Active',
                'subscription.startDate': startDate.toISOString(),
                'subscription.endDate': endDate.toISOString(),
                'subscription.billingCycle': billingCycle,
                'subscription.paymentId': paymentId,
                'subscription.orderId': orderId,
                'subscription.amount': amount,
                'subscription.paymentMethod': 'cashfree',
                'subscription.check': 'active'
            });
        }
        const changed = await OwnerModel.updateOne(
            { userId: ownerId, tenantId, processedCashfreeOrderIds: { $ne: orderId } },
            update
        );
        applied = changed.modifiedCount > 0;
        ownerEmail = owner.email || '';
        ownerName = owner.firstName || owner.companyDetails?.name || 'Valued Customer';
        await SubscriptionDetailModel.updateOne(
            { cashfreeOrderId: orderId },
            { $setOnInsert: {
                tenantId, ownerId, plan, billingCycle, amount, paymentId, orderId, cashfreeOrderId: orderId,
                paymentMethod: 'cashfree', startDate: startDate.toISOString(),
                endDate: endDate.toISOString(), createdBy: ownerId,
                createdAt: new Date().toISOString()
            } },
            { upsert: true }
        );
    } else {
        const ownerRef = db.collection('SwordNexBillingSoftware').doc(tenantId).collection('owner').doc(ownerId);
        const historyRef = ownerRef.collection('subscriptiondetails').doc(orderId);
        const transactionResult = await db.runTransaction(async (transaction) => {
            const ownerDoc = await transaction.get(ownerRef);
            const historyDoc = await transaction.get(historyRef);
            if (!ownerDoc.exists) throw new Error(`Subscription owner not found for Cashfree order ${orderId}`);
            const owner = ownerDoc.data();
            const processed = owner.processedCashfreeOrderIds || [];
            const firstApplication = !processed.includes(orderId);
            let currentEnd = owner.subscription?.endDate ? new Date(owner.subscription.endDate) : null;
            const transactionStart = new Date();
            let transactionBase = transactionStart;
            if (plan !== 'additional_users' && currentEnd && currentEnd > transactionStart) transactionBase = currentEnd;
            const transactionEnd = new Date(transactionBase);
            if (billingCycle === 'monthly') transactionEnd.setMonth(transactionEnd.getMonth() + 1);
            else if (billingCycle === 'yearly') transactionEnd.setFullYear(transactionEnd.getFullYear() + 1);
            else if (billingCycle === '3years') transactionEnd.setFullYear(transactionEnd.getFullYear() + 3);

            const ownerUpdate = {
                processedCashfreeOrderIds: admin.firestore.FieldValue.arrayUnion(orderId),
                lastPaymentId: paymentId,
                lastOrderId: orderId
            };
            if (firstApplication && plan === 'additional_users') {
                ownerUpdate.additionalSubUsers = admin.firestore.FieldValue.increment(count);
            } else if (firstApplication) {
                Object.assign(ownerUpdate, {
                    'subscription.plan': plan,
                    'subscription.status': 'Active',
                    'subscription.startDate': transactionStart.toISOString(),
                    'subscription.endDate': transactionEnd.toISOString(),
                    'subscription.billingCycle': billingCycle,
                    'subscription.paymentId': paymentId,
                    'subscription.orderId': orderId,
                    'subscription.amount': amount,
                    'subscription.paymentMethod': 'cashfree',
                    'subscription.check': 'active'
                });
            }
            if (firstApplication) transaction.update(ownerRef, ownerUpdate);
            if (!historyDoc.exists) {
                transaction.create(historyRef, {
                    plan, billingCycle, amount, paymentId, orderId,
                    paymentMethod: 'cashfree',
                    startDate: transactionStart.toISOString(),
                    endDate: transactionEnd.toISOString(),
                    createdAt: transactionStart.toISOString(),
                    createdBy: ownerId
                });
            }
            return { owner, firstApplication, transactionStart, transactionEnd };
        });
        applied = transactionResult.firstApplication;
        invoiceStartDate = transactionResult.transactionStart;
        invoiceEndDate = transactionResult.transactionEnd;
        ownerEmail = transactionResult.owner.email || '';
        ownerName = transactionResult.owner.name || transactionResult.owner.username || 'Valued Customer';
    }

    const finalizedPayment = await paymentStore.markPaid(orderId, { paymentId, method: 'Cashfree' });
    if (!finalizedPayment) {
        const currentPayment = await paymentStore.findPayment(orderId);
        if (currentPayment?.status !== 'paid') {
            throw new Error(`Could not finalize Cashfree subscription order ${orderId}`);
        }
    }

    if (applied && ownerEmail) {
        try {
            const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
            const pdfBuffer = await generateInvoicePDF({
                invoiceNo, ownerName, ownerEmail, plan, billingCycle, amount,
                paymentId, startDate: invoiceStartDate.toLocaleDateString(), endDate: invoiceEndDate.toLocaleDateString()
            });
            await sendEmail({
                to: ownerEmail,
                ...emailTemplates.subscriptionConfirmed({ name: ownerName, plan, amount, startDate: invoiceStartDate, endDate: invoiceEndDate, invoiceNo }),
                attachment: { name: `Invoice_${invoiceNo}.pdf`, content: pdfBuffer.toString('base64') }
            });
            console.log(`Invoice email sent to ${ownerEmail}`);
        } catch (emailErr) {
            console.error("Failed to send subscription email:", emailErr.message);
        }
    }
    return { payment, applied };
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

                await sendEmail({
                    to: ownerEmail,
                    ...emailTemplates.trialStarted({ name: ownerName, startDate, endDate, trialDays: TRIAL_DAYS })
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
        const billOwnerId = role === 'owner' ? userId : ownerId;
        // The invoice number is always assigned here (never trusted from the
        // client), so every bill in the business gets the next unique number.
        const { number: invoiceNumber, receiptNo } = await platformStore.takeNextInvoiceNumber(billOwnerId);
        const billData = {
            ...req.body,
            receiptNo,
            invoiceNumber,
            ownerId: billOwnerId,
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


// @desc    Send a saved POS bill to the customer's WhatsApp, as a PDF or as a
//          text summary depending on the store's delivery mode (utils/billDelivery.js)
// @route   POST /api/v2/billing/bills/:id/whatsapp
//          body: the receipt PDF (application/octet-stream); not needed in text mode
exports.sendBillWhatsapp = async (req, res) => {
    try {
        const owner = await platformStore.getOwner(req.user.ownerId);
        const mode = await billDelivery.effectiveMode(owner);

        const pdf = Buffer.isBuffer(req.body) && req.body.length ? req.body : req.rawBody;
        if (mode === 'pdf' && (!pdf || !pdf.length || pdf.subarray(0, 5).toString() !== '%PDF-')) {
            return res.status(400).json({ msg: 'The bill PDF is missing or invalid.' });
        }

        const billRef = getCollection(req, 'bills').doc(req.params.id);
        const doc = await billRef.get();
        if (!doc.exists) return res.status(404).json({ msg: 'Bill not found' });
        const bill = doc.data();

        if (!normalizePhone(bill.customerPhone)) {
            return res.status(400).json({ msg: 'This bill has no valid customer mobile number.' });
        }

        const result = mode === 'text'
            ? await sendInvoiceText(bill, owner?.companyDetails?.name)
            : await sendInvoicePdf(bill, pdf, { businessName: owner?.companyDetails?.name, ownerGstin: owner?.companyDetails?.gstin || owner?.gstin });
        await billRef.update({
            whatsappSentAt: new Date().toISOString(),
            whatsappMessageId: result.messageId || null,
            whatsappMode: mode
        });

        res.json({ msg: 'Bill sent on WhatsApp', to: bill.customerPhone, mode });
    } catch (err) {
        console.error('Send Bill WhatsApp Error:', err.message);
        res.status(502).json({ msg: 'Could not send the bill on WhatsApp. ' + err.message.replace(/^Meta WhatsApp[^:]*: /, '') });
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

        const template = type === 'paid'
            ? emailTemplates.subscriptionConfirmed({ name: testName, plan: 'Premium', amount: 999, startDate, endDate, test: true })
            : emailTemplates.trialStarted({ name: testName, startDate, endDate, trialDays: TRIAL_DAYS, test: true });

        await sendEmail({ to: email, ...template });

        res.json({ msg: "Test email sent successfully", to: email });
    } catch (err) {
        console.error("Test Email Error:", err);
        res.status(500).json({ msg: "Failed to send test email", error: err.message });
    }
};
