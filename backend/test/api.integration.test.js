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
  sixthQuestion: '64b000000000000000000043',
  secondQuiz: '64b000000000000000000011',
  secondLesson: '64b000000000000000000022',
  questionTypeQuiz: '64b000000000000000000016',
  multipleQuestion: '64b000000000000000000048',
  videoQuestion: '64b000000000000000000049',
};

const secondPublishedLesson = {
  _id: ids.secondLesson,
  slug: 'published-greetings',
  title: 'Published greetings',
  description: 'A second published lesson.',
  level: 'beginner',
  category: 'Communication',
  moduleTitle: 'Module 1: Greetings',
  moduleOrder: 2,
  order: 2,
  published: true,
};

const courseQuiz = {
  _id: ids.secondQuiz,
  title: 'Greetings check',
  lesson: ids.secondLesson,
  published: true,
  assessmentFocus: 'isl-learning',
  contentReviewStatus: 'reviewed',
  passingScore: 70,
  questions: [
    { _id: ids.thirdQuestion, prompt: 'Choose the first option', options: ['Correct', 'Incorrect'], correctAnswer: 'Correct' },
    { _id: ids.fourthQuestion, prompt: 'Question four', options: ['Correct', 'Incorrect'], correctAnswer: 'Correct' },
    { _id: ids.fifthQuestion, prompt: 'Question five', options: ['Correct', 'Incorrect'], correctAnswer: 'Correct' },
    { _id: ids.sixthQuestion, prompt: 'Question six', options: ['Correct', 'Incorrect'], correctAnswer: 'Correct' },
  ],
};

