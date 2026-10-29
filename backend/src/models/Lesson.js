const mongoose = require('mongoose');

const signSchema = new mongoose.Schema({
  term: { type: String, required: true },
  meaning: { type: String, required: true },
  explanation: { type: String, default: '' },
  example: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'animation', 'none'],
    default: 'none',
  },
  sourceUrl: { type: String, default: '' },
  verified: { type: Boolean, default: false },
});

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    category: { type: String, required: true },
    order: { type: Number, default: 0 },
    signs: [signSchema],
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lesson', lessonSchema);