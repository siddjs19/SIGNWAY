const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },

    sender: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },

    type: {
      type: String,
      enum: ['text', 'sign-description'],
      default: 'text'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Message', messageSchema);