const metadataQuiz = {
  _id: '64b000000000000000000013',
  title: 'Published course source facts',
  lesson: ids.secondLesson,
  published: true,
  assessmentFocus: 'course-metadata',
  contentReviewStatus: 'reviewed',
  passingScore: 70,
  questions: [
    { _id: '64b000000000000000000037', prompt: 'Metadata question one', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
    { _id: '64b000000000000000000038', prompt: 'Metadata question two', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
    { _id: '64b000000000000000000039', prompt: 'Metadata question three', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
    { _id: '64b000000000000000000040', prompt: 'Metadata question four', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
  ],
};

const metadataQuizFirstLesson = {
  _id: '64b000000000000000000015',
  title: 'Published introduction resource check',
  lesson: ids.lesson,
  published: true,
  assessmentFocus: 'course-metadata',
  contentReviewStatus: 'pending',
  passingScore: 70,
  questions: [
    { _id: '64b000000000000000000044', prompt: 'Introduction resource one', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
    { _id: '64b000000000000000000045', prompt: 'Introduction resource two', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
    { _id: '64b000000000000000000046', prompt: 'Introduction resource three', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
    { _id: '64b000000000000000000047', prompt: 'Introduction resource four', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
  ],
};

const pendingLearningQuiz = {
  _id: '64b000000000000000000014',
  title: 'Learning content awaiting review',
  lesson: ids.lesson,
  published: true,
  assessmentFocus: 'isl-learning',
  contentReviewStatus: 'pending',
  passingScore: 70,
  questions: [
    { _id: '64b000000000000000000041', prompt: 'Pending question one', options: ['A', 'B'], correctAnswer: 'A' },
    { _id: '64b000000000000000000042', prompt: 'Pending question two', options: ['A', 'B'], correctAnswer: 'A' },
  ],
};

const questionTypeQuiz = {
  _id: ids.questionTypeQuiz,
  title: 'Question format coverage',
  lesson: ids.lesson,
  published: true,
  assessmentFocus: 'course-metadata',
  contentReviewStatus: 'pending',
  questions: [
    {
      _id: ids.multipleQuestion,
      prompt: 'Select both listed source formats.',
      questionType: 'multiple-choice',
      difficulty: 'beginner',
      topic: 'resource metadata',
      options: ['Video', 'Audio', 'Playlist'],
      correctAnswer: ['Video', 'Playlist'],
      explanation: 'The source records list the video and playlist.',
    },
    {
      _id: ids.videoQuestion,
      prompt: 'Review the linked source clip.',
      questionType: 'video-based',
      mediaType: 'video',
      mediaUrl: 'https://media.example.test/source.mp4',
      difficulty: 'beginner',
      options: ['Reviewed', 'Not reviewed'],
      correctAnswer: 'Reviewed',
      explanation: 'The clip is a source reference.',
    },
  ],
};

const quizOnUnpublishedLesson = {
  _id: '64b000000000000000000012',
  title: 'Quiz attached to unpublished lesson',
  lesson: '64b000000000000000000021',
  published: true,
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
  quizAttemptFind: QuizAttempt.find,
  quizAttemptCreate: QuizAttempt.create,
  lessonFind: Lesson.find,
  lessonFindOne: Lesson.findOne,
  lessonCountDocuments: Lesson.countDocuments,
  lessonCompletionFind: LessonCompletion.find,
  lessonCompletionFindOne: LessonCompletion.findOne,
  lessonCompletionCreate: LessonCompletion.create,
  progressFindOne: Progress.findOne,
  progressFindOneAndUpdate: Progress.findOneAndUpdate,
};

const quiz = {
  _id: ids.quiz,
  title: 'Foundations check',
  lesson: ids.lesson,
  passingScore: 70,
  published: true,
  assessmentFocus: 'isl-learning',
  contentReviewStatus: 'reviewed',
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
  moduleTitle: 'Course orientation',
  moduleOrder: 1,
  order: 1,
  learningObjectives: ['Identify the verified source metadata.'],
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
  let queryValue = value;
  return {
    lean() {
      return this;
    },
    select() {
      return this;
    },
    sort() {
      const sortFields = arguments[0];
      if (Array.isArray(queryValue) && sortFields) {
        const fields = Object.entries(sortFields);
        queryValue = [...queryValue].sort((left, right) => {
          for (const [field, direction] of fields) {
            const leftValue = left[field] == null ? 0 : new Date(left[field]).getTime();
            const rightValue = right[field] == null ? 0 : new Date(right[field]).getTime();
            if (leftValue !== rightValue) return (leftValue - rightValue) * direction;
          }
          return 0;
        });
      }
      return this;
    },
    limit(count) {
      if (Array.isArray(queryValue)) queryValue = queryValue.slice(0, count);
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(queryValue).then(resolve, reject);
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
    passingScore: null,
    total: 2,
    passed: null,
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
  assert.equal(attempt.passed, null);
});

let server;
let apiUrl;
let limitedCoursePool = false;
let metadataOnlyCoursePool = false;
let questionTypeQuizEnabled = false;

before(async () => {
  const completions = new Map();
  const progressByUser = new Map();
  const attempts = [];

  User.findById = async (userId) => ({ _id: String(userId) });
  Quiz.find = (filter) => {
    const allQuizzes = [
      quiz,
      courseQuiz,
      metadataQuiz,
      metadataQuizFirstLesson,
      pendingLearningQuiz,
      quizOnUnpublishedLesson,
      ...(questionTypeQuizEnabled ? [questionTypeQuiz] : []),
    ];
    const publishedQuizzes = metadataOnlyCoursePool
      ? [metadataQuiz, metadataQuizFirstLesson, quizOnUnpublishedLesson]
      : limitedCoursePool
        ? [quiz]
        : allQuizzes.filter(item => item !== quizOnUnpublishedLesson);
    return query((filter.published === true ? publishedQuizzes : allQuizzes)
      .filter(item => filter.lesson?.$in
        ? filter.lesson.$in.map(String).includes(String(item.lesson))
        : true)
      .filter(item => filter._id?.$in
        ? filter._id.$in.map(String).includes(String(item._id))
        : true));
  };
  Quiz.findOne = (filter) => query(
    [quiz, courseQuiz, metadataQuiz, metadataQuizFirstLesson, ...(questionTypeQuizEnabled ? [questionTypeQuiz] : [])]
      .find(item => String(item._id) === String(filter._id)) || null,
  );
  QuizAttempt.create = async (attempt) => {
    const savedAttempt = {
      _id: `64b0000000000000000000${String(attempts.length + 100).slice(-2)}`,
      createdAt: new Date(),
      ...attempt,
    };
    attempts.push(savedAttempt);
    return savedAttempt;
  };
  QuizAttempt.find = ({ user }) => query(
    attempts.filter(attempt => String(attempt.user) === String(user)),
  );
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
  LessonCompletion.findOne = ({ user, lesson }) => query(
    (completions.get(String(user)) || [])
      .find(record => String(record.lesson._id) === String(lesson)) || null,
  );
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
    for (const [field, value] of Object.entries(update.$addToSet || {})) {
      const current = next[field] || [];
      next[field] = current.some(entry => String(entry) === String(value))
        ? current
        : [...current, value];
    }
    for (const [field, value] of Object.entries(update.$pull || {})) {
      next[field] = (next[field] || []).filter(entry => String(entry) !== String(value));
    }
    for (const [field, value] of Object.entries(update.$push || {})) {
      const addition = value.$each || [value];
      next[field] = [...(next[field] || []), ...addition];
      if (value.$sort?.occurredAt) {
        next[field].sort((left, right) => new Date(right.occurredAt) - new Date(left.occurredAt));
      }
      if (Number.isInteger(value.$slice)) next[field] = next[field].slice(0, value.$slice);
    }
    progressByUser.set(userId, next);
    return next;
  };

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  apiUrl = `http://127.0.0.1:${server.address().port}/api`;
  server.testState = { attempts, completions, progressByUser };
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
  QuizAttempt.find = originalMethods.quizAttemptFind;
  QuizAttempt.create = originalMethods.quizAttemptCreate;
  Lesson.find = originalMethods.lessonFind;
  Lesson.findOne = originalMethods.lessonFindOne;
  Lesson.countDocuments = originalMethods.lessonCountDocuments;
  LessonCompletion.find = originalMethods.lessonCompletionFind;
  LessonCompletion.findOne = originalMethods.lessonCompletionFindOne;
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
  assert.equal(catalog.data[0].moduleTitle, 'Course orientation');
  assert.equal(catalog.data[1].moduleOrder, 2);
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
    Authorization: `Bearer ${tokenFor(ids.otherUser)}`,
    'Content-Type': 'application/json',
  };
  const overviewResponse = await fetch(`${apiUrl}/quizzes/full-course`, { headers });
  assert.equal(overviewResponse.status, 200);
  const overview = await overviewResponse.json();
  assert.equal(overview.data.available, true);
  assert.equal(overview.data.questionCount, 5);
  assert.equal(overview.data.lessonCount, 2);
  assert.equal(overview.data.passingScore, 70);
  assert.equal(overview.data.excludedMetadataQuestionCount, 8);
  assert.equal(overview.data.excludedReviewPendingQuestionCount, 2);
  assert.equal('timeLimit' in overview.data, false);
  assert.equal('attemptLimit' in overview.data, false);

  const lessonQuizListResponse = await fetch(
    `${apiUrl}/quizzes?lessonId=${ids.lesson}`,
    { headers },
  );
  assert.equal(lessonQuizListResponse.status, 200);
  const lessonQuizList = await lessonQuizListResponse.json();
  assert.equal(lessonQuizList.data.length, 3);
  assert.equal(lessonQuizList.data[0]._id, ids.quiz);
  assert.equal(
    lessonQuizList.data.some(item => item._id === pendingLearningQuiz._id),
    true,
  );
  assert.equal(
    lessonQuizList.data.some(item => item._id === metadataQuizFirstLesson._id),
    true,
  );
  assert.equal(lessonQuizList.data.some(item => item._id === quizOnUnpublishedLesson._id), false);

  const unpublishedLessonQuizListResponse = await fetch(
    `${apiUrl}/quizzes?lessonId=${draftLesson._id}`,
    { headers },
  );
  assert.equal(unpublishedLessonQuizListResponse.status, 404);
  const draftQuizResponse = await fetch(
    `${apiUrl}/quizzes/${quizOnUnpublishedLesson._id}`,
    { headers },
  );
  assert.equal(draftQuizResponse.status, 404);

  const questionsResponse = await fetch(`${apiUrl}/quizzes/full-course/questions`, { headers });
  assert.equal(questionsResponse.status, 200);
  const test = await questionsResponse.json();
  assert.equal(test.data.questions.length, 5);
  assert.equal(new Set(test.data.questions.map(question => String(question.lessonId))).size, 2);
  assert.equal(new Set(test.data.questions.map(question => question.prompt.trim().toLowerCase())).size, 5);
  assert.equal(test.data.questions.some(question => 'correctAnswer' in question), false);
  assert.equal(test.data.questions.some(question => question.prompt === 'Draft-only question'), false);

  const invalidAttempt = await fetch(`${apiUrl}/quizzes/full-course/attempts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ answers: [] }),
  });
  assert.equal(invalidAttempt.status, 400);
  assert.equal(server.testState.attempts.length, 0);

  const duplicateAnswerAttempt = await fetch(`${apiUrl}/quizzes/full-course/attempts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      answers: test.data.questions.map(question => ({
        questionId: question._id,
        selectedAnswer: 'Correct',
      })).map((answer, index, submitted) => (
        index === submitted.length - 1
          ? { ...answer, questionId: submitted[0].questionId }
          : answer
      )),
    }),
  });
  assert.equal(duplicateAnswerAttempt.status, 400);
  assert.equal(server.testState.attempts.length, 0);

  const invalidOptionAttempt = await fetch(`${apiUrl}/quizzes/full-course/attempts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      answers: test.data.questions.map((question, index) => ({
        questionId: question._id,
        selectedAnswer: index === 0 ? 'not an option' : 'Correct',
      })),
    }),
  });
  assert.equal(invalidOptionAttempt.status, 400);
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
  assert.equal(attemptResult.data.percentage, 100);
  assert.equal(attemptResult.data.total, 5);
  assert.equal(attemptResult.data.passed, true);
  assert.equal(attemptResult.data.passingScore, 70);
  assert.equal(attemptResult.data.lessonBreakdown.length, 2);
  assert.equal(server.testState.attempts[0].mode, 'full-course');
  assert.equal(server.testState.attempts[0].quiz, null);
  assert.equal(server.testState.attempts[0].score, 100);
  assert.equal(server.testState.attempts[0].total, 5);
});

test('full-course attempt omits pass status when eligible quizzes have different thresholds', async () => {
  const originalPassingScore = courseQuiz.passingScore;
  courseQuiz.passingScore = 80;
  try {
    const headers = {
      Authorization: `Bearer ${tokenFor(ids.user)}`,
      'Content-Type': 'application/json',
    };
    const overviewResponse = await fetch(`${apiUrl}/quizzes/full-course`, { headers });
    const overview = await overviewResponse.json();
    assert.equal(overview.data.available, true);
    assert.equal('passingScore' in overview.data, false);

    const questionsResponse = await fetch(`${apiUrl}/quizzes/full-course/questions`, { headers });
    const test = await questionsResponse.json();
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
    assert.equal(attemptResult.data.score, 100);
    assert.equal('passed' in attemptResult.data, false);
    assert.equal('passingScore' in attemptResult.data, false);
    assert.equal(server.testState.attempts.at(-1).passingScore, null);
    assert.equal(server.testState.attempts.at(-1).passed, null);
  } finally {
    courseQuiz.passingScore = originalPassingScore;
  }
});

test('published course-resource quiz loads without answer keys and persists its graded result', async () => {
  const headers = {
    Authorization: `Bearer ${tokenFor(ids.user)}`,
    'Content-Type': 'application/json',
  };
  const listResponse = await fetch(
    `${apiUrl}/quizzes?lessonId=${ids.secondLesson}`,
    { headers },
  );
  assert.equal(listResponse.status, 200);
  const list = await listResponse.json();
  assert.ok(list.data.some(item => item._id === metadataQuiz._id));

  const quizResponse = await fetch(`${apiUrl}/quizzes/${metadataQuiz._id}`, { headers });
  assert.equal(quizResponse.status, 200);
  const loadedQuiz = await quizResponse.json();
  assert.equal(loadedQuiz.data.assessmentFocus, 'course-metadata');
  assert.equal(loadedQuiz.data.questions.length, 4);
  assert.equal(loadedQuiz.data.questions.every(question => question.options.length === 4), true);
  assert.equal(loadedQuiz.data.questions.some(question => 'correctAnswer' in question), false);

  const attemptResponse = await fetch(`${apiUrl}/quizzes/${metadataQuiz._id}/attempts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      answers: metadataQuiz.questions.map(question => ({
        questionId: question._id,
        selectedAnswer: question.correctAnswer,
      })),
    }),
  });
  assert.equal(attemptResponse.status, 201);
  const result = await attemptResponse.json();
  assert.equal(result.data.score, 100);
  assert.equal(result.data.total, 4);
  assert.equal(result.data.answers.length, 4);
  assert.equal(server.testState.attempts.at(-1).quiz, metadataQuiz._id);
  assert.equal(server.testState.attempts.at(-1).user, ids.user);
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
    assert.match(overview.data.reason, /at least 5 qualified-review ISL learning questions/);
    assert.match(overview.data.reason, /at least 2 published lessons/);
  } finally {
    limitedCoursePool = false;
  }
});

