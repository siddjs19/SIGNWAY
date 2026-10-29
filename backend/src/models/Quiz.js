const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  mediaUrl: { type: String, default: '' },
  options: {
    type: [String],
    validate: v => v.length >= 2,
    required: true,
  },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: '' },
});

const quizSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    title: { type: String, required: true },
    questions: [questionSchema],
    passingScore: { type: Number, default: 70 },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);