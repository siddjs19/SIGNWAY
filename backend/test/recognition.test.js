const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('node:crypto');
const User = require('../src/models/User');
const recognitionProvider = require('../src/services/recognitionProvider');
const islBridgeProvider = require('../src/services/islBridgeProvider');
const app = require('../src/app');
const { validateLandmarkSequencePayload } = require('../src/routes/recognition');

process.env.JWT_SECRET = randomBytes(32).toString('hex');
const userId = '64b000000000000000000099';
const validPayload = {
  sequence: Array.from({ length: 30 }, (_, frame) => (
    Array.from({ length: 63 }, (_, feature) => (frame + feature) / 100)
  )),
};
const validProviderResponse = {
  success: true,
  sign: 'hello',
  confidence: 0.94,
  top3: [
    { sign: 'hello', confidence: 0.94 },
    { sign: 'thank_you', confidence: 0.04 },
    { sign: 'good', confidence: 0.02 },
  ],
};
const validJpegDataUrl = `data:image/jpeg;base64,${Buffer.from([
  0xff, 0xd8, 0xff, 0xd9,
]).toString('base64')}`;

let server;
let apiUrl;
const originalFindById = User.findById;
const originalFetch = global.fetch;
const originalProviderEnv = {
  JESTALLY_API_URL: process.env.JESTALLY_API_URL,
  JESTALLY_API_KEY: process.env.JESTALLY_API_KEY,
  JESTALLY_API_TIMEOUT_MS: process.env.JESTALLY_API_TIMEOUT_MS,
};

