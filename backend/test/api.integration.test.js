const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = randomBytes(32).toString('hex');

const app = require('../src/app');
const User = require('../src/models/User');
const Quiz = require('../src/models/Quiz');
const QuizAttempt = require('../src/models/QuizAttempt');
const Lesson = require('../src/models/Lesson');
const LessonCompletion = require('../src/models/LessonCompletion');
const Progress = require('../src/models/Progress');

const ids = {
  user: '64b000000000000000000001',
  otherUser: '64b000000000000000000002',
  quiz: '64b000000000000000000010',
  lesson: '64b000000000000000000020',
  firstQuestion: '64b000000000000000000031',
  secondQuestion: '64b000000000000000000032',
  thirdQuestion: '64b000000000000000000033',
  fourthQuestion: '64b000000000000000000034',
  fifthQuestion: '64b000000000000000000035',
  secondQuiz: '64b000000000000000000011',
  secondLesson: '64b000000000000000000022',
};

const secondPublishedLesson = {
  _id: ids.secondLesson,
  slug: 'published-greetings',
  title: 'Published greetings',
  description: 'A second published lesson.',
  level: 'beginner',
  category: 'Communication',
  order: 2,
  published: true,
};

const courseQuiz = {
  _id: ids.secondQuiz,
  title: 'Greetings check',
  lesson: ids.secondLesson,
  published: true,
  questions: [
    { _id: ids.thirdQuestion, prompt: 'Question three', options: ['Correct', 'Incorrect'], correctAnswer: 'Correct' },
    { _id: ids.fourthQuestion, prompt: 'Question four', options: ['Correct', 'Incorrect'], correctAnswer: 'Correct' },
    { _id: ids.fifthQuestion, prompt: 'Question five', options: ['Correct', 'Incorrect'], correctAnswer: 'Correct' },
  ],
};

const draftQuiz = {
  _id: '64b000000000000000000012',
  title: 'Unpublished draft quiz',
  lesson: '64b000000000000000000021',
  published: false,
  questions: [{
    _id: '64b000000000000000000036',
    prompt: 'Draft-only question',
    options: ['Correct', 'Incorrect'],
    correctAnswer: 'Correct',
  }],
};

const originalMethods = {
  userFindById: User.findById,
  quizFind: Quiz.find,
  quizFindOne: Quiz.findOne,
  quizAttemptCreate: QuizAttempt.create,
  lessonFind: Lesson.find,
  lessonFindOne: Lesson.findOne,
  lessonCountDocuments: Lesson.countDocuments,
  lessonCompletionFind: LessonCompletion.find,
  lessonCompletionCreate: LessonCompletion.create,
  progressFindOne: Progress.findOne,
  progressFindOneAndUpdate: Progress.findOneAndUpdate,
};

const quiz = {
  _id: ids.quiz,
  title: 'Foundations check',
  lesson: ids.lesson,
  passingScore: 50,
  published: true,
  questions: [
    {
      _id: ids.firstQuestion,
      prompt: 'Choose the first option',
      options: ['Correct', 'Incorrect'],
      correctAnswer: 'Correct',
    },
    {
      _id: ids.secondQuestion,
      prompt: 'Choose the second option',
      options: ['Correct', 'Incorrect'],
      correctAnswer: 'Correct',
    },
  ],
};

const publishedLesson = {
  _id: ids.lesson,
  slug: 'published-foundations',
  title: 'Published foundations',
  description: 'A reviewed lesson.',
  level: 'beginner',
  category: 'Foundations',
  order: 1,
  published: true,
  signs: [],
  resources: [{
    title: 'Official resource',
    videoId: '5PF6JXzYyUI',
    sourceUrl: 'https://www.youtube.com/watch?v=5PF6JXzYyUI',
    playlistUrl: 'https://www.youtube.com/playlist?list=PLFjydPMg4DapfRTBMokl09Ht-fhMOAYf6',
    availabilityStatus: 'available',
    embeddable: true,
  }],
};

const draftLesson = {
  _id: '64b000000000000000000021',
  title: 'Unpublished draft',
  published: false,
};

