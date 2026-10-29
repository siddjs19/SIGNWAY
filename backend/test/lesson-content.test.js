const { test } = require('node:test');
const assert = require('node:assert/strict');

const Lesson = require('../src/models/Lesson');
const Quiz = require('../src/models/Quiz');
const { lessons, quizzes, starterQuizzes } = require('../src/seed');

const playlistUrl = 'https://www.youtube.com/playlist?list=PLFjydPMg4DapfRTBMokl09Ht-fhMOAYf6';
const expectedVideos = {
  'isl-introduction': ['5PF6JXzYyUI'],
  'isl-greetings-polite-expressions': ['5vHmvYA8Z6Q', 'neE5Fg4FVtA'],
  'introducing-yourself-in-isl': ['mc_NxVJlhi8'],
};

test('ISLRTC lesson drafts store verified video metadata and remain unpublished', async () => {
  assert.equal(lessons.filter(lesson => lesson.slug).length, 3);

  for (const [slug, videoIds] of Object.entries(expectedVideos)) {
    const lesson = lessons.find(item => item.slug === slug);
    assert.ok(lesson, `missing lesson ${slug}`);
    assert.equal(lesson.published, false);
    assert.equal(lesson.contentReviewStatus, 'pending');
    assert.ok(lesson.moduleTitle);
    assert.ok(lesson.moduleOrder > 0);
    assert.ok(Array.isArray(lesson.prerequisites));
    assert.ok(lesson.practiceActivities.length > 0);
    assert.equal(lesson.resources.length, videoIds.length);
    assert.deepEqual(lesson.resources.map(resource => resource.videoId), videoIds);
    await assert.doesNotReject(() => new Lesson(lesson).validate());

    for (const resource of lesson.resources) {
      assert.equal(resource.author, 'Indian Sign Language Research and Training Centre');
      assert.equal(resource.playlistUrl, playlistUrl);
      assert.equal(resource.sourceUrl, `https://www.youtube.com/watch?v=${resource.videoId}`);
      assert.equal(
        resource.embedUrl,
        `https://www.youtube.com/embed/${resource.videoId}?feature=oembed`,
      );
      assert.equal(resource.availabilityStatus, 'available');
      assert.equal(resource.embeddable, true);
      assert.equal(resource.metadataStatus, 'verified');
      assert.ok(resource.publishedAt instanceof Date);
      assert.ok(resource.metadataVerifiedAt instanceof Date);
    }
  }
});

test('quiz schema validates multiple-choice and video-based question formats', async () => {
  const lessonId = '64b000000000000000000020';
  const validQuiz = new Quiz({
    lesson: lessonId,
    title: 'Question format schema test',
    questions: [
      {
        prompt: 'Select all correct options',
        questionType: 'multiple-choice',
        difficulty: 'intermediate',
        topic: 'sample topic',
        contentReviewStatus: 'pending',
        options: ['A', 'B', 'C'],
        correctAnswer: ['A', 'C'],
      },
      {
        prompt: 'Watch the clip',
        questionType: 'video-based',
        mediaType: 'video',
        mediaUrl: 'https://media.example.test/clip.mp4',
        options: ['A', 'B'],
        correctAnswer: 'A',
      },
    ],
  });
  await assert.doesNotReject(() => validQuiz.validate());

  const invalidMultiAnswer = new Quiz({
    lesson: lessonId,
    title: 'Invalid multiple-choice answer shape',
    questions: [{
      prompt: 'Select all correct options',
      questionType: 'multiple-choice',
      options: ['A', 'B'],
      correctAnswer: 'A',
    }],
  });
  await assert.rejects(() => invalidMultiAnswer.validate());
});

test('draft lesson quizzes only grade options and remain unpublished pending review', async () => {
  assert.equal(quizzes.length, 3);
  for (const quiz of quizzes) {
    assert.equal(quiz.published, false);
    assert.equal(quiz.contentReviewStatus, 'pending');
    assert.equal(quiz.assessmentFocus, 'course-metadata');
    const lessonSlug = quiz.slug.replace(/-source-check$/, '');
    assert.ok(lessons.some(lesson => lesson.slug === lessonSlug), `missing lesson for ${quiz.slug}`);
    assert.ok(quiz.questions.length >= 2);
    for (const question of quiz.questions) {
      assert.ok(question.options.includes(question.correctAnswer));
    }
    await assert.doesNotReject(
      () => new Quiz({ ...quiz, lesson: '64b000000000000000000020' }).validate(),
    );
  }
});

test('starter quiz bank uses four-option verified course-resource facts without claiming ISL proficiency', async () => {
  assert.equal(starterQuizzes.length, 3);
  assert.equal(
    starterQuizzes.reduce((count, quiz) => count + quiz.questions.length, 0),
    12,
  );

  for (const quiz of starterQuizzes) {
    assert.ok(quiz.slug.endsWith('-starter-check'));
    assert.ok(lessons.some(lesson => lesson.slug === quiz.lessonSlug));
    assert.equal(quiz.assessmentFocus, 'course-metadata');
    assert.equal(quiz.contentReviewStatus, 'pending');
    assert.equal(quiz.published, true);
    assert.match(quiz.title, /resource check|course-resource check/i);
    assert.ok(quiz.questions.length >= 4);

    for (const question of quiz.questions) {
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      assert.ok(question.options.includes(question.correctAnswer));
      assert.ok(question.explanation.length > 0);
    }

    await assert.doesNotReject(
      () => new Quiz({ ...quiz, lesson: '64b000000000000000000020' }).validate(),
    );
  }
});
