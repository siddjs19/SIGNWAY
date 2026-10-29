const express = require('express');
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Lesson = require('../models/Lesson');
const auth = require('../middleware/auth');

const router = express.Router();
const MINIMUM_COURSE_QUESTIONS = 5;
const MINIMUM_COURSE_LESSONS = 2;

router.use(auth);

async function getCourseAssessment(assessmentFocus = 'isl-learning') {
  const lessons = await Lesson.find({ published: true })
    .select('_id title order')
    .sort({ order: 1 })
    .lean();
  const lessonById = new Map(lessons.map(lesson => [String(lesson._id), lesson]));

  if (lessons.length === 0) {
    return {
      questions: [],
      lessons: [],
      quizzes: [],
      excludedMetadataQuestions: 0,
      excludedReviewPendingQuestions: 0,
      passingScore: null,
      assessmentFocus,
    };
  }

  const publishedQuizzes = await Quiz.find({
    published: true,
    lesson: { $in: lessons.map(lesson => lesson._id) },
  })
    .select('_id lesson title questions assessmentFocus contentReviewStatus passingScore')
    .sort({ createdAt: 1 })
    .lean();
  const excludedMetadataQuestions = publishedQuizzes
    .filter(quiz => quiz.assessmentFocus !== 'isl-learning')
    .reduce((total, quiz) => total + (quiz.questions || []).length, 0);
  const excludedReviewPendingQuestions = publishedQuizzes
    .filter(quiz => quiz.assessmentFocus === 'isl-learning' && quiz.contentReviewStatus !== 'reviewed')
    .reduce((total, quiz) => total + (quiz.questions || []).length, 0);
  const quizzes = publishedQuizzes.filter(quiz => (
    assessmentFocus === 'isl-learning'
      ? quiz.assessmentFocus === 'isl-learning' && quiz.contentReviewStatus === 'reviewed'
      : quiz.assessmentFocus !== 'isl-learning'
  ));
  const questionsByLesson = new Map();
  const seenPrompts = new Set();

  for (const quiz of quizzes) {
    const lesson = lessonById.get(String(quiz.lesson));
    if (!lesson) continue;

    const lessonQuestions = questionsByLesson.get(String(lesson._id)) || [];
    for (const question of quiz.questions || []) {
      const normalizedPrompt = question.prompt.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
      if (!normalizedPrompt || seenPrompts.has(normalizedPrompt)) continue;
      seenPrompts.add(normalizedPrompt);
      lessonQuestions.push({
        _id: question._id,
        quizId: quiz._id,
        lessonId: lesson._id,
        lessonTitle: lesson.title,
        prompt: question.prompt,
        mediaUrl: question.mediaUrl || '',
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || '',
      });
    }
    questionsByLesson.set(String(lesson._id), lessonQuestions);
  }

  const questions = [];
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const lesson of lessons) {
      const lessonQuestions = questionsByLesson.get(String(lesson._id)) || [];
      if (lessonQuestions.length > 0) {
        questions.push(lessonQuestions.shift());
        hasMore = true;
      }
    }
  }

  const coveredLessons = [...new Set(questions.map(question => String(question.lessonId)))];
  const selectedQuizIds = new Set(questions.map(question => String(question.quizId)));
  const selectedQuizzes = quizzes.filter(quiz => selectedQuizIds.has(String(quiz._id)));
  const passingScores = assessmentFocus === 'isl-learning'
    ? [...new Set(
      selectedQuizzes
        .map(quiz => quiz.passingScore)
        .filter(score => Number.isFinite(score) && score >= 0 && score <= 100),
    )]
    : [];
  return {
    questions,
    lessons: lessons.filter(lesson => coveredLessons.includes(String(lesson._id))),
    quizzes: selectedQuizzes,
    excludedMetadataQuestions: assessmentFocus === 'isl-learning' ? excludedMetadataQuestions : 0,
    excludedReviewPendingQuestions: assessmentFocus === 'isl-learning'
      ? excludedReviewPendingQuestions
      : 0,
    passingScore: passingScores.length === 1 ? passingScores[0] : null,
    assessmentFocus,
  };
}

