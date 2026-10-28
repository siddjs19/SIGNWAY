const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    title: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'New ISL Practice'
    },

    topic: {
      type: String,
      enum: [
        'daily-life',
        'education',
        'shopping',
        'travel',
        'healthcare',
        'general'
      ],
      default: 'general'
    },

    language: {
      type: String,
      enum: ['en', 'hi', 'mr'],
      default: 'en'
    },

    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  'Conversation',
  conversationSchema
);