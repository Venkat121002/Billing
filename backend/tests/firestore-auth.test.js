const assert = require('node:assert/strict');
const { test } = require('node:test');
const jwt = require('jsonwebtoken');

process.env.DB_TYPE = 'mongodb';
process.env.JWT_SECRET = 'local-test-jwt-secret';

const auth = require('../middleware/firestoreAuth');

function createRequest(headers = {}) {
    return {
        header: (name) => headers[name.toLowerCase()],
        query: {},
        body: {}
    };
}

function createResponse() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(value) {
            this.body = value;
            return this;
        }
    };
}

test('auth rejects a request without a token', async () => {
    const req = createRequest();
    const res = createResponse();
    let passedToNext = false;

    await auth(req, res, () => {
        passedToNext = true;
    });

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { msg: 'No token, authorization denied' });
    assert.equal(passedToNext, false);
});

test('auth accepts a bearer token and continues to the route handler', async () => {
    const user = { userId: 'owner-1', role: 'owner' };
    const token = jwt.sign({ user }, process.env.JWT_SECRET);
    const req = createRequest({ authorization: `Bearer ${token}` });
    const res = createResponse();
    let passedToNext = false;

    await auth(req, res, () => {
        passedToNext = true;
    });

    assert.equal(req.user.userId, user.userId);
    assert.equal(req.role, user.role);
    assert.equal(passedToNext, true);
    assert.equal(res.statusCode, 200);
});
