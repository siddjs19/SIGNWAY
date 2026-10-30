const FRAME_COUNT = 30;
const FEATURES_PER_FRAME = 63;
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_TIMEOUT_MS = 60000;

class RecognitionProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RecognitionProviderError';
    this.code = code;
  }
}

function validateSequence(sequence) {
  if (!Array.isArray(sequence) || sequence.length !== FRAME_COUNT) {
    return 'Recognition sequence must contain exactly 30 frames';
  }

  if (sequence.some((frame) => (
    !Array.isArray(frame)
    || frame.length !== FEATURES_PER_FRAME
    || frame.some((value) => typeof value !== 'number' || !Number.isFinite(value))
  ))) {
    return 'Each recognition frame must contain exactly 63 finite numeric features';
  }

  return null;
}

function getProviderConfig() {
  const { JESTALLY_API_URL, JESTALLY_API_KEY, JESTALLY_API_TIMEOUT_MS } = process.env;
  if (!JESTALLY_API_URL || !JESTALLY_API_KEY) {
    throw new RecognitionProviderError(
      'RECOGNITION_PROVIDER_NOT_CONFIGURED',
      'Jestally recognition is not configured on the server.',
    );
  }

  let url;
  try {
    url = new URL(JESTALLY_API_URL);
  } catch {
    throw new RecognitionProviderError(
      'RECOGNITION_PROVIDER_CONFIGURATION_ERROR',
      'Jestally recognition has an invalid server URL configuration.',
    );
  }

  if (url.protocol !== 'https:') {
    throw new RecognitionProviderError(
      'RECOGNITION_PROVIDER_CONFIGURATION_ERROR',
      'Jestally recognition must use an HTTPS endpoint.',
    );
  }

  const timeoutMs = JESTALLY_API_TIMEOUT_MS === undefined
    ? DEFAULT_TIMEOUT_MS
    : Number(JESTALLY_API_TIMEOUT_MS);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new RecognitionProviderError(
      'RECOGNITION_PROVIDER_CONFIGURATION_ERROR',
      `JESTALLY_API_TIMEOUT_MS must be an integer between 1 and ${MAX_TIMEOUT_MS}.`,
    );
  }

  return { url: url.href, apiKey: JESTALLY_API_KEY, timeoutMs };
}

function parseProviderResponse(body) {
  if (
    !body
    || typeof body !== 'object'
    || Array.isArray(body)
    || body.success !== true
  ) {
    throw new RecognitionProviderError(
      'RECOGNITION_PROVIDER_INVALID_RESPONSE',
      'Jestally returned an invalid recognition response.',
    );
  }

  if (body.sign === undefined || body.sign === null || body.sign === '') {
    if (body.message !== undefined && typeof body.message !== 'string') {
      throw new RecognitionProviderError(
        'RECOGNITION_PROVIDER_INVALID_RESPONSE',
        'Jestally returned an invalid recognition response.',
      );
    }

    return {
      abstained: true,
      message: body.message?.trim().slice(0, 500) || '',
    };
  }

  if (
    typeof body.sign !== 'string'
    || !body.sign.trim()
    || body.sign.length > 200
    || typeof body.confidence !== 'number'
    || !Number.isFinite(body.confidence)
    || body.confidence < 0
    || body.confidence > 1
  ) {
    throw new RecognitionProviderError(
      'RECOGNITION_PROVIDER_INVALID_RESPONSE',
      'Jestally returned an invalid recognition response.',
    );
  }

  let top3 = [];
  if (body.top3 !== undefined) {
    if (
      !Array.isArray(body.top3)
      || body.top3.length > 3
      || body.top3.some((item) => (
        !item
        || typeof item !== 'object'
        || Array.isArray(item)
        || typeof item.sign !== 'string'
        || !item.sign.trim()
        || typeof item.confidence !== 'number'
        || !Number.isFinite(item.confidence)
        || item.confidence < 0
        || item.confidence > 1
      ))
    ) {
      throw new RecognitionProviderError(
        'RECOGNITION_PROVIDER_INVALID_RESPONSE',
        'Jestally returned invalid alternative predictions.',
      );
    }

    top3 = body.top3.map(({ sign, confidence }) => ({ sign, confidence }));
  }

  return {
    abstained: false,
    sign: body.sign.trim(),
    confidence: body.confidence,
    top3,
  };
}

function providerErrorForStatus(status) {
  if (status === 401 || status === 403) {
    return new RecognitionProviderError(
      'RECOGNITION_PROVIDER_AUTH_ERROR',
      'Jestally rejected the server credentials or access.',
    );
  }
  if (status === 429) {
    return new RecognitionProviderError(
      'RECOGNITION_PROVIDER_RATE_LIMITED',
      'Jestally recognition is temporarily rate limited. Try again later.',
    );
  }
  return new RecognitionProviderError(
    'RECOGNITION_PROVIDER_UNAVAILABLE',
    'Jestally recognition is temporarily unavailable.',
  );
}

function transportError(error) {
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return new RecognitionProviderError(
      'RECOGNITION_PROVIDER_TIMEOUT',
      'Jestally recognition timed out. Please try again.',
    );
  }
  return new RecognitionProviderError(
    'RECOGNITION_PROVIDER_NETWORK_ERROR',
    'Could not connect to Jestally recognition.',
  );
}

async function recognizeSequence(sequence) {
  const validationError = validateSequence(sequence);
  if (validationError) {
    throw new RecognitionProviderError('INVALID_LANDMARK_SEQUENCE', validationError);
  }

  const { url, apiKey, timeoutMs } = getProviderConfig();
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ sequence }),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
  } catch (error) {
    throw transportError(error);
  }

  if (!response.ok) {
    throw providerErrorForStatus(response.status);
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw transportError(error);
    }
    throw new RecognitionProviderError(
      'RECOGNITION_PROVIDER_INVALID_RESPONSE',
      'Jestally returned an invalid recognition response.',
    );
  }

  return parseProviderResponse(body);
}

module.exports = {
  recognizeSequence,
  validateSequence,
  parseProviderResponse,
  RecognitionProviderError,
};