test('full-course falls back to a multi-lesson resource check without implying ISL proficiency', async () => {
  metadataOnlyCoursePool = true;
  try {
    const headers = {
      Authorization: `Bearer ${tokenFor(ids.user)}`,
      'Content-Type': 'application/json',
    };
    const overviewResponse = await fetch(`${apiUrl}/quizzes/full-course`, { headers });
    assert.equal(overviewResponse.status, 200);
    const overview = await overviewResponse.json();
    assert.equal(overview.data.available, true);
    assert.equal(overview.data.title, 'Full-course resource check');
    assert.equal(overview.data.assessmentFocus, 'course-metadata');
    assert.equal(overview.data.questionCount, 8);
    assert.equal(overview.data.lessonCount, 2);
    assert.equal(overview.data.learningAssessmentAvailable, false);
    assert.match(overview.data.scope, /not an ISL proficiency assessment/);
    assert.equal('passingScore' in overview.data, false);

    const questionResponse = await fetch(`${apiUrl}/quizzes/full-course/questions`, { headers });
    assert.equal(questionResponse.status, 200);
    const questionData = await questionResponse.json();
    assert.equal(questionData.data.assessmentFocus, 'course-metadata');
    assert.equal(questionData.data.questions.length, 8);
    assert.equal(new Set(questionData.data.questions.map(item => String(item.lessonId))).size, 2);
    assert.equal(questionData.data.questions.some(item => 'correctAnswer' in item), false);
    assert.equal(questionData.data.questions.some(item => item.prompt === 'Draft-only question'), false);

    const attemptResponse = await fetch(`${apiUrl}/quizzes/full-course/attempts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        answers: questionData.data.questions.map(question => ({
          questionId: question._id,
          selectedAnswer: 'A',
        })),
      }),
    });
    assert.equal(attemptResponse.status, 201);
    const attemptResult = await attemptResponse.json();
    assert.equal(attemptResult.data.assessmentFocus, 'course-metadata');
    assert.equal(attemptResult.data.score, 100);
    assert.equal('passed' in attemptResult.data, false);
    assert.equal(server.testState.attempts.at(-1).assessmentFocus, 'course-metadata');
    assert.equal(server.testState.attempts.at(-1).passed, null);
    assert.equal(server.testState.attempts.at(-1).passingScore, null);
  } finally {
    metadataOnlyCoursePool = false;
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
  const unauthenticatedCourseAttempt = await fetch(`${apiUrl}/quizzes/full-course/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [] }),
  });
  assert.equal(unauthenticatedCourseAttempt.status, 401);

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
  assert.equal(loadedQuiz.data.questions[0].questionType, 'single-choice');
  assert.equal(loadedQuiz.data.questions[0].difficulty, 'beginner');
  assert.equal(loadedQuiz.data.questions[0].contentReviewStatus, 'pending');

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
  assert.equal(attempt.data.answers[0].lessonId, ids.lesson);
  const learnerFeedbackResponse = await fetch(`${apiUrl}/progress`, { headers: authHeaders });
  const learnerFeedback = await learnerFeedbackResponse.json();
  assert.equal(learnerFeedback.progress.reviewSuggestions[0].lessonId, ids.lesson);
  assert.equal(learnerFeedback.progress.reviewSuggestions[0].missedQuestions, 1);

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
  assert.equal(firstProgress.progress.percentage, 50);

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
  assert.equal(String(otherUserData.progress.nextLesson._id), ids.lesson);
  assert.equal(String(firstProgress.progress.nextLesson._id), ids.secondLesson);
});

