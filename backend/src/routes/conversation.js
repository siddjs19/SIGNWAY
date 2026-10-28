const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { generateTutorReply } = require('../services/gemini');

// CREATE A NEW CONVERSATION
router.post('/', auth, async (req, res) => {
  try {
    const { title, topic, language } = req.body;

    const allowedTopics = [
      'daily-life',
      'education',
      'shopping',
      'travel',
      'healthcare',
      'general'
    ];

    const allowedLanguages = ['en', 'hi', 'mr'];

    if (
      title !== undefined &&
      (typeof title !== 'string' ||
        title.trim().length === 0 ||
        title.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title must contain 1 to 100 characters'
      });
    }

    if (topic !== undefined && !allowedTopics.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation topic'
      });
    }

    if (
      language !== undefined &&
      !allowedLanguages.includes(language)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Language must be en, hi, or mr'
      });
    }

    const conversation = await Conversation.create({
      user: req.user._id,
      ...(title !== undefined && { title: title.trim() }),
      ...(topic !== undefined && { topic }),
      ...(language !== undefined && { language })
    });

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      conversation
    });
  } catch (error) {
    console.error('Create conversation error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to create conversation'
    });
  }
});

// GET ALL CONVERSATIONS OF THE LOGGED-IN USER
router.get('/', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      user: req.user._id
    }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversations'
    });
  }
});

// GET ONE CONVERSATION AND ITS MESSAGES
router.get('/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const messages = await Message.find({
      conversation: conversation._id
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      conversation,
      messages
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID'
      });
    }

    console.error('Get conversation error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation'
    });
  }
});

// SEND A MESSAGE IN A CONVERSATION
// SEND MESSAGE AND GENERATE AI REPLY
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (
      typeof content !== 'string' ||
      !content.trim() ||
      content.trim().length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Message must contain 1 to 5000 characters'
      });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Save the user's message first
    const userMessage = await Message.create({
      conversation: conversation._id,
      sender: 'user',
      content: content.trim(),
      type: 'text'
    });

    // Load recent history, excluding the message just saved
    const historyMessages = await Message.find({
      conversation: conversation._id,
      _id: { $ne: userMessage._id }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    historyMessages.reverse();

    const history = historyMessages.map((item) => ({
      sender: item.sender,
      content: item.content
    }));

    // Ask Gemini to generate the tutor's reply
    let reply;

    try {
      reply = await generateTutorReply(content.trim(), history);
    } catch (error) {
      console.error('Gemini API error:', error.message);

      return res.status(502).json({
        success: false,
        message: 'Your message was saved, but the AI could not respond. Please try again.'
      });
    }

    // Save the AI response
    const assistantMessage = await Message.create({
      conversation: conversation._id,
      sender: 'assistant',
      content: reply,
      type: 'text'
    });

    conversation.updatedAt = new Date();
    await conversation.save();

    return res.status(201).json({
      success: true,
      message: 'AI response generated successfully',
      data: {
        userMessage,
        assistantMessage
      }
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID'
      });
    }

    console.error('Send message error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to process your message'
    });
  }
});

// GET MESSAGES FROM A CONVERSATION
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const messages = await Message.find({
      conversation: conversation._id
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID'
      });
    }

    console.error('Get messages error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages'
    });
  }
});


module.exports = router;