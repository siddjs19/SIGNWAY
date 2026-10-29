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
    keyTakeaways: [
      'ISLRTC identifies the playlist as a Basic Communication Skills course in Indian Sign Language.',
      'The playlist description states 10 modules, 30 topics, and a 40-hour learning duration.',
      'Verified titles and course metadata do not independently verify individual sign instruction.',
    ],
    completionChecklist: [
      'Watch the linked ISLRTC Guideline resource.',
      'Recall the module, topic, and duration details stated in the playlist description.',
      'Distinguish verified source information from sign content awaiting qualified review.',
    ],
    practiceActivities: [
      'After watching the Guideline resource, write down the course facts stated in its publisher description.',
      'Compare the lesson title and resource title; do not infer sign forms from metadata.',
    ],
    contentReviewStatus: 'pending',
    contentReviewNote: 'SignBridge-authored explanations and quiz questions require review by a qualified ISL educator. The external video title and publisher were verified; no individual sign claim is made.',
    level: 'beginner',
    category: 'Foundations',
    moduleTitle: 'Course orientation',
    moduleOrder: 1,
    prerequisites: [],
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
    keyTakeaways: [
      'The linked ISLRTC titles identify one greetings/salutations resource and one polite-phrases resource.',
      'The titles establish the publisher-stated topics, not the correctness of individual sign demonstrations.',
      'The SignBridge-authored lesson text and quiz remain pending qualified ISL review.',
    ],
    completionChecklist: [
      'Watch both linked ISLRTC resources.',
      'Identify which resource title covers greetings and which names polite useful phrases.',
      'Treat the video as the source for its demonstrations; SignBridge has not independently reviewed individual signs.',
    ],
    practiceActivities: [
      'Watch each linked ISLRTC resource and record the topic named in its title.',
      'Use the official videos as the source for demonstrations; SignBridge does not validate learner signing.',
    ],
    contentReviewStatus: 'pending',
    contentReviewNote: 'Only video titles, publisher metadata, availability, and embeddability were checked. Sign content and SignBridge-authored quiz require qualified ISL review.',
    level: 'beginner',
    category: 'Basic Communication',
    moduleTitle: 'Module 1: Greetings and polite phrases',
    moduleOrder: 2,
    prerequisites: [],
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
    keyTakeaways: [
      'The verified Module 2.2 title names introducing oneself and lists name, work, and place.',
      'A resource title identifies its topic but does not establish the exact sign forms or linguistic use.',
      'The SignBridge-authored lesson text and quiz remain pending qualified ISL review.',
    ],
    completionChecklist: [
      'Watch the linked ISLRTC Module 2.2 resource.',
      'Recall the topics named in its verified title: name, work, and place.',
      'Do not treat the title or SignBridge-authored notes as independent verification of signs.',
    ],
    practiceActivities: [
      'Watch the linked Module 2.2 video and note the topics named in its title.',
      'Review the source material; do not treat self-assessment as validation of sign accuracy.',
    ],
    contentReviewStatus: 'pending',
    contentReviewNote: 'The video title, publisher metadata, availability, and embeddability were verified. Visual instruction and SignBridge-authored quiz require qualified ISL review.',
    level: 'beginner',
    category: 'Basic Communication',
    moduleTitle: 'Module 2: Introducing oneself',
    moduleOrder: 3,
    prerequisites: [],
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
    assessmentFocus: 'course-metadata',
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
    assessmentFocus: 'course-metadata',
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
    assessmentFocus: 'course-metadata',
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