test('lesson access persists per-user progress without conflating quiz attempts and completion', async () => {
  const unauthenticated = await fetch(`${apiUrl}/progress/access-lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId: ids.lesson }),
  });

  assert.equal(unauthenticated.status, 401);

  const headers = {
    Authorization: `Bearer ${tokenFor(ids.otherUser)}`,
    'Content-Type': 'application/json',
  };
  const primaryUserProgressBefore = server.testState.progressByUser.get(ids.user);
  const invalid = await fetch(`${apiUrl}/progress/access-lesson`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ lessonId: 'invalid' }),
  });
  assert.equal(invalid.status, 400);

  const unpublished = await fetch(`${apiUrl}/progress/access-lesson`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ lessonId: draftLesson._id }),
  });
  assert.equal(unpublished.status, 404);

  const access = async (lessonId) => fetch(`${apiUrl}/progress/access-lesson`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ lessonId }),
  });
  const firstAccess = await access(ids.lesson);
  assert.equal(firstAccess.status, 200);
  const firstSnapshot = await firstAccess.json();
  assert.equal(firstSnapshot.progress.inProgressCount, 1);
  assert.equal(firstSnapshot.progress.completedLessons, 0);
  assert.equal(String(firstSnapshot.progress.lastAccessedLesson._id), ids.lesson);
  assert.equal(firstSnapshot.progress.recentActivity[0].activity, 'started');

  const repeatAccess = await access(ids.lesson);
  assert.equal(repeatAccess.status, 200);
  const repeatSnapshot = await repeatAccess.json();
  assert.equal(repeatSnapshot.progress.inProgressCount, 1);
  assert.equal(repeatSnapshot.progress.recentActivity[0].activity, 'resumed');
  assert.equal(server.testState.progressByUser.get(ids.otherUser).inProgressLessons.length, 1);
  assert.equal(server.testState.progressByUser.get(ids.user), primaryUserProgressBefore);

  const quizAttempt = await fetch(`${apiUrl}/quizzes/${ids.quiz}/attempts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      answers: [
        { questionId: ids.firstQuestion, selectedAnswer: 'Correct' },
        { questionId: ids.secondQuestion, selectedAnswer: 'Incorrect' },
      ],
    }),
  });
  assert.equal(quizAttempt.status, 201);
  const savedQuizResult = await quizAttempt.json();
  assert.equal(savedQuizResult.data.score, 50);
  const afterQuiz = await fetch(`${apiUrl}/progress`, { headers });
  const afterQuizData = await afterQuiz.json();
  assert.equal(afterQuizData.progress.completedLessons, 0);
  assert.equal(afterQuizData.progress.inProgressCount, 1);
  assert.equal(afterQuizData.progress.latestQuizResults[0].score, 50);
  assert.equal(afterQuizData.progress.latestQuizResults[0].total, 2);

  const completion = await fetch(`${apiUrl}/progress/complete-lesson`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ lessonId: ids.lesson }),
  });
  assert.equal(completion.status, 201);
  const completedSnapshot = await completion.json();
  assert.equal(completedSnapshot.progress.completedLessons, 1);
  assert.equal(completedSnapshot.progress.inProgressCount, 0);

  const revisitCompleted = await access(ids.lesson);
  assert.equal(revisitCompleted.status, 200);
  const revisitData = await revisitCompleted.json();
  assert.equal(revisitData.progress.completedLessons, 1);
  assert.equal(revisitData.progress.inProgressCount, 0);
});

