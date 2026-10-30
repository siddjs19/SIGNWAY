const API_URL = 'https://shridalisingh-isl-bridge.hf.space/predict';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_TIMEOUT_MS = 60000;
const DATA_URL_PREFIX = 'data:image/jpeg;base64,';

class IslBridgeProviderError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'IslBridgeProviderError';
    this.code = code;
    this.status = status;
  }
}

function validateFramePayload(payload) {
  if (
    !payload
    || typeof payload !== 'object'
    || Array.isArray(payload)
    || Object.keys(payload).some((key) => !['image', 'language'].includes(key))
    || typeof payload.image !== 'string'
    || typeof payload.language !== 'string'
    || !/^[a-z]{2}(?:-[A-Za-z0-9]{2,8})?$/.test(payload.language)
  ) {
    return 'Request must contain a JPEG data URL and a valid language code';
  }

  if (!payload.image.startsWith(DATA_URL_PREFIX)) {
    return 'Image must be a JPEG base64 data URL';
  }

  const encodedImage = payload.image.slice(DATA_URL_PREFIX.length);
  const maxEncodedLength = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
  if (!encodedImage || encodedImage.length > maxEncodedLength) {
    return 'JPEG frame must not exceed 2 MiB';
  }

  if (
    encodedImage.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encodedImage)
  ) {
    return 'Image must contain valid base64-encoded JPEG data';
  }

  const imageBytes = Buffer.from(encodedImage, 'base64');
  if (imageBytes.length > MAX_IMAGE_BYTES) {
    return 'JPEG frame must not exceed 2 MiB';
  }
  if (
    imageBytes.length === 0
    || imageBytes[0] !== 0xff
    || imageBytes[1] !== 0xd8
    || imageBytes[2] !== 0xff
  ) {
    return 'Image must be a valid JPEG frame no larger than 2 MiB';
  }

  return null;
}

function getTimeoutMs() {
  const configuredTimeout = process.env.ISL_BRIDGE_API_TIMEOUT_MS;
  const timeoutMs = configuredTimeout === undefined
    ? DEFAULT_TIMEOUT_MS
    : Number(configuredTimeout);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new IslBridgeProviderError(
      'ISL_BRIDGE_CONFIGURATION_ERROR',
      `ISL_BRIDGE_API_TIMEOUT_MS must be an integer between 1 and ${MAX_TIMEOUT_MS}.`,
      500,
    );
  }
  return timeoutMs;
}

function parseProviderResponse(body) {
  if (
    !body
    || typeof body !== 'object'
    || Array.isArray(body)
    || !['sign', 'word', 'sentence'].every((key) => (
      typeof body[key] === 'string' && body[key].length <= 2000
    ))
  ) {
    throw new IslBridgeProviderError(
      'ISL_BRIDGE_INVALID_RESPONSE',
      'ISL Bridge returned an invalid recognition response.',
    );
  }

  return {
    sign: body.sign.trim(),
    word: body.word.trim(),
    sentence: body.sentence.trim(),
  };
}

async function recognizeFrame(image, language) {
  const validationError = validateFramePayload({ image, language });
  if (validationError) {
    throw new IslBridgeProviderError('INVALID_ISL_BRIDGE_FRAME', validationError, 400);
  }

  const timeoutMs = getTimeoutMs();
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, language }),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new IslBridgeProviderError(
        'ISL_BRIDGE_TIMEOUT',
        'ISL Bridge did not respond before the request timed out.',
        504,
      );
    }
    throw new IslBridgeProviderError(
      'ISL_BRIDGE_NETWORK_ERROR',
      'Could not connect to the ISL Bridge recognition service.',
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new IslBridgeProviderError(
        'ISL_BRIDGE_RATE_LIMITED',
        'ISL Bridge is temporarily rate limited. Try again later.',
        503,
      );
    }
    throw new IslBridgeProviderError(
      'ISL_BRIDGE_PROVIDER_ERROR',
      'ISL Bridge could not process this frame.',
      502,
    );
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new IslBridgeProviderError(
        'ISL_BRIDGE_TIMEOUT',
        'ISL Bridge did not respond before the request timed out.',
        504,
      );
    }
    throw new IslBridgeProviderError(
      'ISL_BRIDGE_INVALID_RESPONSE',
      'ISL Bridge returned an invalid recognition response.',
    );
  }

  return parseProviderResponse(body);
}

module.exports = {
  API_URL,
  MAX_IMAGE_BYTES,
  recognizeFrame,
  validateFramePayload,
  parseProviderResponse,
  IslBridgeProviderError,
};
