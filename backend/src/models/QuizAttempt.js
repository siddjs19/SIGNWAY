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
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
    lessonBreakdown: [{
      lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
      lessonTitle: String,
      correct: Number,
      total: Number,
      score: Number,
    }],
    score: { type: Number, required: true },
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