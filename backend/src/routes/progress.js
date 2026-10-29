const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const auth = require('../middleware/auth');
const Lesson = require('../models/Lesson');
const LessonCompletion = require('../models/LessonCompletion');
const Progress = require('../models/Progress');

async function getProgress(userId) {
  const [completions, totalLessons, progress] = await Promise.all([
    LessonCompletion.find({ user: userId })
      .select('lesson completedAt')
      .sort({ completedAt: -1 })
      .populate({ path: 'lesson', match: { published: true }, select: '_id' })
      .lean(),
    Lesson.countDocuments({ published: true }),
    Progress.findOne({ user: userId }).lean(),
  ]);
  const publishedCompletions = completions.filter(completion => completion.lesson);
  const completedLessons = publishedCompletions.length;

  return {
    completedLessons,
    totalLessons,
    percentage: totalLessons
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0,
    completedLessonIds: publishedCompletions.map(completion => completion.lesson._id),
    achievements: progress?.achievements || [],
    lastLessonCompletedAt: publishedCompletions[0]?.completedAt || null,
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