const express = require('express');
const auth = require('../middleware/auth');
const recognitionProvider = require('../services/recognitionProvider');
const islBridgeProvider = require('../services/islBridgeProvider');

const router = express.Router();

function validateLandmarkSequencePayload(payload) {
  if (
    !payload
    || typeof payload !== 'object'
    || Array.isArray(payload)
    || Object.keys(payload).some((key) => key !== 'sequence')
    || !Array.isArray(payload.sequence)
  ) {
    return 'Request must contain a landmark sequence only';
  }

  return recognitionProvider.validateSequence(payload.sequence);
}

router.post('/landmarks', auth, async (req, res) => {
  const validationError = validateLandmarkSequencePayload(req.body);
  if (validationError) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_LANDMARK_SEQUENCE',
      message: validationError,
    });
  }

  try {
    const prediction = await recognitionProvider.recognizeSequence(req.body.sequence);
    if (prediction.abstained) {
      return res.json({
        success: true,
        prediction: null,
        abstained: true,
        message: prediction.message,
      });
    }
    return res.json({
      success: true,
      prediction,
    });
  } catch (error) {
    const knownErrors = {
      RECOGNITION_PROVIDER_NOT_CONFIGURED: {
        status: 503,
        message: error.message,
      },
      RECOGNITION_PROVIDER_CONFIGURATION_ERROR: {
        status: 500,
        message: error.message,
      },
      RECOGNITION_PROVIDER_AUTH_ERROR: {
        status: 502,
        message: error.message,
      },
      RECOGNITION_PROVIDER_RATE_LIMITED: {
        status: 503,
        message: error.message,
      },
      RECOGNITION_PROVIDER_TIMEOUT: {
        status: 504,
        message: error.message,
      },
      RECOGNITION_PROVIDER_NETWORK_ERROR: {
        status: 502,
        message: error.message,
      },
      RECOGNITION_PROVIDER_UNAVAILABLE: {
        status: 502,
        message: error.message,
      },
      RECOGNITION_PROVIDER_INVALID_RESPONSE: {
        status: 502,
        message: error.message,
      },
      INVALID_LANDMARK_SEQUENCE: {
        status: 400,
        message: error.message,
      },
    };
    const providerError = knownErrors[error.code];
    if (!providerError) {
      console.error('Recognition provider failed unexpectedly');
    } else if (providerError.status >= 500) {
      console.error('Recognition provider request failed:', error.code);
    }
    return res.status(providerError?.status || 502).json({
      success: false,
      code: providerError ? error.code : 'RECOGNITION_PROVIDER_ERROR',
      message: providerError?.message || 'Jestally recognition could not process this sequence.',
    });
  }
});

router.post('/isl-bridge/frame', auth, async (req, res) => {
  const validationError = islBridgeProvider.validateFramePayload(req.body);
  if (validationError) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_ISL_BRIDGE_FRAME',
      message: validationError,
    });
  }

  try {
    const result = await islBridgeProvider.recognizeFrame(req.body.image, req.body.language);
    return res.json({
      success: true,
      result,
      empty: !result.sign && !result.word && !result.sentence,
    });
  } catch (error) {
    if (!(error instanceof islBridgeProvider.IslBridgeProviderError)) {
      console.error('ISL Bridge provider failed unexpectedly');
    } else if (error.status >= 500) {
      console.error('ISL Bridge provider request failed:', error.code);
    }
    return res.status(error.status || 502).json({
      success: false,
      code: error.code || 'ISL_BRIDGE_PROVIDER_ERROR',
      message: error.message || 'ISL Bridge could not process this frame.',
    });
  }
});

module.exports = router;
module.exports.validateLandmarkSequencePayload = validateLandmarkSequencePayload;
