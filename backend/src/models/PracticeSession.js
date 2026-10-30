const mongoose = require('mongoose');

const practiceSessionSchema = new mongoose.Schema(
  {
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    practitionerId: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'completed'],
      default: 'pending',
      required: true,
    },
  },
  { timestamps: true },
);

practiceSessionSchema.index({ learner: 1, scheduledAt: -1 });

module.exports = mongoose.model('PracticeSession', practiceSessionSchema);