function isCourseAvailable(assessment) {
  return assessment.questions.length >= MINIMUM_COURSE_QUESTIONS
    && assessment.lessons.length >= MINIMUM_COURSE_LESSONS;
}

function courseUnavailableReason(assessment) {
  const needed = [];
  if (assessment.questions.length < MINIMUM_COURSE_QUESTIONS) {
    needed.push(`at least ${MINIMUM_COURSE_QUESTIONS} qualified-review ISL learning questions`);
  }
  if (assessment.lessons.length < MINIMUM_COURSE_LESSONS) {
    needed.push(`qualified-review ISL learning questions from at least ${MINIMUM_COURSE_LESSONS} published lessons`);
  }
  const excluded = [];
  if (assessment.excludedMetadataQuestions > 0) {
    excluded.push(`${assessment.excludedMetadataQuestions} course-metadata question(s) excluded`);
  }
  if (assessment.excludedReviewPendingQuestions > 0) {
    excluded.push(`${assessment.excludedReviewPendingQuestions} learning question(s) awaiting qualified review excluded`);
  }
  return `The full-course test needs ${needed.join(' and ')}. The eligible pool has ${assessment.questions.length} qualified-review learning questions across ${assessment.lessons.length} lessons.${excluded.length ? ` ${excluded.join('; ')}.` : ''}`;
}

async function getAvailableCourseAssessment() {
  const learningAssessment = await getCourseAssessment('isl-learning');
  if (isCourseAvailable(learningAssessment)) {
    return learningAssessment;
  }

  const resourceAssessment = await getCourseAssessment('course-metadata');
  return isCourseAvailable(resourceAssessment) ? resourceAssessment : learningAssessment;
}

function courseAssessmentTitle(assessment) {
  return assessment.assessmentFocus === 'course-metadata'
    ? 'Full-course resource check'
    : 'Full-course test';
}

function questionForLearner(question) {
  return {
    _id: question._id,
    quizId: question.quizId,
    lessonId: question.lessonId,
    lessonTitle: question.lessonTitle,
    prompt: question.prompt,
    mediaUrl: question.mediaUrl,
    options: question.options,
  };
}

function validateSubmittedAnswers(questions, submitted) {
  if (!Array.isArray(submitted)) {
    return 'Answers must be an array';
  }

  const questionIds = questions.map(question => String(question._id));
  if (
    submitted.length !== questionIds.length
    || submitted.some(answer => !answer || !questionIds.includes(String(answer.questionId)))
    || new Set(submitted.map(answer => String(answer.questionId))).size !== questionIds.length
  ) {
    return 'Submit exactly one answer for every question';
  }

  if (submitted.some(answer => {
    const question = questions.find(item => String(item._id) === String(answer.questionId));
    return typeof answer.selectedAnswer !== 'string'
      || !question.options.includes(answer.selectedAnswer);
  })) {
    return 'Each answer must select one of the question options';
  }

  return null;
}

function gradeAnswers(questions, submitted) {
  return questions.map(question => {
    const response = submitted.find(
      answer => String(answer.questionId) === String(question._id),
    );
    return {
      questionId: question._id,
      selectedAnswer: response.selectedAnswer,
      isCorrect: response.selectedAnswer === question.correctAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
    };
  });
}

