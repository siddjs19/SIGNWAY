// QuizAttempt.js
const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      default: null,
    },
    mode: {
      type: String,
      enum: ['lesson', 'full-course'],
      default: 'lesson',
    },
    assessmentFocus: {
      type: String,
      enum: ['isl-learning', 'course-metadata'],
      default: 'course-metadata',
    },
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
    lessonBreakdown: [{
      lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
      lessonTitle: String,
      correct: Number,
      total: Number,
      score: Number,
    }],
    score: { type: Number, required: true },
    passingScore: { type: Number, default: null },
    total: { type: Number, required: true },
    answers: [{
      questionId: mongoose.Schema.Types.ObjectId,
      selectedAnswer: String,
      isCorrect: Boolean,
      correctAnswer: String,
      explanation: String,
    }],
    passed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);