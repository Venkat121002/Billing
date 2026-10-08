const cashfree = require('../config/cashfree');
const store = require('../utils/paymentStore');
const platformStore = require('../utils/platformStore');
const { newPayToken, settleOrder, money, esc } = require('../utils/paymentService');
const { sendEmail } = require('../utils/emailService');
const emailTemplates = require('../utils/emailTemplates');
const wa = require('../utils/whatsappService');
const { sendDuesPayLink } = require('../utils/whatsappNotify');
const billingController = require('./firestoreBillingController');

const notConfigured = (res) => res.status(503).json({ msg: 'Online payments are not configured on this server.' });

const publicView = async (credit) => {
    const owner = await platformStore.getOwner(credit.ownerId);
    return {
        business: owner?.companyDetails?.name || 'SwordNex Billing',
        customerName: credit.name || credit.customerName || '',
        total: Number(credit.total || 0),
        paid: Number(credit.credit || 0),
        balance: Number(credit.balance || 0),
        description: credit.description || credit.products?.map((p) => p.description || p.name).filter(Boolean).join(', ') || '',
        environment: cashfree.environment
    };
};

// ---------------------------------------------------------------------------
// Staff (authenticated): create / email a pay link for a credit (dues) record
// ---------------------------------------------------------------------------

const findOwnCredit = (req) => store.findStaffCredit(req.user, req.params.id);

const linkFor = (req, token) => {
    const base = (process.env.FRONTEND_URL || req.get('origin') || '').replace(/\/$/, '');
    return `${base}/pay/${token}`;
};

// @route POST /api/v2/credit/:id/pay-link
exports.createPayLink = async (req, res) => {
    try {
        if (!cashfree.enabled) return notConfigured(res);
        const credit = await findOwnCredit(req);
        if (!credit) return res.status(404).json({ msg: 'Record not found' });
        if (!(Number(credit.balance) > 0)) return res.status(400).json({ msg: 'Nothing is due on this record.' });

        if (!credit.payToken) {
            credit.payToken = newPayToken();
            await store.setPayToken(credit, credit.payToken);
        }
        res.json({ url: linkFor(req, credit.payToken), balance: credit.balance });
    } catch (err) {
        console.error('Create pay link error:', err.message);
        res.status(500).send('Server Error');
    }
};