function authHeaders() {
  return {
    Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}`,
  };
}

function setProviderEnv() {
  process.env.JESTALLY_API_URL = 'https://jestally.example.test/prod/recognize';
  process.env.JESTALLY_API_KEY = 'test-key-not-a-secret';
  delete process.env.JESTALLY_API_TIMEOUT_MS;
}

async function postSequence(realFetch, options = {}) {
  return realFetch(`${apiUrl}/landmarks`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(options.payload || validPayload),
  });
}

before(async () => {
  User.findById = async (id) => ({ _id: String(id) });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  apiUrl = `http://127.0.0.1:${server.address().port}/api/recognition`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  User.findById = originalFindById;
  global.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalProviderEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('landmark sequence validator accepts exactly 30 frames with 63 finite features', () => {
  assert.equal(validateLandmarkSequencePayload(validPayload), null);
  assert.equal(recognitionProvider.validateSequence(validPayload.sequence), null);
});

test('landmark sequence validator rejects incorrect dimensions and non-finite features', () => {
  assert.match(validateLandmarkSequencePayload({ sequence: [] }), /exactly 30 frames/);
  assert.match(
    validateLandmarkSequencePayload({
      sequence: validPayload.sequence.map((frame, index) => (
        index === 0 ? frame.slice(1) : frame
      )),
    }),
    /exactly 63 finite numeric features/,
  );
  assert.match(
    validateLandmarkSequencePayload({
      sequence: validPayload.sequence.map((frame, index) => (
        index === 0 ? frame.map((value, feature) => (
          feature === 0 ? Number.NaN : value
        )) : frame
      )),
    }),
    /exactly 63 finite numeric features/,
  );
  assert.match(
    validateLandmarkSequencePayload({ ...validPayload, image: 'encoded-frame' }),
    /landmark sequence only/,
  );
});

test('landmark endpoint requires authentication', async () => {
  const response = await originalFetch(`${apiUrl}/landmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validPayload),
  });
  assert.equal(response.status, 401);
});

test('authenticated sequence is sent to Jestally using the verified request contract', async () => {
  setProviderEnv();
  let callCount = 0;
  global.fetch = async (url, options) => {
    callCount += 1;
    assert.equal(url, process.env.JESTALLY_API_URL);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.equal(options.headers['x-api-key'], process.env.JESTALLY_API_KEY);
    assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), validPayload);
    assert.ok(options.signal);
    return new Response(JSON.stringify(validProviderResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const response = await postSequence(originalFetch);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    prediction: {
      abstained: false,
      sign: 'hello',
      confidence: 0.94,
      top3: validProviderResponse.top3,
    },
  });
  assert.equal(callCount, 1);
});

test('provider success without a sign returns an explicit abstention, not a prediction', async () => {
  setProviderEnv();
  global.fetch = async () => new Response(JSON.stringify({
    success: true,
    message: 'Keep signing…',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const response = await postSequence(originalFetch);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    prediction: null,
    abstained: true,
    message: 'Keep signing…',
  });
});

test('valid sequence returns an explicit not-configured response when credentials are missing', async () => {
  delete process.env.JESTALLY_API_URL;
  delete process.env.JESTALLY_API_KEY;
  let callCount = 0;
  global.fetch = async () => {
    callCount += 1;
    throw new Error('Provider must not be called');
  };

  const response = await postSequence(originalFetch);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'RECOGNITION_PROVIDER_NOT_CONFIGURED');
  assert.equal(callCount, 0);
});

test('provider HTTP errors are categorized without retrying', async () => {
  const cases = [
    { upstreamStatus: 401, expectedStatus: 502, code: 'RECOGNITION_PROVIDER_AUTH_ERROR' },
    { upstreamStatus: 403, expectedStatus: 502, code: 'RECOGNITION_PROVIDER_AUTH_ERROR' },
    { upstreamStatus: 429, expectedStatus: 503, code: 'RECOGNITION_PROVIDER_RATE_LIMITED' },
    { upstreamStatus: 503, expectedStatus: 502, code: 'RECOGNITION_PROVIDER_UNAVAILABLE' },
  ];

  setProviderEnv();
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    for (const { upstreamStatus, expectedStatus, code } of cases) {
      let callCount = 0;
      global.fetch = async () => {
        callCount += 1;
        return new Response(null, { status: upstreamStatus });
      };

      const response = await postSequence(originalFetch);
      assert.equal(response.status, expectedStatus);
      assert.equal((await response.json()).code, code);
      assert.equal(callCount, 1);
    }
  } finally {
    console.error = originalConsoleError;
  }
});

test('provider network errors and timeouts are reported explicitly', async () => {
  setProviderEnv();
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    global.fetch = async () => {
      throw new TypeError('network unavailable');
    };
    const networkResponse = await postSequence(originalFetch);
    assert.equal(networkResponse.status, 502);
    assert.equal((await networkResponse.json()).code, 'RECOGNITION_PROVIDER_NETWORK_ERROR');

    global.fetch = async () => {
      const error = new Error('request timeout');
      error.name = 'TimeoutError';
      throw error;
    };
    const timeoutResponse = await postSequence(originalFetch);
    assert.equal(timeoutResponse.status, 504);
    assert.equal((await timeoutResponse.json()).code, 'RECOGNITION_PROVIDER_TIMEOUT');

    global.fetch = async () => ({
      ok: true,
      json: async () => {
        const error = new Error('body read timeout');
        error.name = 'TimeoutError';
        throw error;
      },
    });
    const bodyTimeoutResponse = await postSequence(originalFetch);
    assert.equal(bodyTimeoutResponse.status, 504);
    assert.equal((await bodyTimeoutResponse.json()).code, 'RECOGNITION_PROVIDER_TIMEOUT');
  } finally {
    console.error = originalConsoleError;
  }
});

test('invalid Jestally responses are rejected instead of returned as predictions', async () => {
  setProviderEnv();
  global.fetch = async () => new Response(JSON.stringify({
    success: true,
    sign: 'hello',
    confidence: 2,
    top3: [],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const response = await postSequence(originalFetch);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, 'RECOGNITION_PROVIDER_INVALID_RESPONSE');
});

test('ISL Bridge frame validation accepts JPEG data URLs and rejects invalid MIME, bytes, and size', () => {
  const validPayload = { image: validJpegDataUrl, language: 'en' };
  assert.equal(islBridgeProvider.validateFramePayload(validPayload), null);
  assert.match(
    islBridgeProvider.validateFramePayload({
      image: validJpegDataUrl.replace('image/jpeg', 'image/png'),
      language: 'en',
    }),
    /JPEG base64 data URL/,
  );
  assert.match(
    islBridgeProvider.validateFramePayload({
      image: 'data:image/jpeg;base64,AAAA',
      language: 'en',
    }),
    /valid JPEG frame/,
  );
  assert.match(
    islBridgeProvider.validateFramePayload({
      image: `data:image/jpeg;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`,
      language: 'en',
    }),
    /must not exceed 2 MiB/,
  );
});

test('authenticated ISL Bridge endpoint forwards a JPEG frame and returns the provider result', async () => {
  let callCount = 0;
  global.fetch = async (url, options) => {
    callCount += 1;
    assert.equal(url, 'https://shridalisingh-isl-bridge.hf.space/predict');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), {
      image: validJpegDataUrl,
      language: 'en',
    });
    assert.ok(options.signal);
    return new Response(JSON.stringify({
      sign: 'A',
      word: 'APPLE',
      sentence: 'APPLE',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const response = await originalFetch(`${apiUrl}/isl-bridge/frame`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: validJpegDataUrl, language: 'en' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    result: { sign: 'A', word: 'APPLE', sentence: 'APPLE' },
    empty: false,
  });
  assert.equal(callCount, 1);
});

test('ISL Bridge frame endpoint requires authentication and rejects invalid image payloads', async () => {
  let callCount = 0;
  global.fetch = async () => {
    callCount += 1;
    throw new Error('Provider must not be called for invalid images');
  };
  const unauthenticated = await originalFetch(`${apiUrl}/isl-bridge/frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: validJpegDataUrl, language: 'en' }),
  });
  assert.equal(unauthenticated.status, 401);

  const invalidImage = await originalFetch(`${apiUrl}/isl-bridge/frame`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: 'data:image/png;base64,AAAA',
      language: 'en',
    }),
  });
  assert.equal(invalidImage.status, 400);
  assert.equal((await invalidImage.json()).code, 'INVALID_ISL_BRIDGE_FRAME');

  const oversizedImage = await originalFetch(`${apiUrl}/isl-bridge/frame`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: `data:image/jpeg;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`,
      language: 'en',
    }),
  });
  assert.equal(oversizedImage.status, 400);
  assert.equal((await oversizedImage.json()).code, 'INVALID_ISL_BRIDGE_FRAME');
  assert.equal(callCount, 0);
});