// List published quizzes linked only to published lessons.
router.get('/', async (req, res) => {
  try {
    let lessons;
    if (req.query.lessonId !== undefined) {
      if (!mongoose.isValidObjectId(req.query.lessonId)) {
        return res.status(400).json({ message: 'Invalid lesson ID' });
      }
      const lesson = await Lesson.findOne({
        _id: req.query.lessonId,
        published: true,
      }).select('_id title');
      if (!lesson) {
        return res.status(404).json({ message: 'Published lesson not found' });
      }
      lessons = [lesson];
    } else {
      lessons = await Lesson.find({ published: true })
        .select('_id title order')
        .sort({ order: 1 })
        .lean();
    }

    const lessonById = new Map(lessons.map(lesson => [String(lesson._id), lesson]));
    const quizzes = await Quiz.find({
      published: true,
      lesson: { $in: lessons.map(lesson => lesson._id) },
    })
      .select('title lesson questions contentReviewStatus assessmentFocus')
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      data: quizzes
        .filter(quiz => lessonById.has(String(quiz.lesson)))
        .map(quiz => ({
          _id: quiz._id,
          title: quiz.title,
          lesson: quiz.lesson,
          lessonTitle: lessonById.get(String(quiz.lesson)).title,
          questionCount: quiz.questions.length,
          contentReviewStatus: quiz.contentReviewStatus,
          assessmentFocus: quiz.assessmentFocus || 'course-metadata',
        })),
    });
  } catch (error) {
    console.error('List quizzes error:', error.message);
    return res.status(500).json({ message: 'Could not load quizzes' });
  }
});

router.get('/full-course', async (req, res) => {
  try {
    const assessment = await getAvailableCourseAssessment();
    const learningAssessment = assessment.assessmentFocus === 'isl-learning'
      ? assessment
      : await getCourseAssessment('isl-learning');
    const available = isCourseAvailable(assessment);

    return res.json({
      success: true,
      data: {
        available,
        title: courseAssessmentTitle(assessment),
        assessmentFocus: assessment.assessmentFocus,
        scope: assessment.assessmentFocus === 'course-metadata'
          ? 'Verified course and resource metadata from published lessons; this is not an ISL proficiency assessment'
          : 'Reviewed ISL-learning questions from published lessons',
        questionCount: assessment.questions.length,
        lessonCount: assessment.lessons.length,
        lessons: assessment.lessons.map(({ _id, title }) => ({ _id, title })),
        learningAssessmentAvailable: isCourseAvailable(learningAssessment),
        learningQuestionCount: learningAssessment.questions.length,
        excludedMetadataQuestionCount: assessment.excludedMetadataQuestions,
        excludedReviewPendingQuestionCount: assessment.excludedReviewPendingQuestions,
        ...(assessment.passingScore === null ? {} : { passingScore: assessment.passingScore }),
        ...(available ? {} : { reason: courseUnavailableReason(assessment) }),
      },
    });
  } catch (error) {
    console.error('Load full-course test error:', error.message);
    return res.status(500).json({ message: 'Could not load the full-course test' });
  }
});

router.get('/full-course/questions', async (req, res) => {
  try {
    const assessment = await getAvailableCourseAssessment();
    if (!isCourseAvailable(assessment)) {
      return res.status(409).json({
        success: false,
        message: courseUnavailableReason(assessment),
      });
    }

    return res.json({
      success: true,
      data: {
        title: courseAssessmentTitle(assessment),
        assessmentFocus: assessment.assessmentFocus,
        scope: assessment.assessmentFocus === 'course-metadata'
          ? 'Verified course and resource metadata from published lessons; this is not an ISL proficiency assessment'
          : 'Reviewed ISL-learning questions from published lessons',
        ...(assessment.passingScore === null ? {} : { passingScore: assessment.passingScore }),
        questions: assessment.questions.map(questionForLearner),
      },
    });
  } catch (error) {
    console.error('Load full-course questions error:', error.message);
    return res.status(500).json({ message: 'Could not load full-course questions' });
  }
});

