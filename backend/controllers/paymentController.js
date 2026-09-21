const { instance: razorpay, enabled: razorpayEnabled } = require('../config/razorpay');
const store = require('../utils/paymentStore');
const platformStore = require('../utils/platformStore');
const { newPayToken, hmacMatches, settleOrder, money, esc } = require('../utils/paymentService');
const { sendEmail } = require('../utils/emailService');

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
        keyId: process.env.RAZORPAY_KEY_ID
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
        if (!razorpayEnabled) return notConfigured(res);
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
        if (!razorpayEnabled) return notConfigured(res);
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
            subject: `Payment request from ${view.business} - ${money(view.balance)}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
                <p>Hi ${esc(view.customerName || 'there')},</p>
                <p>${esc(view.business)} has requested a payment of <b>${money(view.balance)}</b>.</p>
                <p><a href="${esc(url)}" style="display:inline-block;background:#059669;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:bold">Pay securely</a></p>
                <p style="font-size:12px;color:#6b7280">Payments are processed by Razorpay (UPI, cards, netbanking, wallets).</p></div>`
        });
        res.json({ msg: 'Pay link emailed', url });
    } catch (err) {
        console.error('Email pay link error:', err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------------------------
// Public (no login): the token in the URL is the only credential
// ---------------------------------------------------------------------------

const creditByToken = (token) => store.findCreditByToken(token);

// @route GET /api/v2/pay/:token
exports.getPayInfo = async (req, res) => {
    try {
        if (!razorpayEnabled) return notConfigured(res);
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
    try {
        if (!razorpayEnabled) return notConfigured(res);
        const credit = await creditByToken(req.params.token);
        if (!credit) return res.status(404).json({ msg: 'This payment link is invalid.' });

        const balance = Number(credit.balance || 0);
        if (!(balance > 0)) return res.status(400).json({ msg: 'Nothing is due. This bill is already settled.' });

        const requested = req.body.amount == null ? balance : Number(req.body.amount);
        const amount = Math.round(requested * 100) / 100;
        if (!Number.isFinite(amount) || amount < 1 || amount > balance) {
            return res.status(400).json({ msg: `Enter an amount between ₹1 and ${money(balance)}.` });
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `dues_${Date.now().toString().slice(-10)}`,
            notes: { kind: 'credit', creditId: String(credit._id), tenantId: credit.tenantId, ownerId: credit.ownerId }
        });

        await store.createPayment({
            creditPath: credit._path,
            tenantId: credit.tenantId,
            ownerId: credit.ownerId,
            kind: 'credit',
            creditId: String(credit._id),
            customerName: credit.name || credit.customerName || '',
            amount,
            orderId: order.id
        });

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            prefill: { name: credit.name || credit.customerName || '', contact: credit.phone || credit.mobile || '', email: credit.email || '' }
        });
    } catch (err) {
        console.error('Create pay order error:', err);
        res.status(500).json({ msg: 'Could not start the payment. Please try again.' });
    }
};

// @route POST /api/v2/pay/:token/verify
// Immediate feedback for the payer. The webhook is the safety net if this call never arrives.
exports.verifyPayOrder = async (req, res) => {
    try {
        if (!razorpayEnabled) return notConfigured(res);
        const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
        if (!orderId || !paymentId || !signature) return res.status(400).json({ msg: 'Missing payment details' });

        if (!hmacMatches(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`, signature)) {
            return res.status(400).json({ msg: 'Payment verification failed' });
        }

        const credit = await creditByToken(req.params.token);
        const found = credit && await store.findPayment(orderId);
        const payment = found && found.creditId === String(credit._id) ? found : null;
        if (!payment) return res.status(404).json({ msg: 'Order not found for this link.' });

        // Signature proves Razorpay issued this payment for this order; fetch it for method/contact/amount.
        const entity = await razorpay.payments.fetch(paymentId);
        if (entity.order_id !== orderId) return res.status(400).json({ msg: 'Payment verification failed' });
        if (!['captured', 'authorized'].includes(entity.status)) {
            return res.status(402).json({ msg: `Payment not completed (${entity.status}).` });
        }

        const result = await settleOrder(orderId, entity);
        if (!result) return res.status(400).json({ msg: 'Payment could not be reconciled. Contact the business with your payment ID.', paymentId });

        res.json({
            msg: 'Payment successful',
            paymentId,
            amount: result.payment.amount,
            balance: Number(result.credit?.balance || 0)
        });
    } catch (err) {
        console.error('Verify pay order error:', err);
        res.status(500).json({ msg: 'Could not confirm the payment yet. If money was deducted it will be reconciled automatically.' });
    }
};

// ---------------------------------------------------------------------------
// Razorpay webhook (server-to-server; source of truth)
// ---------------------------------------------------------------------------

// @route POST /api/v2/webhooks/razorpay
exports.razorpayWebhook = async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!razorpayEnabled || !secret) return notConfigured(res);

    const raw = req.rawBody;
    if (!raw || !hmacMatches(secret, raw, req.header('x-razorpay-signature'))) {
        return res.status(400).json({ msg: 'Invalid signature' });
    }

    try {
        const { event, payload } = req.body;
        const entity = payload?.payment?.entity;

        if ((event === 'payment.captured' || event === 'order.paid') && entity?.order_id) {
            const result = await settleOrder(entity.order_id, entity);
            console.log(`[webhook] ${event} order=${entity.order_id} ${result ? (result.applied ? 'applied' : 'already settled') : 'not one of ours / mismatch'}`);
        } else if (event === 'payment.failed' && entity?.order_id) {
            await store.markFailed(entity.order_id, entity.error_description);
        }
        // Always 200 for verified events so Razorpay doesn't retry ones we don't handle.
        res.json({ received: true });
    } catch (err) {
        console.error('[webhook] handler error:', err);
        res.status(500).json({ msg: 'Handler error' }); // Razorpay retries on non-2xx
    }
};
