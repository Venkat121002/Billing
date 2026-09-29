const crypto = require('crypto');
const store = require('./paymentStore');
const platformStore = require('./platformStore');
const { sendEmail } = require('./emailService');
const emailTemplates = require('./emailTemplates');

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const newPayToken = () => crypto.randomBytes(24).toString('base64url');

/** Constant-time HMAC-SHA256 hex comparison. */
function hmacMatches(secret, payload, signature) {
    if (!secret || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Apply an online payment to a credit (dues) ledger record. Mirrors the
 * session/payments bookkeeping the Credit screen does for manual receipts, and
 * keeps `balance` authoritative.
 */
function applyToLedger(credit, amount, { paymentId, orderId }) {
    const now = new Date();
    const payments = (credit.payments || []).map((p) => ({ ...p }));

    let remaining = amount;
    for (let i = 0; i < payments.length && remaining > 0; i++) {
        const prev = Number(payments[i].currentBalance ?? payments[i].due ?? 0);
        if (prev <= 0) continue;
        const applied = Math.min(remaining, prev);
        payments[i].paid = Number(payments[i].paid || 0) + applied;
        payments[i].currentBalance = prev - applied;
        payments[i].date = now.toLocaleDateString();
        payments[i].method = 'Razorpay';
        remaining -= applied;
        for (let j = i + 1; j < payments.length; j++) {
            payments[j].balance = payments[j - 1].currentBalance;
            payments[j].currentBalance = payments[j].balance - Number(payments[j].paid || 0);
        }
    }

    const balance = Math.max(0, Number(credit.balance || 0) - amount);
    const history = [...(credit.history || []), {
        date: now.toISOString(), amount, method: 'Razorpay', paymentId, orderId
    }];

    return {
        payments,
        history,
        balance,
        totalbalance: balance,
        credit: Number(credit.credit || 0) + amount,
        status: balance <= 0 ? 'Completed' : 'Pending',
        updatedAt: now.toISOString()
    };
}

async function sendReceipts({ payment, credit, remainingBalance }) {
    const owner = await platformStore.getOwner(payment.ownerId);
    const business = owner?.companyDetails?.name || 'SwordNex Billing';
    const ownerEmail = owner?.companyDetails?.email || owner?.email;
    const payerEmail = payment.payerEmail || credit.email;
    const customer = credit.name || credit.customerName || '';

    const details = {
        business, customerName: customer, amount: money(payment.amount),
        paymentId: payment.paymentId, method: payment.method, remaining: money(remainingBalance)
    };

    const jobs = [];
    if (payerEmail) {
        jobs.push(sendEmail({ to: payerEmail, ...emailTemplates.paymentReceipt({ ...details, audience: 'customer' }) }));
    }
    if (ownerEmail) {
        jobs.push(sendEmail({ to: ownerEmail, ...emailTemplates.paymentReceipt({ ...details, audience: 'owner' }) }));
    }
    const results = await Promise.allSettled(jobs);
    results.forEach((r) => r.status === 'rejected' && console.error('[payments] receipt email failed:', r.reason?.message || r.reason));
    return results.some((r) => r.status === 'fulfilled');
}

/**
 * Mark an order paid and apply it to the ledger exactly once. Safe to call from
 * both the browser verify step and the webhook, in any order and any number of
 * times: only the caller that flips created/failed -> paid applies the money.
 *
 * @param {string} orderId
 * @param {object} entity Razorpay payment entity ({id, method, email, contact, amount})
 * @returns {Promise<{payment, credit, applied:boolean}|null>} null if the order is unknown or the amount mismatches
 */
async function settleOrder(orderId, entity) {
    const existing = await store.findPayment(orderId);
    if (!existing) return null;

    // Never trust a payment whose amount differs from the order we created.
    if (entity.amount != null && Math.round(existing.amount * 100) !== Number(entity.amount)) {
        console.error('[payments] amount mismatch for order', orderId);
        return null;
    }

    const payment = await store.markPaid(orderId, {
        paymentId: entity.id,
        method: entity.method || '',
        payerEmail: entity.email || '',
        payerContact: entity.contact || ''
    });

    if (!payment) {
        // Already settled by the other path.
        const credit = await store.getCreditForPayment(existing);
        return { payment: existing, credit, applied: false };
    }

    const ledger = await store.updateCreditLedger(payment, (c) =>
        applyToLedger(c, payment.amount, { paymentId: payment.paymentId, orderId })
    );
    if (!ledger) {
        console.error('[payments] credit record missing for paid order', orderId);
        return { payment, credit: null, applied: false };
    }
    const { credit, update } = ledger;

    // Receipts are best-effort; the money is already recorded.
    sendReceipts({ payment, credit, remainingBalance: update.balance })
        .then((sent) => sent && store.markReceiptSent(orderId))
        .catch((e) => console.error('[payments] receipt error:', e.message));

    return { payment, credit, applied: true };
}

module.exports = { newPayToken, hmacMatches, settleOrder, money, esc };