const starterQuizzes = [
  {
    slug: 'isl-introduction-starter-check',
    lessonSlug: 'isl-introduction',
    title: 'Introduction: ISLRTC course-resource check',
    assessmentFocus: 'course-metadata',
    contentReviewStatus: 'pending',
    published: true,
    questions: [
      {
        prompt: 'Which organization is identified as the publisher of this basic communication course?',
        options: [
          'Indian Sign Language Research and Training Centre',
          'SignBridge AI',
          'National Association of the Deaf',
          'A university language department',
        ],
        correctAnswer: 'Indian Sign Language Research and Training Centre',
        explanation: 'The official playlist and video metadata identify ISLRTC as the source. This checks source attribution, not ISL proficiency.',
      },
      {
        prompt: 'According to the official playlist description, how many modules does the course comprise?',
        options: ['5', '10', '20', '30'],
        correctAnswer: '10',
        explanation: 'The playlist description states that the course comprises 10 modules.',
      },
      {
        prompt: 'How many topics does the official playlist description say the course covers?',
        options: ['10', '20', '30', '40'],
        correctAnswer: '30',
        explanation: 'The official course description states 30 topics across 10 modules.',
      },
      {
        prompt: 'What learning duration does the official course description state?',
        options: ['10 hours', '20 hours', '30 hours', '40 hours'],
        correctAnswer: '40 hours',
        explanation: 'The playlist description gives a stated duration of 40 hours, not a guarantee of individual study time.',
      },
    ],
  },
  {
    slug: 'isl-greetings-polite-expressions-starter-check',
    lessonSlug: 'isl-greetings-polite-expressions',
    title: 'Greetings and polite expressions: resource check',
    assessmentFocus: 'course-metadata',
    contentReviewStatus: 'pending',
    published: true,
    questions: [
      {
        prompt: 'Which ISLRTC resource title explicitly names greetings and salutations?',
        options: [
          'Module 1.2 Greeting and salutations in Indian Sign Language',
          'Module 1.3 Some polite useful phrases.',
          'Module 2.2 Introducing oneself (name, work, place, etc.)',
          'Basic Communication Skills: Course Overview',
        ],
        correctAnswer: 'Module 1.2 Greeting and salutations in Indian Sign Language',
        explanation: 'This is the verified title of the linked ISLRTC resource. The quiz does not assert how any greeting is signed.',
      },
      {
        prompt: 'Which linked resource title names polite useful phrases?',
        options: [
          'Module 1.3 Some polite useful phrases.',
          'Module 1.2 Greeting and salutations in Indian Sign Language',
          'Module 1.4 Quiz',
          'Guideline',
        ],
        correctAnswer: 'Module 1.3 Some polite useful phrases.',
        explanation: 'The verified playlist and video metadata use this title for the polite-phrases resource.',
      },
      {
        prompt: 'What does the verified title of Module 1.2 establish?',
        options: [
          'It is a resource titled about greetings and salutations',
          'Every sign in the video has been independently reviewed by SignBridge',
          'It certifies a learner’s fluency',
          'It provides a verified transcript of every sign',
        ],
        correctAnswer: 'It is a resource titled about greetings and salutations',
        explanation: 'A verified title establishes the resource topic as named by its publisher; it does not independently verify each sign demonstration.',
      },
      {
        prompt: 'Which statement is supported by the checked resource metadata?',
        options: [
          'The lesson links to two ISLRTC videos whose titles cover greetings and polite phrases',
          'SignBridge has verified every sign shown in both videos',
          'The videos guarantee conversational fluency',
          'The videos contain identical lessons',
        ],
        correctAnswer: 'The lesson links to two ISLRTC videos whose titles cover greetings and polite phrases',
        explanation: 'The linked video titles identify greetings/salutations and polite phrases. Their visual instruction has not been independently reviewed here.',
      },
    ],
  },
  {
    slug: 'introducing-yourself-in-isl-starter-check',
    lessonSlug: 'introducing-yourself-in-isl',
    title: 'Introducing yourself: resource check',
    assessmentFocus: 'course-metadata',
    contentReviewStatus: 'pending',
    published: true,
    questions: [
      {
        prompt: 'Which topics are explicitly named in the linked Module 2.2 title?',
        options: [
          'Name, work, and place',
          'Greetings, colors, and food',
          'Numbers, money, and directions',
          'Family, travel, and weather',
        ],
        correctAnswer: 'Name, work, and place',
        explanation: 'The verified title is “Module 2.2 Introducing oneself (name, work, place, etc.).”',
      },
      {
        prompt: 'What is the verified title of the linked ISLRTC video?',
        options: [
          'Module 2.2 Introducing oneself (name, work, place, etc.)',
          'Module 1.2 Greeting and salutations in Indian Sign Language',
          'Module 1.3 Some polite useful phrases.',
          'Guideline',
        ],
        correctAnswer: 'Module 2.2 Introducing oneself (name, work, place, etc.)',
        explanation: 'This is the title returned by the checked ISLRTC playlist and video metadata.',
      },
      {
        prompt: 'Which organization is identified as the publisher of the linked resource?',
        options: [
          'Indian Sign Language Research and Training Centre',
          'SignBridge AI',
          'National Association of the Deaf',
          'A university language department',
        ],
        correctAnswer: 'Indian Sign Language Research and Training Centre',
        explanation: 'The video metadata names ISLRTC as the publisher.',
      },
      {
        prompt: 'What can be concluded from the video title alone about the signs for name, work, or place?',
        options: [
          'The exact sign forms have not been independently verified by SignBridge',
          'All three signs are identical across every ISL community',
          'The title provides a complete signed-language grammar',
          'The title certifies a learner’s ability to introduce themselves',
        ],
        correctAnswer: 'The exact sign forms have not been independently verified by SignBridge',
        explanation: 'The title identifies topics, not the detailed sign forms or their linguistic use.',
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
        await Lesson.updateOne(
          { slug: lesson.slug, keyTakeaways: { $exists: false } },
          { $set: { keyTakeaways: lesson.keyTakeaways || [] } }
        );
        await Lesson.updateOne(
          { slug: lesson.slug, completionChecklist: { $exists: false } },
          { $set: { completionChecklist: lesson.completionChecklist || [] } }
        );
        for (const field of ['moduleTitle', 'moduleOrder', 'practiceActivities', 'prerequisites']) {
          await Lesson.updateOne(
            { slug: lesson.slug, [field]: { $exists: false } },
            { $set: { [field]: lesson[field] ?? (field === 'prerequisites' ? [] : '') } }
          );
        }
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

    for (const quiz of starterQuizzes) {
      const lesson = seededLessons.get(quiz.lessonSlug);
      if (!lesson) {
        throw new Error(`Could not find seeded lesson for quiz ${quiz.slug}`);
      }
      const { lessonSlug, ...quizData } = quiz;
      await Quiz.updateOne(
        { slug: quiz.slug },
        { $setOnInsert: { ...quizData, lesson: lesson._id } },
        { upsert: true }
      );
    }

    console.log('ISLRTC lesson metadata and starter resource-check quizzes are seeded; existing publication and review statuses are preserved');
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

module.exports = { seed, lessons, quizzes, starterQuizzes };