function query(value) {
  return {
    lean() {
      return this;
    },
    select() {
      return this;
    },
    sort() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

function tokenFor(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET);
}

test('QuizAttempt schema accepts a full-course result without a single quiz reference', async () => {
  const attempt = new QuizAttempt({
    user: ids.user,
    quiz: null,
    mode: 'full-course',
    quizzes: [ids.quiz, ids.secondQuiz],
    lessonBreakdown: [{
      lesson: ids.lesson,
      lessonTitle: 'Published foundations',
      correct: 2,
      total: 2,
      score: 100,
    }],
    score: 100,
    total: 2,
    passed: true,
    answers: [{
      questionId: ids.firstQuestion,
      selectedAnswer: 'Correct',
      isCorrect: true,
      correctAnswer: 'Correct',
      explanation: 'Server-graded result.',
    }],
  });

  await assert.doesNotReject(() => attempt.validate());
  assert.equal(attempt.mode, 'full-course');
});

let server;
let apiUrl;
let limitedCoursePool = false;

before(async () => {
  const completions = new Map();
  const progressByUser = new Map();
  const attempts = [];

  User.findById = async (userId) => ({ _id: String(userId) });
  Quiz.find = (filter) => query(
    filter.published === true
      ? (limitedCoursePool ? [quiz] : [quiz, courseQuiz]).filter(item => filter.lesson?.$in
        ? filter.lesson.$in.map(String).includes(String(item.lesson))
        : true)
      : [quiz, courseQuiz, draftQuiz],
  );
  Quiz.findOne = (filter) => query(String(filter._id) === ids.quiz ? quiz : null);
  QuizAttempt.create = async (attempt) => {
    attempts.push(attempt);
    return { _id: '64b000000000000000000099', ...attempt };
  };
  Lesson.find = ({ published }) => query(
    published === true
      ? [publishedLesson, secondPublishedLesson]
      : [publishedLesson, secondPublishedLesson, draftLesson],
  );
  Lesson.findOne = (filter) => query(
    filter.published === true && String(filter._id) === ids.lesson
      ? publishedLesson
      : filter.published === true && String(filter._id) === ids.secondLesson
        ? secondPublishedLesson
      : null,
  );
  Lesson.countDocuments = async () => 1;
  LessonCompletion.find = ({ user }) => {
    const records = completions.get(String(user)) || [];
    return {
      select() { return this; },
      sort() { return this; },
      populate() { return this; },
      lean() { return Promise.resolve(records); },
    };
  };
  LessonCompletion.create = async ({ user, lesson }) => {
    const userId = String(user);
    const records = completions.get(userId) || [];
    if (records.some((record) => String(record.lesson._id) === String(lesson))) {
      const error = new Error('duplicate completion');
      error.code = 11000;
      throw error;
    }

    const record = { lesson: { _id: lesson }, completedAt: new Date() };
    completions.set(userId, [...records, record]);
    return record;
  };
  Progress.findOne = ({ user }) => query(progressByUser.get(String(user)) || null);
  Progress.findOneAndUpdate = async ({ user }, update) => {
    const userId = String(user);
    const previous = progressByUser.get(userId) || { achievements: [] };
    const next = { ...previous, ...update.$set };
    if (update.$addToSet?.achievements) {
      next.achievements = [...new Set([
        ...previous.achievements,
        update.$addToSet.achievements,
      ])];
    }
    progressByUser.set(userId, next);
    return next;
  };

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  apiUrl = `http://127.0.0.1:${server.address().port}/api`;
  server.testState = { attempts, completions };
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  User.findById = originalMethods.userFindById;
  Quiz.find = originalMethods.quizFind;
  Quiz.findOne = originalMethods.quizFindOne;
  QuizAttempt.create = originalMethods.quizAttemptCreate;
  Lesson.find = originalMethods.lessonFind;
  Lesson.findOne = originalMethods.lessonFindOne;
  Lesson.countDocuments = originalMethods.lessonCountDocuments;
  LessonCompletion.find = originalMethods.lessonCompletionFind;
  LessonCompletion.create = originalMethods.lessonCompletionCreate;
  Progress.findOne = originalMethods.progressFindOne;
  Progress.findOneAndUpdate = originalMethods.progressFindOneAndUpdate;
});

test('lesson catalog returns published records and keeps drafts hidden from learners', async () => {
  const listResponse = await fetch(`${apiUrl}/lessons`);
  assert.equal(listResponse.status, 200);
  const catalog = await listResponse.json();
  assert.equal(catalog.success, true);
  assert.equal(catalog.data.length, 2);
  assert.equal(catalog.data[0].title, publishedLesson.title);
  assert.equal(catalog.data.some((lesson) => lesson._id === draftLesson._id), false);

  const detailResponse = await fetch(`${apiUrl}/lessons/${ids.lesson}`);
  assert.equal(detailResponse.status, 200);
  const detail = await detailResponse.json();
  assert.equal(detail.data.title, publishedLesson.title);
  assert.deepEqual(detail.data.signs, []);
  assert.equal(detail.data.resources[0].videoId, '5PF6JXzYyUI');

  const draftDetailResponse = await fetch(`${apiUrl}/lessons/${draftLesson._id}`);
  assert.equal(draftDetailResponse.status, 404);
});

test('full-course assessment mixes published questions and saves a graded attempt', async () => {
  const headers = {
    Authorization: `Bearer ${tokenFor(ids.user)}`,
    'Content-Type': 'application/json',
  };
  const overviewResponse = await fetch(`${apiUrl}/quizzes/full-course`, { headers });
  assert.equal(overviewResponse.status, 200);
  const overview = await overviewResponse.json();
  assert.equal(overview.data.available, true);
  assert.equal(overview.data.questionCount, 5);
  assert.equal(overview.data.lessonCount, 2);
  assert.equal(overview.data.passingScore, 70);
  assert.equal('timeLimit' in overview.data, false);
  assert.equal('attemptLimit' in overview.data, false);

  const lessonQuizListResponse = await fetch(
    `${apiUrl}/quizzes?lessonId=${ids.lesson}`,
    { headers },
  );
  assert.equal(lessonQuizListResponse.status, 200);
  const lessonQuizList = await lessonQuizListResponse.json();
  assert.equal(lessonQuizList.data.length, 1);
  assert.equal(lessonQuizList.data[0]._id, ids.quiz);

  const unpublishedLessonQuizListResponse = await fetch(
    `${apiUrl}/quizzes?lessonId=${draftLesson._id}`,
    { headers },
  );
  assert.equal(unpublishedLessonQuizListResponse.status, 404);
  const draftQuizResponse = await fetch(
    `${apiUrl}/quizzes/${draftQuiz._id}`,
    { headers },
  );
  assert.equal(draftQuizResponse.status, 404);

  const questionsResponse = await fetch(`${apiUrl}/quizzes/full-course/questions`, { headers });
  assert.equal(questionsResponse.status, 200);
  const test = await questionsResponse.json();
  assert.equal(test.data.questions.length, 5);
  assert.equal(new Set(test.data.questions.map(question => String(question.lessonId))).size, 2);
  assert.equal(test.data.questions.some(question => 'correctAnswer' in question), false);
  assert.equal(test.data.questions.some(question => question.prompt === 'Draft-only question'), false);

  const invalidAttempt = await fetch(`${apiUrl}/quizzes/full-course/attempts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ answers: [] }),
  });
  assert.equal(invalidAttempt.status, 400);
  assert.equal(server.testState.attempts.length, 0);

  const attemptResponse = await fetch(`${apiUrl}/quizzes/full-course/attempts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      answers: test.data.questions.map(question => ({
        questionId: question._id,
        selectedAnswer: 'Correct',
      })),
    }),
  });
  assert.equal(attemptResponse.status, 201);
  const attemptResult = await attemptResponse.json();
  assert.equal(attemptResult.data.mode, 'full-course');
  assert.equal(attemptResult.data.score, 100);
  assert.equal(attemptResult.data.passed, true);
  assert.equal(attemptResult.data.lessonBreakdown.length, 2);
  assert.equal(server.testState.attempts[0].mode, 'full-course');
  assert.equal(server.testState.attempts[0].quiz, null);
});