test('ISL Bridge endpoint returns an empty-result state without inventing a prediction', async () => {
  global.fetch = async () => new Response(JSON.stringify({
    sign: '',
    word: '',
    sentence: '',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const response = await originalFetch(`${apiUrl}/isl-bridge/frame`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: validJpegDataUrl, language: 'en' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    result: { sign: '', word: '', sentence: '' },
    empty: true,
  });
});

test('ISL Bridge provider timeouts and upstream failures are returned as errors', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    global.fetch = async () => {
      const error = new Error('provider timeout');
      error.name = 'TimeoutError';
      throw error;
    };
    const timeoutResponse = await originalFetch(`${apiUrl}/isl-bridge/frame`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: validJpegDataUrl, language: 'en' }),
    });
    assert.equal(timeoutResponse.status, 504);
    assert.equal((await timeoutResponse.json()).code, 'ISL_BRIDGE_TIMEOUT');

    global.fetch = async () => new Response('unavailable', { status: 503 });
    const providerResponse = await originalFetch(`${apiUrl}/isl-bridge/frame`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: validJpegDataUrl, language: 'en' }),
    });
    assert.equal(providerResponse.status, 502);
    assert.equal((await providerResponse.json()).code, 'ISL_BRIDGE_PROVIDER_ERROR');
  } finally {
    console.error = originalConsoleError;
  }
});

test('ISL Bridge endpoint rejects malformed provider responses', async () => {
  global.fetch = async () => new Response(JSON.stringify({
    sign: 'A',
    word: null,
    sentence: 'APPLE',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  const response = await originalFetch(`${apiUrl}/isl-bridge/frame`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: validJpegDataUrl, language: 'en' }),
  });
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, 'ISL_BRIDGE_INVALID_RESPONSE');
});