test('quiz delivery supports multiple-choice and video question metadata without exposing answers', async () => {
  questionTypeQuizEnabled = true;
  const headers = {
    Authorization: `Bearer ${tokenFor(ids.user)}`,
    'Content-Type': 'application/json',
  };
  const beforeAttemptCount = server.testState.attempts.length;
  try {
    const quizResponse = await fetch(`${apiUrl}/quizzes/${ids.questionTypeQuiz}`, { headers });
    assert.equal(quizResponse.status, 200);
    const delivered = await quizResponse.json();
    assert.equal(delivered.data.questions[0].questionType, 'multiple-choice');
    assert.equal(delivered.data.questions[0].difficulty, 'beginner');
    assert.equal(delivered.data.questions[0].topic, 'resource metadata');
    assert.equal(delivered.data.questions[1].questionType, 'video-based');
    assert.equal(delivered.data.questions[1].mediaType, 'video');
    assert.equal(delivered.data.questions.every(question => !('correctAnswer' in question)), true);
    assert.equal(delivered.data.questions.every(question => !('explanation' in question)), true);

    const malformed = await fetch(`${apiUrl}/quizzes/${ids.questionTypeQuiz}/attempts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        answers: [
          { questionId: ids.multipleQuestion, selectedAnswer: ['Video', 'Video'] },
          { questionId: ids.videoQuestion, selectedAnswer: 'Reviewed' },
        ],
      }),
    });
    assert.equal(malformed.status, 400);
    assert.equal(server.testState.attempts.length, beforeAttemptCount);

    const submitted = await fetch(`${apiUrl}/quizzes/${ids.questionTypeQuiz}/attempts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        answers: [
          { questionId: ids.multipleQuestion, selectedAnswer: ['Playlist', 'Video'] },
          { questionId: ids.videoQuestion, selectedAnswer: 'Reviewed' },
        ],
      }),
    });
    assert.equal(submitted.status, 201);
    const result = await submitted.json();
    assert.equal(result.data.score, 100);
    assert.deepEqual(result.data.answers[0].correctAnswer, ['Video', 'Playlist']);
    assert.equal(result.data.answers[0].topic, 'resource metadata');
    assert.equal(result.data.answers[1].questionType, 'video-based');
    assert.equal(server.testState.attempts.at(-1).answers.length, 2);
  } finally {
    questionTypeQuizEnabled = false;
  }
});
