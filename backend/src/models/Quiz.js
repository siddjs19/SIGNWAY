const mongoose = require('mongoose');

const QUESTION_TYPES = ['single-choice', 'multiple-choice', 'video-based'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const questionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  questionType: { type: String, enum: QUESTION_TYPES, default: 'single-choice' },
  difficulty: { type: String, enum: DIFFICULTIES, default: 'beginner' },
  topic: { type: String, default: '' },
  contentReviewStatus: {
    type: String,
    enum: ['pending', 'reviewed'],
    default: 'pending',
  },
  options: {
    type: [String],
    validate: v => Array.isArray(v) && v.length >= 2,
    required: true,
  },
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator(value) {
        return Array.isArray(value)
          ? value.length > 0 && value.every(answer => typeof answer === 'string')
          : typeof value === 'string';
      },
      message: 'A question must have a string answer or a non-empty array of answers',
    },
  },
  explanation: { type: String, default: '' },
});

questionSchema.pre('validate', function validateQuestionType() {
  const answers = Array.isArray(this.correctAnswer)
    ? this.correctAnswer
    : [this.correctAnswer];
  if (this.questionType === 'multiple-choice' && !Array.isArray(this.correctAnswer)) {
    this.invalidate('correctAnswer', 'Multiple-choice questions require an array answer');
  }
  if (this.questionType !== 'multiple-choice' && Array.isArray(this.correctAnswer)) {
    this.invalidate('correctAnswer', 'Only multiple-choice questions may have multiple answers');
  }
  const options = this.options || [];
  if (answers.some(answer => !options.includes(answer))) {
    this.invalidate('correctAnswer', 'Correct answers must be present in the options');
  }
  if (Array.isArray(this.correctAnswer) && new Set(this.correctAnswer).size !== this.correctAnswer.length) {
    this.invalidate('correctAnswer', 'Multiple-choice correct answers must be unique');
  }
  if (this.questionType === 'video-based' && (!this.mediaUrl || this.mediaType !== 'video')) {
    this.invalidate('mediaUrl', 'Video-based questions require a video media URL');
  }
});

const quizSchema = new mongoose.Schema(
  {
    slug: { type: String, unique: true, sparse: true },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    title: { type: String, required: true },
    questions: [questionSchema],
    assessmentFocus: {
      type: String,
      enum: ['isl-learning', 'course-metadata'],
      default: 'course-metadata',
    },
    passingScore: { type: Number, default: 70 },
    contentReviewStatus: {
      type: String,
      enum: ['pending', 'reviewed'],
      default: 'pending',
    },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);