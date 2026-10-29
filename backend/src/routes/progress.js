const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const auth = require('../middleware/auth');
const Lesson = require('../models/Lesson');
const LessonCompletion = require('../models/LessonCompletion');
const Progress = require('../models/Progress');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

async function getProgress(userId) {
  const [completions, lessons, progress, attempts] = await Promise.all([
    LessonCompletion.find({ user: userId })
      .select('lesson completedAt bestScore')
      .sort({ completedAt: -1 })
      .lean(),
    Lesson.find({ published: true })
      .select('_id slug title category level moduleTitle moduleOrder order prerequisites')
      .sort({ moduleOrder: 1, order: 1 })
      .lean(),
    Progress.findOne({ user: userId }).lean(),
    QuizAttempt.find({ user: userId })
      .select('quiz mode assessmentFocus score total passed createdAt answers')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);
  const lessonsById = new Map(lessons.map(lesson => [String(lesson._id), lesson]));
  const completionByLesson = new Map(
    completions
      .filter(completion => lessonsById.has(String(completion.lesson?._id || completion.lesson)))
      .map(completion => [String(completion.lesson?._id || completion.lesson), completion]),
  );
  const inProgressIds = new Set(
    (progress?.inProgressLessons || [])
      .map(String)
      .filter(id => lessonsById.has(id) && !completionByLesson.has(id)),
  );
  const completedLessons = completionByLesson.size;
  const quizIds = [...new Set(attempts.map(attempt => attempt.quiz).filter(Boolean).map(String))];
  const quizzes = quizIds.length
    ? await Quiz.find({
      _id: { $in: quizIds },
      published: true,
      lesson: { $in: lessons.map(lesson => lesson._id) },
    }).select('_id title lesson contentReviewStatus assessmentFocus questions').lean()
    : [];
  const quizById = new Map(quizzes.map(quiz => [String(quiz._id), quiz]));
  const recentActivity = [];
  for (const activity of progress?.recentLessonActivity || []) {
    if (activity.activity === 'completed') continue;
    const lesson = lessonsById.get(String(activity.lesson));
    if (lesson) {
      recentActivity.push({
        lessonId: lesson._id,
        lessonTitle: lesson.title,
        activity: activity.activity,
        occurredAt: activity.occurredAt,
      });
    }
  }
  for (const completion of completionByLesson.values()) {
    const lesson = lessonsById.get(String(completion.lesson?._id || completion.lesson));
    if (lesson) {
      recentActivity.push({
        lessonId: lesson._id,
        lessonTitle: lesson.title,
        activity: 'completed',
        occurredAt: completion.completedAt,
      });
    }
  }
  const activityPriority = { started: 0, resumed: 1, completed: 2 };
  recentActivity.sort((left, right) => (
    new Date(right.occurredAt) - new Date(left.occurredAt)
    || activityPriority[right.activity] - activityPriority[left.activity]
  ));
  const latestQuizResults = attempts
    .filter(attempt => !attempt.quiz || quizById.has(String(attempt.quiz)))
    .map(attempt => {
    const quiz = attempt.quiz ? quizById.get(String(attempt.quiz)) : null;
    const lesson = quiz ? lessonsById.get(String(quiz.lesson)) : null;
    return {
      attemptId: attempt._id,
      quizTitle: quiz?.title || (attempt.mode === 'full-course'
        ? attempt.assessmentFocus === 'course-metadata'
          ? 'Full-course resource check'
          : 'Full-course test'
        : 'Quiz'),
      lessonId: lesson?._id || null,
      lessonTitle: lesson?.title || null,
      assessmentFocus: attempt.assessmentFocus,
      mode: attempt.mode,
      score: attempt.score,
      total: attempt.total,
      passed: typeof attempt.passed === 'boolean' ? attempt.passed : null,
      createdAt: attempt.createdAt,
    };
    });

  const completedIds = new Set(completionByLesson.keys());
  const nextLesson = lessons.find(lesson => (
    !completedIds.has(String(lesson._id))
    && (lesson.prerequisites || []).every(prerequisite => (
      completedIds.has(String(prerequisite?._id || prerequisite))
    ))
  )) || null;
  const reviewSuggestionMap = new Map();
  const reviewedAssessmentKeys = new Set();
  for (const attempt of attempts) {
    if (attempt.assessmentFocus !== 'isl-learning') continue;
    const quiz = attempt.quiz ? quizById.get(String(attempt.quiz)) : null;
    const assessmentKey = quiz
      ? `quiz:${String(quiz._id)}`
      : `full-course:${attempt.mode}`;
    if (reviewedAssessmentKeys.has(assessmentKey)) continue;
    reviewedAssessmentKeys.add(assessmentKey);
    for (const answer of attempt.answers || []) {
      if (answer.isCorrect) continue;
      let lessonId = answer.lessonId;
      let lessonTitle = answer.lessonTitle;
      let topic = answer.topic || '';
      let reviewed = answer.contentReviewStatus === 'reviewed';
      if (quiz) {
        if (quiz.contentReviewStatus !== 'reviewed') continue;
        const question = quiz.questions.find(item => String(item._id) === String(answer.questionId));
        if (!question || (question.contentReviewStatus || quiz.contentReviewStatus) !== 'reviewed') continue;
        lessonId = quiz.lesson;
        lessonTitle = lessonsById.get(String(quiz.lesson))?.title;
        topic = question.topic || topic;
        reviewed = true;
      }
      if (!reviewed || !lessonId || !lessonsById.has(String(lessonId))) continue;
      const key = `${String(lessonId)}:${topic || 'lesson'}`;
      const current = reviewSuggestionMap.get(key) || {
        lessonId,
        lessonTitle: lessonTitle || lessonsById.get(String(lessonId)).title,
        topic: topic || null,
        missedQuestions: 0,
        attemptId: attempt._id,
      };
      current.missedQuestions += 1;
      reviewSuggestionMap.set(key, current);
    }
  }
  const reviewSuggestions = [...reviewSuggestionMap.values()].slice(0, 5);

  return {
    completedLessons,
    inProgressCount: inProgressIds.size,
    inProgressLessonIds: [...inProgressIds],
    totalLessons: lessons.length,
    percentage: lessons.length
      ? Math.round((completedLessons / lessons.length) * 100)
      : 0,
    completedLessonIds: [...completionByLesson.keys()],
    inProgressLessons: [...inProgressIds].map(id => lessonsById.get(id)),
    nextLesson,
    lastAccessedLesson: lessonsById.get(String(progress?.lastAccessedLesson)) || null,
    lastAccessedAt: progress?.lastAccessedAt || null,
    recentActivity: recentActivity.slice(0, 5),
    latestQuizResults,
    reviewSuggestions,
    achievements: progress?.achievements || [],
    lastLessonCompletedAt: [...completionByLesson.values()]
      .sort((left, right) => new Date(right.completedAt) - new Date(left.completedAt))[0]?.completedAt || null,
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const progress = await getProgress(req.user._id);
    return res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('Get progress error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve learning progress'
    });
  }
});

