const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const Progress = require('../models/Progress');

// GET USER'S LEARNING PROGRESS
router.get('/', auth, async (req, res) => {
  try {
    let progress = await Progress.findOne({
      user: req.user._id
    });

    // Create initial progress if it doesn't exist
    if (!progress) {
      progress = await Progress.create({
        user: req.user._id
      });
    }

    const percentage = Math.round(
      (progress.completedLessons / progress.totalLessons) * 100
    );

    res.status(200).json({
      success: true,
      progress: {
        completedLessons: progress.completedLessons,
        totalLessons: progress.totalLessons,
        percentage,
        achievements: progress.achievements,
        lastLessonCompletedAt: progress.lastLessonCompletedAt
      }
    });
  } catch (error) {
    console.error('Get progress error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve learning progress'
    });
  }
});

// COMPLETE A LESSON
router.patch('/complete-lesson', auth, async (req, res) => {
  try {
    let progress = await Progress.findOne({
      user: req.user._id
    });

    if (!progress) {
      progress = await Progress.create({
        user: req.user._id
      });
    }

    if (progress.completedLessons >= progress.totalLessons) {
      return res.status(400).json({
        success: false,
        message: 'All lessons have already been completed'
      });
    }

    progress.completedLessons += 1;
    progress.lastLessonCompletedAt = new Date();

    // Add achievement when all lessons are completed
    if (progress.completedLessons === progress.totalLessons) {
      progress.achievements.push('ISL Learning Path Completed');
    }

    await progress.save();

    const percentage = Math.round(
      (progress.completedLessons / progress.totalLessons) * 100
    );

    res.status(200).json({
      success: true,
      message: 'Lesson completed successfully',
      progress: {
        completedLessons: progress.completedLessons,
        totalLessons: progress.totalLessons,
        percentage,
        achievements: progress.achievements,
        lastLessonCompletedAt: progress.lastLessonCompletedAt
      }
    });
  } catch (error) {
    console.error('Complete lesson error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to complete lesson'
    });
  }
});

module.exports = router;