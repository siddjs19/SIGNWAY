const express = require('express');
const auth = require('../middleware/auth');
const PracticeSession = require('../models/PracticeSession');
const practitioners = require('../demo/practitioners');

const router = express.Router();
const practitionersById = new Map(practitioners.map((practitioner) => [practitioner.id, practitioner]));

function validateSessionRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Request body must be an object.';
  }
  const allowedFields = new Set(['practitionerId', 'scheduledAt', 'message']);
  if (Object.keys(payload).some((field) => !allowedFields.has(field))) {
    return 'Request contains unsupported fields.';
  }
  if (typeof payload.practitionerId !== 'string' || !practitionersById.has(payload.practitionerId)) {
    return 'Choose a practitioner from the directory.';
  }
  if (
    typeof payload.scheduledAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payload.scheduledAt)
  ) {
    return 'Choose a valid session date and time.';
  }
  const scheduledAt = new Date(payload.scheduledAt);
  if (
    !Number.isFinite(scheduledAt.getTime())
    || scheduledAt.toISOString() !== payload.scheduledAt
  ) {
    return 'Choose a valid session date and time.';
  }
  if (scheduledAt <= new Date()) {
    return 'Session date and time must be in the future.';
  }
  if (payload.message !== undefined && (
    typeof payload.message !== 'string' || payload.message.trim().length > 1000
  )) {
    return 'Message must be 1000 characters or fewer.';
  }
  return null;
}

function toSessionResponse(session) {
  const value = typeof session.toObject === 'function' ? session.toObject() : session;
  return {
    id: String(value._id),
    practitioner: practitionersById.get(value.practitionerId),
    scheduledAt: value.scheduledAt,
    message: value.message || '',
    status: value.status,
    createdAt: value.createdAt,
  };
}

router.use(auth);

router.get('/', (req, res) => {
  res.json({ success: true, data: practitioners });
});

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await PracticeSession.find({ learner: req.user._id })
      .sort({ scheduledAt: -1 })
      .lean();
    return res.json({ success: true, data: sessions.map(toSessionResponse) });
  } catch (error) {
    console.error('Practice session lookup failed:', error.message);
    return res.status(500).json({
      success: false,
      code: 'PRACTICE_SESSIONS_UNAVAILABLE',
      message: 'Your practice sessions could not be loaded.',
    });
  }
});

router.post('/sessions', async (req, res) => {
  const validationError = validateSessionRequest(req.body);
  if (validationError) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PRACTICE_SESSION',
      message: validationError,
    });
  }

  try {
    const session = await PracticeSession.create({
      learner: req.user._id,
      practitionerId: req.body.practitionerId,
      scheduledAt: new Date(req.body.scheduledAt),
      message: req.body.message?.trim() || '',
      status: 'pending',
    });
    return res.status(201).json({
      success: true,
      data: toSessionResponse(session),
      message: 'Demo practice request saved with pending status. No real practitioner was contacted.',
    });
  } catch (error) {
    console.error('Practice session request failed:', error.message);
    return res.status(500).json({
      success: false,
      code: 'PRACTICE_SESSION_REQUEST_FAILED',
      message: 'Your practice request could not be saved.',
    });
  }
});

module.exports = router;
module.exports.validateSessionRequest = validateSessionRequest;
