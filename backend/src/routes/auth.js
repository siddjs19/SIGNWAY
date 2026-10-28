const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Name must contain 2 to 80 characters'
      });
    }

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address'
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters'
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET is not configured'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        consent: user.consent
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    console.error('Registration error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET is not configured'
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select('+passwordHash');

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        consent: user.consent
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

module.exports = router;