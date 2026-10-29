const express = require('express');
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// List published quizzes for a lesson without exposing answer keys.
router.get('/', async (req, res) => {
  try {
    const filter = { published: true };

    if (req.query.lessonId !== undefined) {
      if (!mongoose.isValidObjectId(req.query.lessonId)) {
        return res.status(400).json({ message: 'Invalid lesson ID' });
      }

      filter.lesson = req.query.lessonId;
    }

    const quizzes = await Quiz.find(filter)
      .select('title lesson')
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ success: true, data: quizzes });
  } catch (error) {
    console.error('List quizzes error:', error.message);
    return res.status(500).json({ message: 'Could not load quizzes' });
  }
});

// Fetch quiz questions without answer keys
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

    res.json({
      success: true,
      data: {
        _id: quiz._id,
        title: quiz.title,
        lesson: quiz.lesson,
        questions: quiz.questions.map(q => ({
          _id: q._id,
          prompt: q.prompt,
          mediaUrl: q.mediaUrl,
          options: q.options,
        })),
      },
    });
  } catch (error) {
    console.error('Load quiz error:', error.message);
    res.status(500).json({ message: 'Could not load quiz' });
  }
});

// Submit answers
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

    const submitted = req.body.answers;

    if (!Array.isArray(submitted)) {
      return res.status(400).json({ message: 'Answers must be an array' });
    }

    const questionIds = quiz.questions.map(q => String(q._id));

    if (
      submitted.length !== questionIds.length ||
      submitted.some(a => !a || !questionIds.includes(String(a.questionId))) ||
      new Set(submitted.map(a => String(a.questionId))).size !== questionIds.length
    ) {
      return res.status(400).json({
        message: 'Submit exactly one answer for every question',
      });
    }

    if (submitted.some(answer => {
      const question = quiz.questions.find(
        item => String(item._id) === String(answer.questionId)
      );
      return typeof answer.selectedAnswer !== 'string' ||
        !question.options.includes(answer.selectedAnswer);
    })) {
      return res.status(400).json({
        message: 'Each answer must select one of the question options',
      });
    }

    const answers = quiz.questions.map(question => {
      const response = submitted.find(
        a => String(a.questionId) === String(question._id)
      );

      const isCorrect = response.selectedAnswer === question.correctAnswer;

      return {
        questionId: question._id,
        selectedAnswer: response.selectedAnswer,
        isCorrect,
      };
    });

    const total = quiz.questions.length;
    const correct = answers.filter(a => a.isCorrect).length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= quiz.passingScore;

    const attempt = await QuizAttempt.create({
      user: req.user._id,
      quiz: quiz._id,
      score,
      total,
      answers,
      passed,
    });

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        score,
        total,
        passed,
        answers: answers.map(a => ({
          questionId: a.questionId,
          selectedAnswer: a.selectedAnswer,
          isCorrect: a.isCorrect,
        })),
        // Add explanations from the quiz questions here if desired.
      },
    });
  } catch (error) {
    console.error('Submit quiz error:', error.message);
    res.status(500).json({ message: 'Could not submit quiz' });
  }
});

module.exports = router;