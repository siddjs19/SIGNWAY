const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    completedLessons: {
      type: Number,
      default: 0,
      min: 0
    },

    totalLessons: {
      type: Number,
      default: 20,
      min: 1
    },

    achievements: {
      type: [String],
      default: []
    },

    lastLessonCompletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Progress', progressSchema);