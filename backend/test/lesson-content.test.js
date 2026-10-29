const { test } = require('node:test');
const assert = require('node:assert/strict');

const Lesson = require('../src/models/Lesson');
const Quiz = require('../src/models/Quiz');
const { lessons, quizzes } = require('../src/seed');

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

test('draft lesson quizzes only grade options and remain unpublished pending review', async () => {
  assert.equal(quizzes.length, 3);
  for (const quiz of quizzes) {
    assert.equal(quiz.published, false);
    assert.equal(quiz.contentReviewStatus, 'pending');
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
