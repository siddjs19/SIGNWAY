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

const learningResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  provider: { type: String, required: true },
  author: { type: String, required: true },
  videoId: { type: String, required: true },
  sourceUrl: { type: String, required: true },
  playlistUrl: { type: String, required: true },
  embedUrl: { type: String, default: '' },
  publishedAt: { type: Date, default: null },
  metadataVerifiedAt: { type: Date, default: null },
  availabilityStatus: {
    type: String,
    enum: ['available', 'unavailable', 'unknown'],
    default: 'unknown',
  },
  embeddable: { type: Boolean, default: false },
  metadataStatus: {
    type: String,
    enum: ['verified', 'unavailable', 'unverified'],
    default: 'unverified',
  },
});

const lessonSchema = new mongoose.Schema(
  {
    slug: { type: String, unique: true, sparse: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    introduction: { type: String, default: '' },
    learningObjectives: { type: [String], default: [] },
    contentReviewStatus: {
      type: String,
      enum: ['pending', 'reviewed'],
      default: 'pending',
    },
    contentReviewNote: { type: String, default: '' },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    category: { type: String, required: true },
    order: { type: Number, default: 0 },
    signs: [signSchema],
    resources: { type: [learningResourceSchema], default: [] },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lesson', lessonSchema);