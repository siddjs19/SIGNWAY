require('dotenv').config();
const mongoose = require('mongoose');
const Lesson = require('./models/Lesson');
const Quiz = require('./models/Quiz');

const playlistUrl = 'https://www.youtube.com/playlist?list=PLFjydPMg4DapfRTBMokl09Ht-fhMOAYf6';
const metadataVerifiedAt = new Date('2026-10-29T14:48:00.000Z');
const islrtc = 'Indian Sign Language Research and Training Centre';

function resource(title, videoId, publishedAt) {
  return {
    title,
    provider: 'YouTube',
    author: islrtc,
    videoId,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    playlistUrl,
    embedUrl: `https://www.youtube.com/embed/${videoId}?feature=oembed`,
    publishedAt: new Date(publishedAt),
    metadataVerifiedAt,
    availabilityStatus: 'available',
    embeddable: true,
    metadataStatus: 'verified',
  };
}

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
  {
    slug: 'isl-introduction',
    title: 'Introduction to Indian Sign Language',
    description: 'An orientation to ISLRTC’s Basic Communication Skills in Indian Sign Language self-learning course.',
    introduction: 'ISLRTC describes this self-learning course as a Basic Communication Skills course in Indian Sign Language, comprising 10 modules and 30 topics over a stated 40-hour learning duration. The linked “Guideline” video is listed as the course’s first resource; its title alone does not establish that it teaches any particular sign. This SignBridge-authored overview is awaiting qualified ISL review.',
    learningObjectives: [
      'Identify ISLRTC as the publisher named on the course resource.',
      'Recall the module count and stated duration in the playlist description.',
      'Distinguish official course metadata from SignBridge-authored material awaiting review.',
    ],
    contentReviewStatus: 'pending',
    contentReviewNote: 'SignBridge-authored explanations and quiz questions require review by a qualified ISL educator. The external video title and publisher were verified; no individual sign claim is made.',
    level: 'beginner',
    category: 'Foundations',
    order: 1,
    published: false,
    signs: [],
    resources: [
      resource('Guideline', '5PF6JXzYyUI', '2023-09-25T09:02:27.000Z'),
    ],
  },
  {
    slug: 'isl-greetings-polite-expressions',
    title: 'Greetings and Polite Expressions',
    description: 'An introductory lesson paired with ISLRTC resources whose verified titles cover greetings, salutations, and polite phrases.',
    introduction: 'The linked ISLRTC resources are titled “Module 1.2 Greeting and salutations in Indian Sign Language” and “Module 1.3 Some polite useful phrases.” Their titles support this topic pairing, but SignBridge has not independently reviewed their visual instruction or verified individual sign forms. Use the videos as the primary learning material; this original introduction and quiz remain pending qualified review.',
    learningObjectives: [
      'Locate the ISLRTC resources identified by their titles as greetings/salutations and polite phrases.',
      'Use the official videos as the source for observing the demonstrated material.',
      'Avoid treating SignBridge-authored text as verified sign instruction.',
    ],
    contentReviewStatus: 'pending',
    contentReviewNote: 'Only video titles, publisher metadata, availability, and embeddability were checked. Sign content and SignBridge-authored quiz require qualified ISL review.',
    level: 'beginner',
    category: 'Basic Communication',
    order: 2,
    published: false,
    signs: [],
    resources: [
      resource(
        'Module 1.2 Greeting and salutations in Indian Sign Language',
        '5vHmvYA8Z6Q',
        '2023-09-25T09:03:05.000Z',
      ),
      resource('Module 1.3 Some polite useful phrases.', 'neE5Fg4FVtA', '2023-09-25T09:03:24.000Z'),
    ],
  },
  {
    slug: 'introducing-yourself-in-isl',
    title: 'Introducing Yourself',
    description: 'A beginner lesson paired with ISLRTC’s “Module 2.2 Introducing oneself (name, work, place, etc.).”',
    introduction: 'The verified resource title names introducing oneself and explicitly lists name, work, and place as topics. This lesson links that source without asserting how those concepts are signed. The SignBridge-authored text and quiz are pending qualified review.',
    learningObjectives: [
      'Identify the topics explicitly named in the ISLRTC video title: name, work, and place.',
      'Watch the official resource for its demonstrations rather than relying on unreviewed SignBridge sign descriptions.',
      'Separate verified source metadata from SignBridge-authored learning content.',
    ],
    contentReviewStatus: 'pending',
    contentReviewNote: 'The video title, publisher metadata, availability, and embeddability were verified. Visual instruction and SignBridge-authored quiz require qualified ISL review.',
    level: 'beginner',
    category: 'Basic Communication',
    order: 3,
    published: false,
    signs: [],
    resources: [
      resource(
        'Module 2.2 Introducing oneself (name, work, place, etc.)',
        'mc_NxVJlhi8',
        '2023-09-25T09:04:15.000Z',
      ),
    ],
  },
];

