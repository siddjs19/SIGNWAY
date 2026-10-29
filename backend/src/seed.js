require('dotenv').config();
const mongoose = require('mongoose');
const Lesson = require('./models/Lesson');

const lessons = [
  {
    title: 'ISL Foundations',
    description: 'An introduction to learning Indian Sign Language.',
    level: 'beginner',
    category: 'Foundations',
    order: 1,
    published: false,
    signs: [
      {
        term: 'Sample vocabulary item',
        meaning: 'Replace with a verified meaning',
        explanation: 'Add an explanation reviewed by an ISL educator.',
        example: 'Add a suitable usage example.',
        mediaType: 'none',
        verified: false,
      },
    ],
  },
];

async function seed() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI must be configured before seeding lessons');
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(mongoUri);

    for (const lesson of lessons) {
      await Lesson.updateOne(
        { title: lesson.title },
        { $setOnInsert: lesson },
        { upsert: true }
      );
    }

    console.log('Placeholder lesson records are available (unpublished by default)');
  } catch (error) {
    console.error('Lesson seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seed();