test('full-course overview explains when its published question pool is too small', async () => {
  limitedCoursePool = true;
  try {
    const response = await fetch(`${apiUrl}/quizzes/full-course`, {
      headers: { Authorization: `Bearer ${tokenFor(ids.user)}` },
    });
    assert.equal(response.status, 200);
    const overview = await response.json();
    assert.equal(overview.data.available, false);
    assert.equal(overview.data.questionCount, 2);
    assert.equal(overview.data.lessonCount, 1);
    assert.match(overview.data.reason, /at least 5 published questions/);
    assert.match(overview.data.reason, /at least 2 lessons/);
  } finally {
    limitedCoursePool = false;
  }
});

test('auth protects quiz submission, withholds answers, and tracks unique user completions', async () => {
  const initialAttemptCount = server.testState.attempts.length;
  const unauthenticated = await fetch(`${apiUrl}/quizzes/${ids.quiz}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [] }),
  });
  assert.equal(unauthenticated.status, 401);
  const unauthenticatedCourseOverview = await fetch(`${apiUrl}/quizzes/full-course`);
  assert.equal(unauthenticatedCourseOverview.status, 401);

  const authHeaders = {
    Authorization: `Bearer ${tokenFor(ids.user)}`,
    'Content-Type': 'application/json',
  };
  const quizResponse = await fetch(`${apiUrl}/quizzes/${ids.quiz}`, {
    headers: authHeaders,
  });
  assert.equal(quizResponse.status, 200);
  const loadedQuiz = await quizResponse.json();
  assert.equal(loadedQuiz.data.questions.length, 2);
  assert.equal('correctAnswer' in loadedQuiz.data.questions[0], false);

  const invalidAttempt = await fetch(`${apiUrl}/quizzes/${ids.quiz}/attempts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      answers: [
        { questionId: ids.firstQuestion, selectedAnswer: 'not an option' },
        { questionId: ids.secondQuestion, selectedAnswer: 'Incorrect' },
      ],
    }),
  });
  assert.equal(invalidAttempt.status, 400);
  assert.equal(server.testState.attempts.length, initialAttemptCount);

  const attemptResponse = await fetch(`${apiUrl}/quizzes/${ids.quiz}/attempts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      answers: [
        { questionId: ids.firstQuestion, selectedAnswer: 'Correct' },
        { questionId: ids.secondQuestion, selectedAnswer: 'Incorrect' },
      ],
    }),
  });
  assert.equal(attemptResponse.status, 201);
  const attempt = await attemptResponse.json();
  assert.equal(attempt.data.score, 50);
  assert.equal(attempt.data.total, 2);
  assert.equal(attempt.data.answers[0].correctAnswer, 'Correct');
  assert.equal(server.testState.attempts.at(-1).user, ids.user);

  const invalidCompletion = await fetch(`${apiUrl}/progress/complete-lesson`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ lessonId: 'not-an-object-id' }),
  });
  assert.equal(invalidCompletion.status, 400);

  const completionRequest = () => fetch(`${apiUrl}/progress/complete-lesson`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ lessonId: ids.lesson, userId: ids.otherUser }),
  });
  const firstCompletion = await completionRequest();
  assert.equal(firstCompletion.status, 201);
  const firstProgress = await firstCompletion.json();
  assert.equal(firstProgress.progress.completedLessons, 1);
  assert.equal(firstProgress.progress.percentage, 100);

  const duplicateCompletion = await completionRequest();
  assert.equal(duplicateCompletion.status, 200);
  const duplicateProgress = await duplicateCompletion.json();
  assert.equal(duplicateProgress.progress.completedLessons, 1);
  assert.equal(server.testState.completions.get(ids.user).length, 1);
  assert.equal(server.testState.completions.has(ids.otherUser), false);

  const otherUserProgress = await fetch(`${apiUrl}/progress`, {
    headers: { Authorization: `Bearer ${tokenFor(ids.otherUser)}` },
  });
  const otherUserData = await otherUserProgress.json();
  assert.equal(otherUserData.progress.completedLessons, 0);
});
