const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    preferences: {
      language: {
        type: String,
        enum: ['en', 'hi', 'mr'],
        default: 'en'
      },
      accessibilityMode: {
        type: Boolean,
        default: false
      },
      reducedMotion: {
        type: Boolean,
        default: false
      }
    },

    consent: {
      saveConversations: {
        type: Boolean,
        default: true
      },
      communityMatching: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);