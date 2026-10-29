const mongoose = require('mongoose');

const lessonCompletionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    bestScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

lessonCompletionSchema.index(
  { user: 1, lesson: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'LessonCompletion',
  lessonCompletionSchema
);