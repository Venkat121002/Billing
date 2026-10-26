const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const partnerProgram = require('../utils/partnerProgram');

function startFakePartner(handler) {
    return new Promise((resolve) => {
        const calls = [];
        const server = http.createServer((req, res) => {
            let body = '';
            req.on('data', (c) => { body += c; });
            req.on('end', () => {
                calls.push({ method: req.method, url: req.url, key: req.headers['x-api-key'], body: body ? JSON.parse(body) : null });
                handler(req, res, calls);
            });
        });
        server.listen(0, '127.0.0.1', () => resolve({ server, calls, url: `http://127.0.0.1:${server.address().port}/api/v1` }));
    });
}
const settle = () => new Promise((r) => setTimeout(r, 150));

test('does nothing until the Partner Program is configured', async () => {
    delete process.env.PARTNER_API_URL;
    delete process.env.PARTNER_API_KEY;
    assert.equal(partnerProgram.isEnabled(), false);
    assert.deepEqual(await partnerProgram.verifyCode('SN-X'), { unavailable: true });
    partnerProgram.reportSignup({ referralCode: 'SN-X', email: 'a@b.co' }); // must not throw
    partnerProgram.reportPayment({ orderId: 'o1', email: 'a@b.co', amount: 100 });
});

test('splits a GST-inclusive rupee amount into paise', () => {
    delete process.env.BILLING_GST_RATE;
    assert.deepEqual(partnerProgram.splitAmount(1180), { totalPaise: 118000, eligibleBasePaise: 100000 });
    process.env.BILLING_GST_RATE = '0';
    assert.deepEqual(partnerProgram.splitAmount(999.5), { totalPaise: 99950, eligibleBasePaise: 99950 });
    delete process.env.BILLING_GST_RATE;
});

test('verifies codes, reports the sign-up as a trial and the payment in paise with the product key', async () => {
    const fake = await startFakePartner((req, res) => {
        res.setHeader('content-type', 'application/json');
        if (req.url.startsWith('/api/v1/referrals/verify-code/SN-GOOD')) return res.end(JSON.stringify({ success: true, valid: true, partnerName: 'Growth Partners' }));
        if (req.url.startsWith('/api/v1/referrals/verify-code/')) { res.statusCode = 404; return res.end('{"valid":false}'); }
        res.statusCode = 201; res.end('{"success":true}');
    });
    process.env.PARTNER_API_URL = fake.url + '/';
    process.env.PARTNER_API_KEY = 'snk_billing_test';
    try {
        assert.deepEqual(await partnerProgram.verifyCode(' sn-good '), { valid: true, partnerCode: undefined, partnerName: 'Growth Partners' });
        assert.deepEqual(await partnerProgram.verifyCode('SN-BAD'), { valid: false });

        partnerProgram.reportSignup({ referralCode: 'sn-good', email: 'owner@acme.example', name: 'Priya', trialEndsAt: new Date('2026-11-09T00:00:00Z') });
        partnerProgram.reportPayment({ orderId: 'order_1', email: 'owner@acme.example', name: 'Priya', amount: 1180, billingCycle: '3years' });
        await settle();

        const signup = fake.calls.find((c) => c.url.endsWith('/integrations/referral-signup'));
        assert.equal(signup.key, 'snk_billing_test');
        assert.deepEqual(signup.body, {
            referralCode: 'SN-GOOD', customerEmail: 'owner@acme.example', customerName: 'Priya',
            productId: 'prod_billing', trialEndsAt: '2026-11-09T00:00:00.000Z'
        });
        const payment = fake.calls.find((c) => c.url.endsWith('/webhooks/direct-payment'));
        assert.equal(payment.body.totalAmountPaise, 118000);
        assert.equal(payment.body.eligibleBasePaise, 100000);
        assert.equal(payment.body.billingCycle, 'yearly');
        assert.equal(payment.body.productId, 'prod_billing');
    } finally {
        fake.server.close();
        delete process.env.PARTNER_API_URL;
        delete process.env.PARTNER_API_KEY;
    }
});

test('an unreachable Partner Program is reported as unavailable, not as an invalid code', async () => {
    process.env.PARTNER_API_URL = 'http://127.0.0.1:1/api/v1';
    process.env.PARTNER_API_KEY = 'snk_billing_test';
    try {
        assert.deepEqual(await partnerProgram.verifyCode('SN-ANY'), { unavailable: true });
    } finally {
        delete process.env.PARTNER_API_URL;
        delete process.env.PARTNER_API_KEY;
    }
});
