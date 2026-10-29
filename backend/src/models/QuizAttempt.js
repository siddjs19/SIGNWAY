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
      required: true,
    },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    answers: [{
      questionId: mongoose.Schema.Types.ObjectId,
      selectedAnswer: String,
      isCorrect: Boolean,
    }],
    passed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);