router.post('/access-lesson', auth, async (req, res) => {
  try {
    const { lessonId } = req.body;
    if (!mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid lessonId is required',
      });
    }

    const lesson = await Lesson.findOne({
      _id: lessonId,
      published: true,
    }).select('_id');
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Published lesson not found',
      });
    }

    const alreadyCompleted = await LessonCompletion.findOne({
      user: req.user._id,
      lesson: lesson._id,
    }).select('_id');
    const existingProgress = await Progress.findOne({
      user: req.user._id,
    }).select('inProgressLessons');
    const alreadyInProgress = existingProgress?.inProgressLessons
      ?.some(id => String(id) === String(lesson._id));
    const activity = alreadyCompleted || alreadyInProgress ? 'resumed' : 'started';
    const now = new Date();
    const update = {
      $set: {
        lastAccessedLesson: lesson._id,
        lastAccessedAt: now,
      },
      $push: {
        recentLessonActivity: {
          $each: [{
            lesson: lesson._id,
            activity,
            occurredAt: now,
          }],
          $sort: { occurredAt: -1 },
          $slice: 20,
        },
      },
    };
    if (alreadyCompleted) {
      update.$pull = { inProgressLessons: lesson._id };
    } else {
      update.$addToSet = { inProgressLessons: lesson._id };
    }
    await Progress.findOneAndUpdate(
      { user: req.user._id },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: activity === 'resumed' ? 'Lesson progress resumed' : 'Lesson progress started',
      progress: await getProgress(req.user._id),
    });
  } catch (error) {
    console.error('Record lesson access error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to record lesson activity',
    });
  }
});

router.patch('/complete-lesson', auth, async (req, res) => {
  try {
    const { lessonId } = req.body;

    if (!mongoose.isValidObjectId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid lessonId is required',
      });
    }

    const lesson = await Lesson.findOne({
      _id: lessonId,
      published: true,
    }).select('_id');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Published lesson not found',
      });
    }

    let created = true;

    try {
      await LessonCompletion.create({
        user: req.user._id,
        lesson: lesson._id,
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
      created = false;
    }

    const snapshot = await getProgress(req.user._id);
    const update = {
      $set: {
        completedLessons: snapshot.completedLessons,
        totalLessons: Math.max(snapshot.totalLessons, 1),
      },
    };

    if (created) {
      update.$set.lastLessonCompletedAt = new Date();
      update.$pull = { inProgressLessons: lesson._id };
      update.$push = {
        recentLessonActivity: {
          $each: [{
            lesson: lesson._id,
            activity: 'completed',
            occurredAt: new Date(),
          }],
          $sort: { occurredAt: -1 },
          $slice: 20,
        },
      };
    }
    if (
      snapshot.totalLessons > 0 &&
      snapshot.completedLessons === snapshot.totalLessons
    ) {
      update.$addToSet = { achievements: 'ISL Learning Path Completed' };
    }

    await Progress.findOneAndUpdate(
      { user: req.user._id },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created
        ? 'Lesson completed successfully'
        : 'Lesson was already completed',
      progress: await getProgress(req.user._id),
    });
  } catch (error) {
    console.error('Complete lesson error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to complete lesson'
    });
  }
});

module.exports = router;