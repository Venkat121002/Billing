const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test } = require('node:test');

const secret = 'local-test-cashfree-secret';
process.env.CASHFREE_APP_ID = 'local-test-app-id';
process.env.CASHFREE_SECRET_KEY = secret;
process.env.CASHFREE_ENV = 'sandbox';
process.env.DB_TYPE = 'mongodb';

const cashfree = require('../config/cashfree');
const { applyToLedger } = require('../utils/paymentService');

test('Cashfree webhook validation requires the exact raw request body signature', () => {
    const timestamp = '1780000000000';
    const body = Buffer.from('{"type":"PAYMENT_SUCCESS_WEBHOOK"}');
    const signature = crypto.createHmac('sha256', secret)
        .update(Buffer.concat([Buffer.from(timestamp), body]))
        .digest('base64');

    assert.equal(cashfree.verifyWebhookSignature(signature, body, timestamp), true);
    assert.equal(cashfree.verifyWebhookSignature(signature, Buffer.from('{}'), timestamp), false);
    assert.equal(cashfree.verifyWebhookSignature(signature, body, ''), false);
    assert.equal(cashfree.verifyWebhookSignature('not-base64', body, timestamp), false);
});

test('Cashfree order creation rejects invalid amounts before making a request', async () => {
    await assert.rejects(cashfree.createOrder({
        orderId: 'test_order',
        orderAmount: 0,
        customerDetails: {}
    }), /positive number/);
});

test('credit settlement records overpayment but only applies the outstanding balance', () => {
    const credit = {
        balance: 100,
        credit: 25,
        history: [],
        payments: [{ due: 100, paid: 0, currentBalance: 100 }]
    };

    const update = applyToLedger(credit, 150, { paymentId: 'payment_1', orderId: 'order_1' });

    assert.equal(update.balance, 0);
    assert.equal(update.payments[0].currentBalance, 0);
    assert.equal(update.credit, 175);
    assert.equal(update.history[0].amount, 150);
    assert.equal(update.history[0].appliedAmount, 100);
    assert.equal(update.history[0].unappliedAmount, 50);
    assert.deepEqual(credit.history, []);
});
