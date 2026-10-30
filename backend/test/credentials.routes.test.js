const { after, before, test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = randomBytes(32).toString('hex');

const app = require('../src/app');
const User = require('../src/models/User');
const Credential = require('../src/models/Credential');
const blockchain = require('../src/services/credentialBlockchain');

const learnerId = '64b000000000000000000001';
const token = jwt.sign({ userId: learnerId }, process.env.JWT_SECRET, { expiresIn: '1h' });
const originalUserFindById = User.findById;
let server;
let apiUrl;

before(async () => {
  User.findById = async (id) => ({ _id: String(id) });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  apiUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  User.findById = originalUserFindById;
});

function authHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

test('credential list and issue endpoints require authentication', async () => {
  const list = await fetch(`${apiUrl}/credentials`);
  const issue = await fetch(`${apiUrl}/credentials/issue`, { method: 'POST' });
  assert.equal(list.status, 401);
  assert.equal(issue.status, 401);
});

test('public verification rejects malformed IDs and does not require authentication', async () => {
  const invalid = await fetch(`${apiUrl}/credentials/verify/not-a-credential`);
  assert.equal(invalid.status, 400);

  const verify = mock.method(blockchain, 'verifyPublicCredential', async () => ({ exists: false }));
  try {
    const response = await fetch(`${apiUrl}/credentials/verify/0x${'a'.repeat(64)}`);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { exists: false });
    assert.equal(verify.mock.calls.length, 1);
  } finally {
    verify.mock.restore();
  }
});

test('issue endpoint derives eligibility from application state and rejects arbitrary client proof', async () => {
  const eligibility = mock.method(blockchain, 'getEligibility', async () => ({
    eligible: false,
    reason: 'Complete lessons first.',
  }));
  try {
    const arbitrary = await fetch(`${apiUrl}/credentials/issue`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ credentialHash: `0x${'a'.repeat(64)}`, issuerAddress: '0x0000000000000000000000000000000000000001' }),
    });
    assert.equal(arbitrary.status, 400);

    const response = await fetch(`${apiUrl}/credentials/issue`, {
      method: 'POST',
      headers: authHeaders(),
    });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'CREDENTIAL_NOT_ELIGIBLE');
    assert.equal(eligibility.mock.calls.length, 1);
  } finally {
    eligibility.mock.restore();
  }
});

test('credential revocation requires a configured issuer account', async () => {
  const originalIssuerEmails = process.env.MST_CREDENTIAL_REVOKER_EMAILS;
  process.env.MST_CREDENTIAL_REVOKER_EMAILS = 'issuer@example.test';
  try {
    const response = await fetch(`${apiUrl}/credentials/0x${'b'.repeat(64)}/revoke`, {
      method: 'POST',
      headers: authHeaders(),
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'CREDENTIAL_ISSUER_REQUIRED');
  } finally {
    if (originalIssuerEmails === undefined) delete process.env.MST_CREDENTIAL_REVOKER_EMAILS;
    else process.env.MST_CREDENTIAL_REVOKER_EMAILS = originalIssuerEmails;
  }
});

test('configured credential issuer can revoke a record through the backend signer', async () => {
  const originalIssuerEmails = process.env.MST_CREDENTIAL_REVOKER_EMAILS;
  const originalUserFindById = User.findById;
  const originalCredentialFindOne = Credential.findOne;
  process.env.MST_CREDENTIAL_REVOKER_EMAILS = 'issuer@example.test';
  User.findById = async (id) => ({ _id: String(id), email: 'issuer@example.test' });
  let filter;
  const record = {
    credentialId: `0x${'b'.repeat(64)}`,
    status: 'revoked',
    credentialHash: `0x${'c'.repeat(64)}`,
  };
  Credential.findOne = async (query) => {
    filter = query;
    return record;
  };
  const revoke = mock.method(blockchain, 'revokeCredential', async () => record);

  try {
    const response = await fetch(`${apiUrl}/credentials/${record.credentialId}/revoke`, {
      method: 'POST',
      headers: authHeaders(),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(filter, {
      credentialId: record.credentialId,
      status: { $in: ['issued', 'revoked'] },
    });
    assert.equal(revoke.mock.calls.length, 1);
  } finally {
    revoke.mock.restore();
    User.findById = originalUserFindById;
    Credential.findOne = originalCredentialFindOne;
    if (originalIssuerEmails === undefined) delete process.env.MST_CREDENTIAL_REVOKER_EMAILS;
    else process.env.MST_CREDENTIAL_REVOKER_EMAILS = originalIssuerEmails;
  }
});
