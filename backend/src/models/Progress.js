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
      default: 0,
      min: 0
    },
    inProgressLessons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    }],
    lastAccessedLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
    recentLessonActivity: [{
      lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true,
      },
      activity: {
        type: String,
        enum: ['started', 'resumed', 'completed'],
        required: true,
      },
      occurredAt: {
        type: Date,
        default: Date.now,
      },
    }],

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