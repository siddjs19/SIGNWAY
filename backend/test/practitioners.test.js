const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = randomBytes(32).toString('hex');

const app = require('../src/app');
const User = require('../src/models/User');
const PracticeSession = require('../src/models/PracticeSession');
const practitioners = require('../src/demo/practitioners');
const { validateSessionRequest } = require('../src/routes/practitioners');

const userId = '64b000000000000000000001';
const originalUserFindById = User.findById;
const originalSessionFind = PracticeSession.find;
const originalSessionCreate = PracticeSession.create;
let server;
let apiUrl;
let sessions;
let token;

before(async () => {
  sessions = [];
  token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  User.findById = async (id) => ({ _id: String(id) });
  PracticeSession.create = async (session) => {
    const saved = {
      _id: `demo-session-${sessions.length + 1}`,
      createdAt: new Date(),
      ...session,
    };
    sessions.push(saved);
    return saved;
  };
  PracticeSession.find = ({ learner }) => ({
    sort() {
      return this;
    },
    lean() {
      return Promise.resolve(sessions.filter((session) => String(session.learner) === String(learner)));
    },
  });

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
  PracticeSession.find = originalSessionFind;
  PracticeSession.create = originalSessionCreate;
});

function authHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

test('practitioner directory and sessions require authentication', async () => {
  const directory = await fetch(`${apiUrl}/practitioners`);
  const sessionList = await fetch(`${apiUrl}/practitioners/sessions`);
  const request = await fetch(`${apiUrl}/practitioners/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(directory.status, 401);
  assert.equal(sessionList.status, 401);
  assert.equal(request.status, 401);
});

test('directory returns clearly identified demo profiles', async () => {
  const response = await fetch(`${apiUrl}/practitioners`, { headers: authHeaders() });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.length, practitioners.length);
  assert.ok(body.data.every((profile) => profile.demo === true));
  assert.ok(body.data.every((profile) => !('verified' in profile)));
});

test('session requests validate payload and cannot set their status or user', () => {
  const payload = {
    practitionerId: practitioners[0].id,
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    message: 'Practice greetings',
  };
  assert.equal(validateSessionRequest(payload), null);
  assert.match(validateSessionRequest({ ...payload, status: 'accepted' }), /unsupported fields/);
  assert.match(validateSessionRequest({ ...payload, learner: userId }), /unsupported fields/);
  assert.match(validateSessionRequest({ ...payload, practitionerId: 'not-a-demo-profile' }), /directory/);
  assert.match(validateSessionRequest({ ...payload, scheduledAt: new Date(0).toISOString() }), /future/);
  assert.match(validateSessionRequest({ ...payload, scheduledAt: '2027-02-31T12:00:00.000Z' }), /valid session date/);
  assert.match(validateSessionRequest({ ...payload, message: 'x'.repeat(1001) }), /1000 characters/);
});

test('authenticated session request is stored for token identity with pending status', async () => {
  const scheduledAt = new Date(Date.now() + 86400000).toISOString();
  const response = await fetch(`${apiUrl}/practitioners/sessions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      practitionerId: practitioners[0].id,
      scheduledAt,
      message: '  Practice introductions  ',
    }),
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'pending');
  assert.equal(body.data.practitioner.id, practitioners[0].id);
  assert.equal(body.data.message, 'Practice introductions');
  assert.match(body.message, /No real practitioner was contacted/);
  assert.equal(sessions[0].learner, userId);

  const listResponse = await fetch(`${apiUrl}/practitioners/sessions`, { headers: authHeaders() });
  assert.equal(listResponse.status, 200);
  const listed = await listResponse.json();
  assert.equal(listed.data.length, 1);
  assert.equal(listed.data[0].id, body.data.id);

  const otherLearnerToken = jwt.sign(
    { userId: '64b000000000000000000002' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
  const otherLearnerResponse = await fetch(`${apiUrl}/practitioners/sessions`, {
    headers: { Authorization: `Bearer ${otherLearnerToken}` },
  });
  assert.equal(otherLearnerResponse.status, 200);
  assert.deepEqual((await otherLearnerResponse.json()).data, []);
});

test('invalid request is rejected without creating a session', async () => {
  const response = await fetch(`${apiUrl}/practitioners/sessions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      practitionerId: 'unknown',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      message: '',
    }),
  });
  assert.equal(response.status, 400);
  assert.equal(sessions.length, 1);
});