const quizzes = [
  {
    slug: 'isl-introduction-source-check',
    title: 'Introduction: source and course facts',
    passingScore: 70,
    contentReviewStatus: 'pending',
    published: false,
    questions: [
      {
        prompt: 'Which organization is named as the publisher of the playlist resources?',
        options: [
          'Indian Sign Language Research and Training Centre',
          'SignBridge AI',
          'A university language department',
        ],
        correctAnswer: 'Indian Sign Language Research and Training Centre',
        explanation: 'The playlist feed and video metadata name ISLRTC as the publisher.',
      },
      {
        prompt: 'According to the playlist description, how many modules does the course comprise?',
        options: ['5', '10', '30'],
        correctAnswer: '10',
        explanation: 'The playlist description states 10 modules covering 30 topics.',
      },
      {
        prompt: 'Does the title “Guideline” verify any specific sign form?',
        options: ['Yes, it verifies all signs in the course', 'No, the title alone does not establish a sign claim'],
        correctAnswer: 'No, the title alone does not establish a sign claim',
        explanation: 'SignBridge does not claim that a specific sign appears in the Guideline video.',
      },
    ],
  },
  {
    slug: 'isl-greetings-polite-expressions-source-check',
    title: 'Greetings and polite expressions: source check',
    passingScore: 70,
    contentReviewStatus: 'pending',
    published: false,
    questions: [
      {
        prompt: 'Which verified resource title explicitly mentions greetings and salutations?',
        options: [
          'Module 1.2 Greeting and salutations in Indian Sign Language',
          'Module 1.3 Some polite useful phrases.',
          'Guideline',
        ],
        correctAnswer: 'Module 1.2 Greeting and salutations in Indian Sign Language',
        explanation: 'This is the verified title returned by YouTube for the ISLRTC resource.',
      },
      {
        prompt: 'Which verified resource title names polite useful phrases?',
        options: [
          'Module 1.1 Manners and etiquettes',
          'Module 1.3 Some polite useful phrases.',
          'Module 1.4 Quiz',
        ],
        correctAnswer: 'Module 1.3 Some polite useful phrases.',
        explanation: 'This title appears in the ISLRTC playlist feed and YouTube video metadata.',
      },
      {
        prompt: 'What has SignBridge independently confirmed about individual signs in these videos?',
        options: [
          'Every sign has been reviewed and verified',
          'No individual sign forms have been independently verified by SignBridge',
        ],
        correctAnswer: 'No individual sign forms have been independently verified by SignBridge',
        explanation: 'Metadata verification confirms titles and availability, not the content of each sign.',
      },
    ],
  },
  {
    slug: 'introducing-yourself-in-isl-source-check',
    title: 'Introducing yourself: source check',
    passingScore: 70,
    contentReviewStatus: 'pending',
    published: false,
    questions: [
      {
        prompt: 'Which topics are explicitly listed in the verified title of Module 2.2?',
        options: [
          'Name, work, and place',
          'Greetings, colors, and food',
          'Numbers, money, and directions',
        ],
        correctAnswer: 'Name, work, and place',
        explanation: 'The verified title is “Module 2.2 Introducing oneself (name, work, place, etc.).”',
      },
      {
        prompt: 'Which organization is named as the video publisher?',
        options: [
          'Indian Sign Language Research and Training Centre',
          'SignBridge AI',
          'A community matching service',
        ],
        correctAnswer: 'Indian Sign Language Research and Training Centre',
        explanation: 'YouTube metadata names the Indian Sign Language Research and Training Centre.',
      },
      {
        prompt: 'Does this lesson claim to teach a specific sign based on the video title alone?',
        options: ['Yes', 'No'],
        correctAnswer: 'No',
        explanation: 'The title identifies the topic, but the sign demonstrations have not been independently reviewed.',
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

    const seededLessons = new Map();
    for (const lesson of lessons) {
      await Lesson.updateOne(
        lesson.slug ? { slug: lesson.slug } : { title: lesson.title },
        { $setOnInsert: lesson },
        { upsert: true }
      );
      if (lesson.slug) {
        seededLessons.set(lesson.slug, await Lesson.findOne({ slug: lesson.slug }).select('_id'));
      }
    }

    for (const quiz of quizzes) {
      const lessonSlug = quiz.slug.replace(/-source-check$/, '');
      const lesson = seededLessons.get(lessonSlug);
      if (!lesson) {
        throw new Error(`Could not find seeded lesson for quiz ${quiz.slug}`);
      }
      await Quiz.updateOne(
        { slug: quiz.slug },
        { $setOnInsert: { ...quiz, lesson: lesson._id } },
        { upsert: true }
      );
    }

    console.log('ISLRTC lesson and quiz drafts are available (unpublished pending qualified review)');
  } catch (error) {
    console.error('Lesson seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed, lessons, quizzes };
