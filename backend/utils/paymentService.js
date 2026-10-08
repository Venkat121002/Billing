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
    const appliedAmount = Math.min(amount, Math.max(0, Number(credit.balance || 0)));
    const unappliedAmount = Math.max(0, amount - appliedAmount);

    let remaining = appliedAmount;
    for (let i = 0; i < payments.length && remaining > 0; i++) {
        const prev = Number(payments[i].currentBalance ?? payments[i].due ?? 0);
        if (prev <= 0) continue;
        const applied = Math.min(remaining, prev);
        payments[i].paid = Number(payments[i].paid || 0) + applied;
        payments[i].currentBalance = prev - applied;
        payments[i].date = now.toLocaleDateString();
        payments[i].method = 'Cashfree';
        remaining -= applied;
        for (let j = i + 1; j < payments.length; j++) {
            payments[j].balance = payments[j - 1].currentBalance;
            payments[j].currentBalance = payments[j].balance - Number(payments[j].paid || 0);
        }
    }

    const balance = Math.max(0, Number(credit.balance || 0) - appliedAmount);
    const history = [...(credit.history || []), {
        date: now.toISOString(), amount, appliedAmount, unappliedAmount, method: 'Cashfree', paymentId, orderId
    }];

    return {
        payments,
        history,
        balance,
        totalbalance: balance,
        credit: Number(credit.credit || 0) + amount,
        appliedAmount,
        unappliedAmount,
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
        paymentId: payment.paymentId, method: payment.method, remaining: money(remainingBalance),
        unapplied: Number(payment.unappliedAmount || 0) > 0 ? money(payment.unappliedAmount) : null
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
 * Apply a paid order exactly once, then mark it paid. The ledger's order marker
 * makes a retry safe if persistence fails after the ledger transaction commits.
 *
 * @param {string} orderId
 * @param {object} entity Cashfree payment entity ({id, method, email, contact, amount})
 * @returns {Promise<{payment, credit, applied:boolean}|null>} null if the order is unknown or the amount mismatches
 */
async function settleOrder(orderId, entity) {
    const existing = await store.findPayment(orderId);
    if (!existing) return null;

    if (existing.status === 'paid') {
        const credit = await store.getCreditForPayment(existing);
        const priorEntry = (Array.isArray(credit?.history) ? credit.history : [])
            .find((item) => item.orderId === orderId);
        if (priorEntry) {
            return {
                payment: existing,
                credit,
                applied: false,
                unappliedAmount: Number(priorEntry.unappliedAmount || 0)
            };
        }
        console.warn('[payments] repairing paid order with no matching ledger history:', orderId);
    }

    // Never trust a payment whose amount differs from the order we created.
    if (entity.amount != null) {
        const entityAmount = Number(entity.amount);
        // Handle both rupees and paise if passed
        const expectedRupees = Number(existing.amount);
        const matchesRupees = Math.abs(expectedRupees - entityAmount) < 0.01;
        const matchesPaise = Math.abs(Math.round(expectedRupees * 100) - entityAmount) < 0.01;
        if (!matchesRupees && !matchesPaise) {
            console.error('[payments] amount mismatch for order', orderId, 'expected:', expectedRupees, 'got:', entityAmount);
            return null;
        }
    }

    const ledger = await store.updateCreditLedger(existing, (c) =>
        applyToLedger(c, Number(existing.amount), { paymentId: entity.id, orderId })
    );
    if (!ledger) {
        console.error('[payments] credit record missing for paid order', orderId);
        return null;
    }

    const payment = await store.markPaid(orderId, {
        paymentId: entity.id,
        method: entity.method || '',
        payerEmail: entity.email || '',
        payerContact: entity.contact || '',
        appliedAmount: ledger.update?.appliedAmount ?? existing.appliedAmount,
        unappliedAmount: ledger.update?.unappliedAmount ?? existing.unappliedAmount
    });

    if (!payment) {
        // Already settled by the other path.
        const credit = await store.getCreditForPayment(existing);
        return {
            payment: existing,
            credit,
            applied: false,
            unappliedAmount: Number(ledger.update?.unappliedAmount ?? existing.unappliedAmount ?? 0)
        };
    }

    const { credit, update } = ledger;

    // Receipts are best-effort; the money is already recorded.
    sendReceipts({ payment, credit, remainingBalance: update.balance })
        .then((sent) => sent && store.markReceiptSent(orderId))
        .catch((e) => console.error('[payments] receipt error:', e.message));

    return { payment, credit, applied: !ledger.alreadyApplied, unappliedAmount: update?.unappliedAmount ?? existing.unappliedAmount ?? 0 };
}

module.exports = { newPayToken, hmacMatches, settleOrder, applyToLedger, money, esc };