// @route POST /api/v2/credit/:id/send-pay-link   body: { email? }
exports.emailPayLink = async (req, res) => {
    try {
        if (!cashfree.enabled) return notConfigured(res);
        const credit = await findOwnCredit(req);
        if (!credit) return res.status(404).json({ msg: 'Record not found' });
        if (!(Number(credit.balance) > 0)) return res.status(400).json({ msg: 'Nothing is due on this record.' });

        const to = String(req.body.email || credit.email || '').trim();
        if (!/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({ msg: 'A valid customer email is required.' });

        if (!credit.payToken) {
            credit.payToken = newPayToken();
            await store.setPayToken(credit, credit.payToken);
        }
        const view = await publicView(credit);
        const url = linkFor(req, credit.payToken);

        await sendEmail({
            to,
            ...emailTemplates.payLink({
                business: view.business, customerName: view.customerName, amount: money(view.balance), url
            })
        });
        res.json({ msg: 'Pay link emailed', url });
    } catch (err) {
        console.error('Email pay link error:', err.message);
        res.status(500).send('Server Error');
    }
};

// @route GET /api/v2/credit/whatsapp-status
exports.whatsappStatus = (req, res) => {
    res.json({ dues: wa.duesEnabled() });
};

// @route POST /api/v2/credit/:id/whatsapp-pay-link   body: { mobile? }
exports.whatsappPayLink = async (req, res) => {
    try {
        if (!cashfree.enabled) return notConfigured(res);
        if (!wa.duesEnabled()) {
            return res.status(503).json({ msg: 'WhatsApp pay links are not enabled on this server yet.' });
        }
        const credit = await findOwnCredit(req);
        if (!credit) return res.status(404).json({ msg: 'Record not found' });
        if (!(Number(credit.balance) > 0)) return res.status(400).json({ msg: 'Nothing is due on this record.' });

        const to = String(req.body.mobile || credit.mobile || credit.phone || '').trim();
        if (!wa.normalizePhone(to)) return res.status(400).json({ msg: 'A valid customer mobile number is required.' });

        if (!credit.payToken) {
            credit.payToken = newPayToken();
            await store.setPayToken(credit, credit.payToken);
        }
        const view = await publicView(credit);
        const url = linkFor(req, credit.payToken);

        await sendDuesPayLink({ to, customerName: view.customerName, business: view.business, balance: view.balance, url });
        res.json({ msg: 'Pay link sent on WhatsApp', url });
    } catch (err) {
        console.error('WhatsApp pay link error:', err.message);
        res.status(502).json({ msg: 'Could not send the WhatsApp message. Please try again or share the link manually.' });
    }
};

// ---------------------------------------------------------------------------
// Public (no login): the token in the URL is the only credential
// ---------------------------------------------------------------------------

const creditByToken = (token) => store.findCreditByToken(token);

// @route GET /api/v2/pay/:token
exports.getPayInfo = async (req, res) => {
    try {
        if (!cashfree.enabled) return notConfigured(res);
        const credit = await creditByToken(req.params.token);
        if (!credit) return res.status(404).json({ msg: 'This payment link is invalid.' });
        res.json(await publicView(credit));
    } catch (err) {
        console.error('Pay info error:', err.message);
        res.status(500).send('Server Error');
    }
};

// @route POST /api/v2/pay/:token/order   body: { amount? } (rupees; defaults to full balance)
exports.createPayOrder = async (req, res) => {
    let orderId;
    try {
        if (!cashfree.enabled) return notConfigured(res);
        const credit = await creditByToken(req.params.token);
        if (!credit) return res.status(404).json({ msg: 'This payment link is invalid.' });

        const balance = Number(credit.balance || 0);
        if (!(balance > 0)) return res.status(400).json({ msg: 'Nothing is due. This bill is already settled.' });

        const requested = req.body.amount == null ? balance : Number(req.body.amount);
        const amount = Math.round(requested * 100) / 100;
        if (!Number.isFinite(amount) || amount < 1 || amount > balance) {
            return res.status(400).json({ msg: `Enter an amount between ₹1 and ${money(balance)}.` });
        }

        const customerPhone = credit.phone || credit.mobile || '9999999999';
        const customerEmail = credit.email || 'customer@example.com';
        const customerName = credit.name || credit.customerName || 'Customer';

        orderId = `due_${Date.now().toString().slice(-8)}_${Math.random().toString(36).slice(2, 6)}`;
        await store.createPayment({
            creditPath: credit._path,
            tenantId: credit.tenantId,
            ownerId: credit.ownerId,
            kind: 'credit',
            creditId: String(credit._id),
            customerName,
            amount,
            orderId
        });

        const order = await cashfree.createOrder({
            orderId,
            orderAmount: amount,
            orderCurrency: 'INR',
            customerDetails: {
                customer_id: String(credit._id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50),
                customer_phone: customerPhone,
                customer_email: customerEmail,
                customer_name: customerName
            },
            orderNote: `Payment for dues - ${customerName}`,
            orderTags: {
                kind: 'credit',
                creditId: String(credit._id),
                tenantId: String(credit.tenantId || ''),
                ownerId: String(credit.ownerId || '')
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
        console.error('Create pay order error:', err.response?.data || err.message);
        if (orderId) {
            try {
                await store.markFailed(orderId, 'Order creation failed');
            } catch (storeErr) {
                console.error('[payments] failed to mark order creation as failed:', storeErr.message);
            }
        }
        res.status(500).json({ msg: err.response?.data?.message || 'Could not start the payment. Please try again.' });
    }
};

// @route POST /api/v2/pay/:token/verify
// Immediate feedback for the payer. The webhook is the safety net if this call never arrives.
exports.verifyPayOrder = async (req, res) => {
    try {
        if (!cashfree.enabled) return notConfigured(res);
        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ msg: 'Missing order ID' });

        const credit = await creditByToken(req.params.token);
        const found = credit && await store.findPayment(orderId);
        const payment = found && found.creditId === String(credit._id) ? found : null;
        if (!payment) return res.status(404).json({ msg: 'Order not found for this link.' });

        const order = await cashfree.getOrder(orderId);
        const payments = await cashfree.getOrderPayments(orderId);
        const successPayment = payments.find((p) => p.payment_status === 'SUCCESS');

        if (order.order_status !== 'PAID' || !successPayment) {
            return res.status(400).json({ msg: `Payment not completed yet (status: ${order.order_status}).` });
        }

        const entity = {
            id: successPayment?.cf_payment_id ? String(successPayment.cf_payment_id) : (order.cf_order_id ? String(order.cf_order_id) : orderId),
            amount: successPayment?.payment_amount ?? order.order_amount,
            method: successPayment?.payment_group || (typeof successPayment?.payment_method === 'object' ? Object.keys(successPayment.payment_method)[0] : 'Cashfree'),
            email: order.customer_details?.customer_email || '',
            contact: order.customer_details?.customer_phone || ''
        };

        const result = await settleOrder(orderId, entity);
        if (!result) return res.status(400).json({ msg: 'Payment could not be reconciled. Contact the business with your payment ID.', paymentId: entity.id });

        res.json({
            msg: 'Payment successful',
            paymentId: entity.id,
            amount: result.payment.amount,
            balance: Number(result.credit?.balance || 0),
            unappliedAmount: Number(result.unappliedAmount || 0)
        });
    } catch (err) {
        console.error('Verify pay order error:', err.response?.data || err.message);
        res.status(500).json({ msg: 'Could not confirm the payment yet. If money was deducted it will be reconciled automatically.' });
    }
};

// ---------------------------------------------------------------------------
// Cashfree webhook (server-to-server; source of truth)
// ---------------------------------------------------------------------------

// @route POST /api/v2/webhooks/cashfree
exports.cashfreeWebhook = async (req, res) => {
    if (!cashfree.enabled) return notConfigured(res);

    const signature = req.header('x-webhook-signature');
    const timestamp = req.header('x-webhook-timestamp');
    const raw = req.rawBody;

    if (!signature || !timestamp || !raw || !cashfree.verifyWebhookSignature(signature, raw, timestamp)) {
        console.warn('[cashfree webhook] missing or invalid signature');
        return res.status(400).json({ msg: 'Invalid signature' });
    }

    try {
        const { type, event, data } = req.body || {};
        const eventType = String(type || event || '').toUpperCase();
        const orderData = data?.order || req.body?.order;
        const paymentData = data?.payment || req.body?.payment;
        const orderId = orderData?.order_id || paymentData?.order_id || req.body?.orderId;

        if (orderId && (eventType.includes('SUCCESS') || eventType.includes('PAID') || paymentData?.payment_status === 'SUCCESS' || orderData?.order_status === 'PAID')) {
            const order = await cashfree.getOrder(orderId);
            const payments = await cashfree.getOrderPayments(orderId);
            const successfulPayment = payments.find((p) => p.payment_status === 'SUCCESS');
            if (order?.order_status !== 'PAID' || !successfulPayment) {
                return res.status(409).json({ msg: 'Cashfree has not confirmed a successful payment.' });
            }

            const entity = {
                id: String(successfulPayment.cf_payment_id || order.cf_order_id || orderId),
                amount: successfulPayment.payment_amount ?? order.order_amount,
                method: successfulPayment.payment_group || 'Cashfree',
                email: order.customer_details?.customer_email || '',
                contact: order.customer_details?.customer_phone || ''
            };
            const payment = await store.findPayment(orderId);
            const result = payment?.kind === 'subscription'
                ? await billingController.settleSubscriptionOrder(orderId, order, successfulPayment)
                : await settleOrder(orderId, entity);
            console.log(`[webhook] Cashfree ${eventType} order=${orderId} ${result ? (result.applied ? 'applied' : 'already settled') : 'not found / mismatch'}`);
        } else if (orderId && (eventType.includes('FAIL') || paymentData?.payment_status === 'FAILED')) {
            await store.markFailed(orderId, paymentData?.payment_message || 'Payment failed');
        }

        // Always 200 for processed webhook so gateway doesn't keep retrying unnecessarily
        res.json({ received: true });
    } catch (err) {
        console.error('[webhook] Cashfree handler error:', err);
        res.status(500).json({ msg: 'Handler error' });
    }
};

// Backwards compatibility alias
exports.razorpayWebhook = exports.cashfreeWebhook;
