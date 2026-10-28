const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const User = require('../models/User');

// 1. GET USER PROFILE
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        consent: user.consent,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
});

// 2. UPDATE PROFILE AND SETTINGS
router.patch('/', auth, async (req, res) => {
  try {
    const { name, preferences, consent } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (
        typeof name !== 'string' ||
        name.trim().length < 2 ||
        name.trim().length > 80
      ) {
        return res.status(400).json({
          success: false,
          message: 'Name must contain 2 to 80 characters'
        });
      }

      updates.name = name.trim();
    }

    if (
      preferences !== undefined &&
      (!preferences ||
        typeof preferences !== 'object' ||
        Array.isArray(preferences))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Preferences must be an object'
      });
    }

    if (preferences) {
      if (preferences.language !== undefined) {
        if (!['en', 'hi', 'mr'].includes(preferences.language)) {
          return res.status(400).json({
            success: false,
            message: 'Language must be en, hi, or mr'
          });
        }

        updates['preferences.language'] = preferences.language;
      }

      for (const field of ['accessibilityMode', 'reducedMotion']) {
        if (preferences[field] !== undefined) {
          if (typeof preferences[field] !== 'boolean') {
            return res.status(400).json({
              success: false,
              message: `${field} must be true or false`
            });
          }

          updates[`preferences.${field}`] = preferences[field];
        }
      }
    }

    if (
      consent !== undefined &&
      (!consent ||
        typeof consent !== 'object' ||
        Array.isArray(consent))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Consent must be an object'
      });
    }

    if (consent) {
      for (const field of [
        'saveConversations',
        'communityMatching'
      ]) {
        if (consent[field] !== undefined) {
          if (typeof consent[field] !== 'boolean') {
            return res.status(400).json({
              success: false,
              message: `${field} must be true or false`
            });
          }

          updates[`consent.${field}`] = consent[field];
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        preferences: updatedUser.preferences,
        consent: updatedUser.consent
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;