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
};

const originalMethods = {
  userFindById: User.findById,
  quizFindOne: Quiz.findOne,
  quizAttemptCreate: QuizAttempt.create,
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

function query(value) {
  return {
    lean() {
      return this;
    },
    select() {
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

let server;
let apiUrl;

before(async () => {
  const completions = new Map();
  const progressByUser = new Map();
  const attempts = [];

  User.findById = async (userId) => ({ _id: String(userId) });
  Quiz.findOne = () => query(quiz);
  QuizAttempt.create = async (attempt) => {
    attempts.push(attempt);
    return { _id: '64b000000000000000000099', ...attempt };
  };
  Lesson.findOne = () => query({ _id: ids.lesson });
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
  Quiz.findOne = originalMethods.quizFindOne;
  QuizAttempt.create = originalMethods.quizAttemptCreate;
  Lesson.findOne = originalMethods.lessonFindOne;
  Lesson.countDocuments = originalMethods.lessonCountDocuments;
  LessonCompletion.find = originalMethods.lessonCompletionFind;
  LessonCompletion.create = originalMethods.lessonCompletionCreate;
  Progress.findOne = originalMethods.progressFindOne;
  Progress.findOneAndUpdate = originalMethods.progressFindOneAndUpdate;
});

test('auth protects quiz submission, withholds answers, and tracks unique user completions', async () => {
  const unauthenticated = await fetch(`${apiUrl}/quizzes/${ids.quiz}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: [] }),
  });
  assert.equal(unauthenticated.status, 401);

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
  assert.equal(server.testState.attempts.length, 0);

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
  assert.equal(server.testState.attempts[0].user, ids.user);

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