router.post('/full-course/attempts', async (req, res) => {
  try {
    const assessment = await getAvailableCourseAssessment();
    if (!isCourseAvailable(assessment)) {
      return res.status(409).json({
        success: false,
        message: courseUnavailableReason(assessment),
      });
    }

    const validationError = validateSubmittedAnswers(assessment.questions, req.body.answers);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const answers = gradeAnswers(assessment.questions, req.body.answers);
    const total = answers.length;
    const correct = answers.filter(answer => answer.isCorrect).length;
    const score = Math.round((correct / total) * 100);
    const lessonBreakdown = assessment.lessons.map(lesson => {
      const lessonAnswers = answers.filter(answer => {
        const question = assessment.questions.find(
          item => String(item._id) === String(answer.questionId),
        );
        return String(question.lessonId) === String(lesson._id);
      });
      const lessonCorrect = lessonAnswers.filter(answer => answer.isCorrect).length;
      return {
        lesson: lesson._id,
        lessonTitle: lesson.title,
        correct: lessonCorrect,
        total: lessonAnswers.length,
        score: Math.round((lessonCorrect / lessonAnswers.length) * 100),
      };
    });
    const passed = assessment.passingScore === null
      ? null
      : score >= assessment.passingScore;
    const attempt = await QuizAttempt.create({
      user: req.user._id,
      quiz: null,
      mode: 'full-course',
      assessmentFocus: assessment.assessmentFocus,
      quizzes: [...new Set(assessment.questions.map(question => String(question.quizId)))],
      lessonBreakdown,
      score,
      passingScore: assessment.passingScore,
      total,
      answers,
      passed,
    });

    return res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        mode: 'full-course',
        assessmentFocus: assessment.assessmentFocus,
        score,
        percentage: score,
        total,
        ...(assessment.passingScore === null
          ? {}
          : { passed, passingScore: assessment.passingScore }),
        lessonBreakdown,
        answers,
      },
    });
  } catch (error) {
    console.error('Submit full-course test error:', error.message);
    return res.status(500).json({ message: 'Could not submit the full-course test' });
  }
});

// Fetch one published quiz without exposing answer keys.
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid quiz ID' });
  }

  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      published: true,
    }).lean();

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const lesson = await Lesson.findOne({
      _id: quiz.lesson,
      published: true,
    }).select('_id title');
    if (!lesson) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    return res.json({
      success: true,
      data: {
        _id: quiz._id,
        title: quiz.title,
        lesson: quiz.lesson,
        lessonTitle: lesson.title,
        passingScore: quiz.passingScore,
        contentReviewStatus: quiz.contentReviewStatus,
        assessmentFocus: quiz.assessmentFocus || 'course-metadata',
        questions: quiz.questions.map(question => ({
          _id: question._id,
          prompt: question.prompt,
          mediaUrl: question.mediaUrl,
          options: question.options,
        })),
      },
    });
  } catch (error) {
    console.error('Load quiz error:', error.message);
    return res.status(500).json({ message: 'Could not load quiz' });
  }
});

router.post('/:id/attempts', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid quiz ID' });
    }

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      published: true,
    });

    if (!quiz || quiz.questions.length === 0) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    const lesson = await Lesson.findOne({
      _id: quiz.lesson,
      published: true,
    }).select('_id');
    if (!lesson) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const validationError = validateSubmittedAnswers(quiz.questions, req.body.answers);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const answers = gradeAnswers(quiz.questions, req.body.answers);
    const total = quiz.questions.length;
    const correct = answers.filter(answer => answer.isCorrect).length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= quiz.passingScore;

    const attempt = await QuizAttempt.create({
      user: req.user._id,
      quiz: quiz._id,
      mode: 'lesson',
      assessmentFocus: quiz.assessmentFocus || 'course-metadata',
      score,
      total,
      answers,
      passed,
    });

    return res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        assessmentFocus: quiz.assessmentFocus || 'course-metadata',
        score,
        total,
        passed,
        passingScore: quiz.passingScore,
        answers,
      },
    });
  } catch (error) {
    console.error('Submit quiz error:', error.message);
    return res.status(500).json({ message: 'Could not submit quiz' });
  }
});

module.exports = router;
