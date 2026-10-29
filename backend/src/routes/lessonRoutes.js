const express = require('express');
const mongoose = require('mongoose');
const Lesson = require('../models/Lesson');

const router = express.Router();

// List published lessons
router.get('/', async (req, res) => {
  try {
    const lessons = await Lesson.find({ published: true })
      .select('slug title description level category moduleTitle moduleOrder order prerequisites learningObjectives contentReviewStatus')
      .sort({ moduleOrder: 1, order: 1 });

    res.json({ success: true, data: lessons });
  } catch (error) {
    console.error('List lessons error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Could not load lessons',
    });
  }
});

// Get one lesson
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid lesson ID',
    });
  }

  try {
    const lesson = await Lesson.findOne({
      _id: req.params.id,
      published: true,
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    res.json({ success: true, data: lesson });
  } catch (error) {
    console.error('Get lesson error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Could not load lesson',
    });
  }
});

module.exports = router;